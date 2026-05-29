import { NextResponse, type NextRequest } from "next/server"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"
import { requireUser } from "@/lib/auth"
import { formatVenezuelaDate } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }
    const { user } = auth

    if (!user.activeHousehold) {
      return NextResponse.json({ error: "No se encontró el hogar activo" }, { status: 404 })
    }

    const db = await getDatabase()
    const tasksCol = db.collection("tasks")
    const usersCol = db.collection("users")

    const tasks = await tasksCol.find({ householdId: user.activeHousehold }).sort({ createdAt: -1 }).toArray()

    const tasksWithUsers = await Promise.all(
      tasks.map(async (task) => {
        let assignedToUser = null
        if (task.assignedTo && ObjectId.isValid(task.assignedTo)) {
          assignedToUser = await usersCol.findOne(
            { _id: new ObjectId(task.assignedTo) },
            { projection: { name: 1, email: 1, profileImage: 1 } },
          )
        }
        const createdBy = await usersCol.findOne({ _id: task.createdBy }, { projection: { name: 1, email: 1 } })
        return { ...task, assignedTo: assignedToUser || task.assignedTo, createdBy }
      }),
    )

    return NextResponse.json({ tasks: tasksWithUsers })
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // El POST también requiere autenticación para registrar quién crea la tarea.
    // Antes faltaba este guard, permitiendo crear tareas sin sesión válida.
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { user } = auth

    const body = await request.json()
    const { title, description, priority, category, dueDate, assignedTo, householdId } = body

    if (!title || !description || !priority || !category || !dueDate || !householdId) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    if (!ObjectId.isValid(householdId)) {
      return NextResponse.json({ error: "householdId inválido" }, { status: 400 })
    }

    const db = await getDatabase()
    const tasksCol = db.collection("tasks")
    const householdsCol = db.collection("households")
    const notificationsCol = db.collection("notifications")

    const household = await householdsCol.findOne({ _id: new ObjectId(householdId) })
    if (!household) {
      return NextResponse.json({ error: "Hogar no encontrado" }, { status: 404 })
    }

    const newTask = {
      title: title.trim(),
      description: description.trim(),
      status: "pending",
      priority,
      category,
      dueDate: formatVenezuelaDate(dueDate),
      assignedTo: assignedTo?.trim() || "",
      // createdBy proviene del token autenticado, no de household.members[0],
      // que era una asignación arbitraria y no reflejaba al usuario real.
      createdBy: user._id,
      householdId: new ObjectId(householdId),
      createdAt: formatVenezuelaDate(new Date()),
      updatedAt: formatVenezuelaDate(new Date()),
    }

    // Get assigned user's name if assignedTo is provided and valid
    let assignedUserName = ""
    if (assignedTo && ObjectId.isValid(assignedTo)) {
      const usersCol = db.collection("users")
      const assignedUser = await usersCol.findOne(
        { _id: new ObjectId(assignedTo) },
        { projection: { name: 1 } }
      )
      assignedUserName = assignedUser?.name || ""
    }

    // Insert the task
    const result = await tasksCol.insertOne(newTask)
    const createdTask = await tasksCol.findOne({ _id: result.insertedId })

   // Create notification only for the assigned user
    if (assignedTo && ObjectId.isValid(assignedTo)) {
      const usersCol = db.collection("users")
      const assignedUser = await usersCol.findOne(
        { _id: new ObjectId(assignedTo) },
        { projection: { name: 1 } }
      )
      
      if (assignedUser) {
        await notificationsCol.insertOne({
          userId: new ObjectId(assignedTo),
          householdId: new ObjectId(householdId),
          type: "task_assigned",
          title: "📋 Nueva Tarea Asignada",
          message: `Se te ha asignado la tarea: "${title.trim()}"`,
          data: {
            taskId: result.insertedId,
            priority: priority || "low",
            dueDate: dueDate ? formatVenezuelaDate(dueDate) : null,
            assignedTo: assignedUser.name,
            taskTitle: title.trim(),
          },
          read: false,
          createdAt: formatVenezuelaDate(new Date()),
        })
      }
    }

    return NextResponse.json(
      {
        message: "Tarea creada exitosamente",
        task: createdTask,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

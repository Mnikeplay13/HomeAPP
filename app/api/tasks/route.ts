import { NextResponse, type NextRequest } from "next/server"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"
import { requireUser } from "@/lib/auth"

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
    const body = await request.json()
    const { title, description, priority, category, dueDate, assignedTo, householdId } = body

    // Validate required fields
    if (!title || !description || !priority || !category || !dueDate || !householdId) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const db = await getDatabase()
    const tasksCol = db.collection("tasks")
    const householdsCol = db.collection("households")
    const notificationsCol = db.collection("notifications")

    // Verify household exists
    const household = await householdsCol.findOne({ _id: new ObjectId(householdId) })
    if (!household) {
      return NextResponse.json({ error: "Hogar no encontrado" }, { status: 404 })
    }

    // Create new task object following the same pattern as menu/products
    const newTask = {
      title: title.trim(),
      description: description.trim(),
      status: "pending",
      priority,
      category,
      dueDate: new Date(dueDate),
      assignedTo: assignedTo?.trim() || "", // Store as string (name) or empty
      createdBy: new ObjectId(household.members[0]), // Use first member as creator for now
      householdId: new ObjectId(householdId),
      createdAt: new Date(),
      updatedAt: new Date(),
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

   // Create notifications for all household members
    if (household.members && household.members.length > 0) {
      const validMembers = household.members.filter((memberId: ObjectId) => ObjectId.isValid(memberId))
      const notificationPromises = validMembers.map((memberId: ObjectId) =>
        notificationsCol.insertOne({
          userId: memberId,
          householdId: new ObjectId(householdId),
          type: "task_assigned",
          title: "Nueva tarea creada, asignada a " + (assignedUserName || "nadie"),
          data: {
            taskId: result.insertedId,
            priority: priority || "low",
            dueDate: dueDate ? new Date(dueDate) : null,
            assignedTo: assignedUserName, // Aquí agregas el nombre del asignado
            taskTitle: title.trim(),
          },
          read: false,
          createdAt: new Date(),
        }),
      )
      await Promise.all(notificationPromises)
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

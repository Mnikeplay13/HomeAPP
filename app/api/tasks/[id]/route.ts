import { type NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"

async function getTasksCollection() {
  const db = await getDatabase()
  return db.collection("tasks")
}

async function getUsersCollection() {
  const db = await getDatabase()
  return db.collection("users")
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }
    const { user } = auth

    const tasksCol = await getTasksCollection()
    const usersCol = await getUsersCollection()

    const task = await tasksCol.findOne({
      _id: new ObjectId(params.id),
      householdId: user.activeHousehold,
    })

    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 })
    }

    const assignedTo = await usersCol.findOne(
      { _id: task.assignedTo },
      { projection: { name: 1, email: 1, profileImage: 1 } },
    )

    const createdBy = await usersCol.findOne({ _id: task.createdBy }, { projection: { name: 1, email: 1 } })

    return NextResponse.json({ ...task, assignedTo, createdBy })
  } catch (error) {
    console.error("Error fetching task:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }
    const { user } = auth
    const { name, householdId, assignedTo, dueDate, category, description } = await request.json()

    if (!user.activeHousehold) {
      return NextResponse.json({ error: "Usuario o hogar no encontrado" }, { status: 404 })
    }

    const db = await getDatabase()
    const householdsCol = db.collection("households")
    const householdExists = await householdsCol.findOne({ _id: user.activeHousehold })

    if (!householdExists) {
      return NextResponse.json({ error: "Hogar no encontrado" }, { status: 404 })
    }

    const tasksCol = await getTasksCollection()
    const now = new Date()

    const insertRes = await tasksCol.insertOne({
      name,
      description,
      householdId: user.activeHousehold,
      createdBy: user._id,
      assignedTo: assignedTo ? new ObjectId(assignedTo) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      category,
      status: "to-do",
      createdAt: now,
      updatedAt: now,
    })

    const newTask = await tasksCol.findOne({ _id: insertRes.insertedId })
    return NextResponse.json({ task: newTask }, { status: 201 })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }
    const { user } = auth
    const { id } = await params
    const body = await request.json()
    const { status, title, description, priority, dueDate, assignedTo, category } = body

    const db = await getDatabase()
    const tasksCol = await getTasksCollection()
    const usersCol = await getUsersCollection()
    const householdsCol = db.collection("households")

    const task = await tasksCol.findOne({
      _id: new ObjectId(id),
      householdId: user.activeHousehold,
    })
    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 })
    }

    const household = await householdsCol.findOne({ _id: user.activeHousehold })
    if (!household) {
      return NextResponse.json({ error: "Hogar no encontrado" }, { status: 404 })
    }

    const moderators = household.moderators ?? []
    const isOwner = household.ownerId.toString() === user._id.toString()
    const isModerator = moderators.some((m: { toString: () => string }) => m.toString() === user._id.toString())
    const canEditTask = isOwner || isModerator

    const now = new Date()
    const update: Record<string, unknown> = { updatedAt: now }

    if (status !== undefined) {
      update.status = status
    }
    if (canEditTask) {
      if (title !== undefined) update.title = title.trim()
      if (description !== undefined) update.description = description.trim()
      if (priority !== undefined) update.priority = priority
      if (category !== undefined) update.category = category
      if (dueDate !== undefined) update.dueDate = new Date(dueDate)
      if (assignedTo !== undefined) update.assignedTo = assignedTo?.trim() || ""
    }

    const updateRes = await tasksCol.findOneAndUpdate(
      { _id: new ObjectId(id), householdId: user.activeHousehold },
      { $set: update },
      { returnDocument: "after" },
    )
    const updatedTask = (updateRes as { value?: typeof task })?.value ?? updateRes

    if (!updatedTask) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 })
    }

    let assignedToUser = null
    if (updatedTask.assignedTo && ObjectId.isValid(updatedTask.assignedTo)) {
      assignedToUser = await usersCol.findOne(
        { _id: new ObjectId(updatedTask.assignedTo) },
        { projection: { name: 1, email: 1, profileImage: 1 } },
      )
    }
    const createdBy = await usersCol.findOne(
      { _id: updatedTask.createdBy },
      { projection: { name: 1, email: 1 } },
    )

    return NextResponse.json({
      task: {
        ...updatedTask,
        assignedTo: assignedToUser || updatedTask.assignedTo,
        createdBy,
      },
    })
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }
    const { user } = auth

    const tasksCol = await getTasksCollection()

    const result = await tasksCol.deleteOne({
      _id: new ObjectId(params.id),
      householdId: user.activeHousehold,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ message: "Tarea eliminada correctamente" })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
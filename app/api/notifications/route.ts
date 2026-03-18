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
    const db = await getDatabase()
    const usersCol = db.collection("users")
    const notificationsCol = db.collection("notifications")

    const userDoc = await usersCol.findOne({ _id: new ObjectId(user._id) })
    if (!userDoc || !userDoc.activeHousehold) {
      return NextResponse.json({ message: "Usuario o hogar no encontrado" }, { status: 404 })
    }

    // Obtener notificaciones que no han sido mostradas o que son nuevas
    const notifications = await notificationsCol
      .find({
        userId: new ObjectId(user._id),
        householdId: userDoc.activeHousehold,
        $or: [
          { shownOnce: { $ne: true } }, // No mostradas aún
          { createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // O de las últimas 24h
        ]
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()

    // Marcar estas notificaciones como mostradas una vez
    if (notifications.length > 0) {
      const notificationIds = notifications.map(n => n._id)
      await notificationsCol.updateMany(
        { _id: { $in: notificationIds } },
        { $set: { shownOnce: true } }
      )
    }

    const unreadCount = await notificationsCol.countDocuments({
      userId: new ObjectId(user._id),
      householdId: userDoc.activeHousehold,
      read: false,
    })

    return NextResponse.json({ notifications, unreadCount }, { status: 200 })
  } catch (error) {
    console.error("GET /api/notifications error:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }

    const { user } = auth
    const { notificationIds } = await request.json()
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ message: "Lista de IDs inválida" }, { status: 400 })
    }

    const db = await getDatabase()
    const notificationsCol = db.collection("notifications")

    await notificationsCol.updateMany(
      {
        _id: { $in: notificationIds.map((id: string) => new ObjectId(id)) },
        userId: new ObjectId(user._id),
      },
      { $set: { read: true } }
    )

    return NextResponse.json({ message: "Notificaciones marcadas como leídas" }, { status: 200 })
  } catch (error) {
    console.error("PATCH /api/notifications error:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

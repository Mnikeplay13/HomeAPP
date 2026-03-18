import { NextResponse, type NextRequest } from "next/server"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"
import { requireUser } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }
    const { user } = auth
    const { inviteCode } = (await req.json()) as { inviteCode?: string }

    if (!inviteCode || inviteCode.trim().length < 4) {
      return NextResponse.json({ message: "Código inválido" }, { status: 400 })
    }

    const db = await getDatabase()
    const householdsCol = db.collection("households")
    const usersCol = db.collection("users")

    const household = await householdsCol.findOne({ inviteCode: inviteCode.trim().toUpperCase() })
    if (!household) {
      return NextResponse.json({ message: "Grupo no encontrado" }, { status: 404 })
    }

    const now = new Date()
    // Add user to household.members
    await householdsCol.updateOne(
      { _id: household._id },
      { $addToSet: { members: new ObjectId(user._id) }, $set: { updatedAt: now } },
    )

    // Add household to user's memberships and set as active
    await usersCol.updateOne(
      { _id: new ObjectId(user._id) },
      {
        $addToSet: { households: household._id },
        $set: { activeHousehold: household._id, updatedAt: now },
      },
    )

    const updated = await householdsCol.findOne(
      { _id: household._id },
      { projection: { name: 1, imageUrl: 1, inviteCode: 1 } },
    )

    // Enviar notificación a todos los miembros del hogar
    const notificationsCol = db.collection("notifications")
    const notificationPromises = household.members.map(async (memberId: ObjectId) => {
      await notificationsCol.insertOne({
        userId: memberId,
        householdId: household._id,
        title: '🏠 Nuevo Miembro en el Hogar',
        body: `${user.name} se ha unido a tu hogar "${household.name}"`,
        type: 'household-join',
        read: false,
        createdAt: new Date()
      })
    })

    // Esperar a que todas las notificaciones se inserten
    await Promise.all(notificationPromises)

    return NextResponse.json({ household: updated }, { status: 200 })
  } catch (e) {
    console.error("POST /api/households/join error:", e)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

import { NextResponse, type NextRequest } from "next/server"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"
import { requireUser } from "@/lib/auth"
import { getUsersCollection } from "@/lib/models/User"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }
    const { user } = auth
    const { id } = await params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 })
    }

    const db = await getDatabase()
    const householdsCol = db.collection("households")
    const usersCol = await getUsersCollection()

    const household = await householdsCol.findOne(
      { _id: new ObjectId(id) },
      { projection: { name: 1, imageUrl: 1, inviteCode: 1, members: 1, ownerId: 1, moderators: 1 } }
    )
    if (!household) {
      return NextResponse.json({ message: "Grupo no encontrado" }, { status: 404 })
    }

    const isMember = (household.members as ObjectId[]).some((m) => m.toString() === user._id.toString())
    if (!isMember) {
      return NextResponse.json({ message: "No eres miembro de este grupo" }, { status: 403 })
    }

    const memberDetails = await usersCol
      .find({ _id: { $in: household.members } })
      .project({ name: 1, email: 1 })
      .toArray()

    const moderators = household.moderators ?? []
    const isOwner = household.ownerId.toString() === user._id.toString()
    const isModerator = moderators.some((m: ObjectId) => m.toString() === user._id.toString())
    const currentUserRole = isOwner ? "owner" : isModerator ? "moderator" : "member"

    return NextResponse.json({
      household: {
        ...household,
        members: memberDetails,
        membersCount: memberDetails.length,
        currentUserRole,
      },
    })
  } catch (e) {
    console.error("GET /api/households/[id] error:", e)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }
    const { user } = auth
    const { id } = await params
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 })
    }

    const db = await getDatabase()
    const householdsCol = db.collection("households")
    const households = await householdsCol.findOne({ _id: new ObjectId(id) })
    if (!households) {
      return NextResponse.json({ message: "Grupo no encontrado" }, { status: 404 })
    }

    // Only the owner can edit the group
    const isOwner = households.ownerId.toString() === user._id.toString()
    if (!isOwner) {
      return NextResponse.json({ message: "Solo el dueño del grupo puede editar la configuración" }, { status: 403 })
    }

    const { name, imageUrl } = (await req.json()) as { name?: string; imageUrl?: string }
    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (typeof name === "string" && name.trim().length >= 2) update.name = name.trim()
    if (typeof imageUrl === "string") update.imageUrl = imageUrl.trim() || undefined

    await householdsCol.updateOne({ _id: new ObjectId(id) }, { $set: update })

    const updated = await householdsCol.findOne(
      { _id: new ObjectId(id) },
      { projection: { name: 1, imageUrl: 1, inviteCode: 1 } },
    )
    return NextResponse.json({ household: updated })
  } catch (e) {
    console.error("PATCH /api/households/[id] error:", e)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

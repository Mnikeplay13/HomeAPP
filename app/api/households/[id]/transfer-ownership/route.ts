import { NextResponse, type NextRequest } from "next/server"
import { ObjectId } from "mongodb"
import { requireUser } from "@/lib/auth"
import { getHouseholdsCollection } from "@/lib/models/Household"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(req)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }
    const { user } = auth
    const { id } = await params
    const { newOwnerId } = (await req.json()) as { newOwnerId?: string }

    if (!ObjectId.isValid(id) || !newOwnerId || !ObjectId.isValid(newOwnerId)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 })
    }

    const householdId = new ObjectId(id)
    const newOwnerObjectId = new ObjectId(newOwnerId)

    const householdsCol = await getHouseholdsCollection()

    const household = await householdsCol.findOne({ _id: householdId })
    if (!household) {
      return NextResponse.json({ message: "Grupo no encontrado" }, { status: 404 })
    }

    const isOwner = household.ownerId.toString() === user._id.toString()
    if (!isOwner) {
      return NextResponse.json(
        { message: "Solo el dueño actual puede transferir la propiedad" },
        { status: 403 }
      )
    }

    if (household.ownerId.toString() === newOwnerId) {
      return NextResponse.json(
        { message: "El usuario ya es el dueño del grupo" },
        { status: 400 }
      )
    }

    const isMember = household.members.some((m: ObjectId) => m.toString() === newOwnerId)
    if (!isMember) {
      return NextResponse.json(
        { message: "El nuevo dueño debe ser miembro del grupo" },
        { status: 400 }
      )
    }

    const now = new Date()
    const oldOwnerId = household.ownerId

    await householdsCol.updateOne(
      { _id: householdId },
      {
        $set: {
          ownerId: newOwnerObjectId,
          updatedAt: now,
        },
        $pull: { moderators: { $in: [newOwnerObjectId, oldOwnerId] } },
      }
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("POST /api/households/[id]/transfer-ownership error:", e)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

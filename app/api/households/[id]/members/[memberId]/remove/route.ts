import { NextResponse, type NextRequest } from "next/server"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"
import { requireUser } from "@/lib/auth"
import { getHouseholdsCollection } from "@/lib/models/Household"
import { getUsersCollection } from "@/lib/models/User"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const auth = await requireUser(req)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }
    const { user } = auth
    const { id, memberId } = await params

    if (!ObjectId.isValid(id) || !ObjectId.isValid(memberId)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 })
    }

    const householdId = new ObjectId(id)
    const targetUserId = new ObjectId(memberId)

    const householdsCol = await getHouseholdsCollection()
    const usersCol = await getUsersCollection()

    const household = await householdsCol.findOne({ _id: householdId })
    if (!household) {
      return NextResponse.json({ message: "Grupo no encontrado" }, { status: 404 })
    }

    const moderators = household.moderators ?? []
    const isOwner = household.ownerId.toString() === user._id.toString()
    const isModerator = moderators.some((m: ObjectId) => m.toString() === user._id.toString())

    if (!isOwner && !isModerator) {
      return NextResponse.json(
        { message: "Solo el dueño o moderadores pueden expulsar miembros" },
        { status: 403 }
      )
    }

    if (household.ownerId.toString() === memberId) {
      return NextResponse.json(
        { message: "No se puede expulsar al dueño del grupo" },
        { status: 403 }
      )
    }

    const isMember = household.members.some((m: ObjectId) => m.toString() === memberId)
    if (!isMember) {
      return NextResponse.json({ message: "El usuario no es miembro de este grupo" }, { status: 400 })
    }

    const now = new Date()
    const targetUser = await usersCol.findOne({ _id: targetUserId })

    await householdsCol.updateOne(
      { _id: householdId },
      {
        $pull: { members: targetUserId, moderators: targetUserId },
        $set: { updatedAt: now },
      }
    )

    const otherHouseholds = (targetUser?.households ?? []).filter(
      (h: ObjectId) => h.toString() !== householdId.toString()
    )
    const newActive =
      targetUser?.activeHousehold?.toString() === id
        ? (otherHouseholds.length > 0 ? otherHouseholds[0] : null)
        : undefined

    await usersCol.updateOne(
      { _id: targetUserId },
      {
        $pull: { households: householdId },
        $set: {
          updatedAt: now,
          ...(newActive !== undefined && { activeHousehold: newActive }),
        },
      }
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("POST /api/households/[id]/members/[memberId]/remove error:", e)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

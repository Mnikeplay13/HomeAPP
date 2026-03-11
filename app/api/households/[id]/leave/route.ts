import { NextResponse, type NextRequest } from "next/server"
import { ObjectId } from "mongodb"
import { requireUser } from "@/lib/auth"
import { getHouseholdsCollection } from "@/lib/models/Household"
import { getUsersCollection } from "@/lib/models/User"

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

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 })
    }

    const householdId = new ObjectId(id)

    const householdsCol = await getHouseholdsCollection()
    const usersCol = await getUsersCollection()

    const household = await householdsCol.findOne({ _id: householdId })
    if (!household) {
      return NextResponse.json({ message: "Grupo no encontrado" }, { status: 404 })
    }

    const isOwner = household.ownerId.toString() === user._id.toString()
    if (isOwner) {
      return NextResponse.json(
        { message: "El dueño debe transferir la propiedad antes de abandonar el grupo" },
        { status: 403 }
      )
    }

    const isMember = household.members.some((m: ObjectId) => m.toString() === user._id.toString())
    if (!isMember) {
      return NextResponse.json({ message: "No eres miembro de este grupo" }, { status: 400 })
    }

    const userId = new ObjectId(user._id)
    const now = new Date()

    const currentUser = await usersCol.findOne({ _id: userId })
    const otherHouseholds = (currentUser?.households ?? []).filter(
      (h: ObjectId) => h.toString() !== householdId.toString()
    )
    const newActive =
      currentUser?.activeHousehold?.toString() === id
        ? (otherHouseholds.length > 0 ? otherHouseholds[0] : null)
        : undefined

    await householdsCol.updateOne(
      { _id: householdId },
      {
        $pull: { members: userId, moderators: userId },
        $set: { updatedAt: now },
      }
    )

    await usersCol.updateOne(
      { _id: userId },
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
    console.error("POST /api/households/[id]/leave error:", e)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

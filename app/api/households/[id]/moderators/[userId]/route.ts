import { NextResponse, type NextRequest } from "next/server"
import { ObjectId } from "mongodb"
import { requireUser } from "@/lib/auth"
import { getHouseholdsCollection } from "@/lib/models/Household"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const auth = await requireUser(req)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }
    const { user } = auth
    const { id, userId } = await params

    if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 })
    }

    const householdId = new ObjectId(id)
    const targetUserId = new ObjectId(userId)

    const householdsCol = await getHouseholdsCollection()

    const household = await householdsCol.findOne({ _id: householdId })
    if (!household) {
      return NextResponse.json({ message: "Grupo no encontrado" }, { status: 404 })
    }

    const isOwner = household.ownerId.toString() === user._id.toString()
    if (!isOwner) {
      return NextResponse.json(
        { message: "Solo el dueño puede quitar moderadores" },
        { status: 403 }
      )
    }

    const now = new Date()
    await householdsCol.updateOne(
      { _id: householdId },
      {
        $pull: { moderators: targetUserId },
        $set: { updatedAt: now },
      }
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("DELETE /api/households/[id]/moderators/[userId] error:", e)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

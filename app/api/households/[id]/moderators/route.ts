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
    const { userId } = (await req.json()) as { userId?: string }

    if (!ObjectId.isValid(id) || !userId || !ObjectId.isValid(userId)) {
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
        { message: "Solo el dueño puede asignar moderadores" },
        { status: 403 }
      )
    }

    if (household.ownerId.toString() === userId) {
      return NextResponse.json(
        { message: "El dueño ya tiene todos los permisos" },
        { status: 400 }
      )
    }

    const isMember = household.members.some((m: ObjectId) => m.toString() === userId)
    if (!isMember) {
      return NextResponse.json(
        { message: "El usuario debe ser miembro del grupo para ser moderador" },
        { status: 400 }
      )
    }

    const now = new Date()
    await householdsCol.updateOne(
      { _id: householdId },
      {
        $addToSet: { moderators: targetUserId },
        $set: { updatedAt: now },
      }
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("POST /api/households/[id]/moderators error:", e)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

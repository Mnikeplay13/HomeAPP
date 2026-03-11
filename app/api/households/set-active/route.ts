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
    const { householdId } = (await req.json()) as { householdId?: string }

    if (!householdId || !ObjectId.isValid(householdId)) {
      return NextResponse.json({ message: "householdId inválido" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCol = db.collection("users")

    // Ensure user is a member
    const isMember = (user.households ?? []).some((id) => id.toString() === householdId)
    if (!isMember) {
      return NextResponse.json({ message: "No eres miembro de este grupo" }, { status: 403 })
    }

    await usersCol.updateOne(
      { _id: new ObjectId(user._id) },
      { $set: { activeHousehold: new ObjectId(householdId), updatedAt: new Date() } },
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("POST /api/households/set-active error:", e)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

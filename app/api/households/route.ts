import { NextResponse, type NextRequest } from "next/server"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"
import { requireUser } from "@/lib/auth"
import { generateInviteCode } from "@/lib/utils/invite"
import { getHouseholdsCollection } from "@/lib/models/Household"
import { getUsersCollection } from "@/lib/models/User"

// Utility: generate unique invite code like HOME-25-ABCD
async function generateUniqueInviteCode(): Promise<string> {
  const year = new Date().getFullYear() % 100
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  for (let attempt = 0; attempt < 20; attempt++) {
    let suffix = ""
    for (let i = 0; i < 4; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)]
    const code = `HOME-${String(year).padStart(2, "0")}-${suffix}`
    const householdsCol = await getHouseholdsCollection()
    // Reemplazado .select("_id").lean() con projection
    const exists = await householdsCol.findOne({ inviteCode: code }, { projection: { _id: 1 } })
    if (!exists) return code
  }
  throw new Error("No se pudo generar un código único. Intenta nuevamente.")
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }
    const { user } = auth
    const householdsCol = await getHouseholdsCollection()
    const usersCol = await getUsersCollection()

    const households = user.households.length
      ? await householdsCol
          .find({ _id: { $in: user.households } })
          .project({ name: 1, imageUrl: 1, inviteCode: 1, members: 1, ownerId: 1, moderators: 1 })
          .toArray()
      : []

    const populatedHouseholds = await Promise.all(
      households.map(async (household) => {
        const memberDetails = await usersCol
          .find({ _id: { $in: household.members } })
          .project({ name: 1, email: 1, profileImage: 1 }) // Ensure profileImage is included
          .toArray()

        const moderators = household.moderators ?? []
        const isOwner = household.ownerId.toString() === user._id.toString()
        const isModerator = moderators.some((m: ObjectId) => m.toString() === user._id.toString())
        const currentUserRole = isOwner ? "owner" : isModerator ? "moderator" : "member"

        return {
          ...household,
          ownerId: household.ownerId,
          moderators: moderators,
          members: memberDetails,
          membersCount: memberDetails.length,
          currentUserRole,
        }
      }),
    )

    return NextResponse.json({
      households: populatedHouseholds,
      activeHouseholdId: user.activeHousehold ?? null,
    })
  } catch (e) {
    console.error("GET /api/households error:", e)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }
    const { user } = auth
    const { name, imageUrl } = (await req.json()) as { name?: string; imageUrl?: string }

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ message: "Nombre del grupo es requerido" }, { status: 400 })
    }

    const householdsCol = await getHouseholdsCollection()
    const usersCol = await getUsersCollection()

    // La creación de índices se maneja por separado y no se debe llamar aquí.
    // await householdsCol.createIndex({ inviteCode: 1 }, { unique: true })

    // Generamos un código único usando la función que creamos.
    const inviteCode = await generateUniqueInviteCode()

    const now = new Date()
    const insertRes = await householdsCol.insertOne({
      name: name.trim(),
      imageUrl: imageUrl?.trim() || undefined,
      inviteCode,
      ownerId: new ObjectId(user._id),
      members: [new ObjectId(user._id)],
      createdAt: now,
      updatedAt: now,
    } as any) // Se ha añadido una aserción de tipo 'any' para evitar el error de TypeScript.

    const newId = insertRes.insertedId

    // Add membership and set active
    await usersCol.updateOne(
      // Se ha corregido aquí. user._id ya es un ObjectId.
      { _id: user._id },
      {
        $addToSet: { households: newId },
        $set: { activeHousehold: newId, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
    )

    const created = await householdsCol.findOne(
      { _id: newId },
      { projection: { name: 1, imageUrl: 1, inviteCode: 1 } },
    )
    return NextResponse.json({ household: created }, { status: 201 })
  } catch (e) {
    console.error("POST /api/households error:", e)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

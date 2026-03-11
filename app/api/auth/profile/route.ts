import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { name, profileImage } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    const updateData: any = { name: name.trim() }
    if (profileImage) {
      updateData.profileImage = profileImage
    }

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(decoded.userId) },
      { $set: updateData },
      { returnDocument: "after" },
    )

    if (!result) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = result
    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

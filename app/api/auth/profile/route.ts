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

    // Limitar tamaño de profileImage (base64 ~1.37× el tamaño real; 2MB → ~2.75MB en base64)
    // Evita que un cliente suba imágenes masivas directamente al documento de usuario.
    const MAX_IMAGE_LENGTH = 3 * 1024 * 1024 // 3 MB como string base64
    if (profileImage !== undefined && profileImage !== null) {
      if (typeof profileImage !== "string") {
        return NextResponse.json({ error: "profileImage debe ser un string" }, { status: 400 })
      }
      if (profileImage.length > MAX_IMAGE_LENGTH) {
        return NextResponse.json({ error: "La imagen supera el tamaño permitido (2 MB)" }, { status: 400 })
      }
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    const updateData: Record<string, unknown> = {
      name: name.trim(),
      updatedAt: new Date(),
    }
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

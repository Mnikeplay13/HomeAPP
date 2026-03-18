import { NextResponse, type NextRequest } from "next/server"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"
import { requireUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }

    const { user } = auth
    const db = await getDatabase()
    const usersCol = db.collection("users")
    const notificationsCol = db.collection("notifications")

    // Obtener el hogar activo del usuario
    const userDoc = await usersCol.findOne({ _id: new ObjectId(user._id) })
    if (!userDoc || !userDoc.activeHousehold) {
      return NextResponse.json({ message: "Usuario o hogar no encontrado" }, { status: 404 })
    }

    // Marcar todas las notificaciones del usuario como leídas
    const result = await notificationsCol.updateMany(
      {
        userId: new ObjectId(user._id),
        householdId: userDoc.activeHousehold,
      },
      { 
        $set: { read: true },
        $unset: { shownOnce: 1 } // Limpiar el flag de mostrado una vez
      }
    )

    return NextResponse.json({ 
      message: "Notificaciones limpiadas exitosamente",
      modifiedCount: result.modifiedCount
    }, { status: 200 })
  } catch (error) {
    console.error("POST /api/notifications/clear error:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

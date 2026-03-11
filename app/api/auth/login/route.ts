import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validar datos de entrada
    if (!email || !password) {
      return NextResponse.json({ message: "Email y contraseña son requeridos" }, { status: 400 })
    }

    // Conectar a la base de datos
    const db = await getDatabase()
    const usersCollection = db.collection("users")

    // Buscar el usuario
    const user = await usersCollection.findOne({ email })
    if (!user) {
      return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 })
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 })
    }

    // Crear JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    )

    // Remover la contraseña del objeto de respuesta
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      message: "Login exitoso",
      user: userWithoutPassword,
      token,
    })
  } catch (error) {
    console.error("Error en login:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

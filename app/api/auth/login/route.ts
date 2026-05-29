import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: "Email y contraseña son requeridos" }, { status: 400 })
    }

    // Normalizar email para que coincida con el índice creado durante el registro
    const normalizedEmail = String(email).toLowerCase().trim()

    // Fallar rápido si falta la variable de entorno en lugar de lanzar una excepción interna
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error("[AUTH] JWT_SECRET no está configurado")
      return NextResponse.json({ message: "Error de configuración del servidor" }, { status: 500 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    const user = await usersCollection.findOne({ email: normalizedEmail })
    if (!user) {
      return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 })
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 })
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      jwtSecret,
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

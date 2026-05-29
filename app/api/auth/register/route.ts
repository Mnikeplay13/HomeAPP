import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    // Validar presencia de campos
    if (!name || !email || !password) {
      return NextResponse.json({ message: "Todos los campos son requeridos" }, { status: 400 })
    }

    // Normalizar email para evitar duplicados case-sensitive ("User@X.com" vs "user@x.com")
    const normalizedEmail = String(email).toLowerCase().trim()

    // Validar formato de email con regex mínima antes de tocar la DB
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ message: "Formato de email inválido" }, { status: 400 })
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ message: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
    }

    // Sanitizar nombre: solo texto, sin tags HTML
    const sanitizedName = String(name).trim().replace(/<[^>]*>/g, "")
    if (!sanitizedName) {
      return NextResponse.json({ message: "El nombre no puede estar vacío" }, { status: 400 })
    }

    const db = await getDatabase()
    const usersCollection = db.collection("users")

    // Buscar usando el email normalizado para que el índice sea consistente
    const existingUser = await usersCollection.findOne({ email: normalizedEmail })
    if (existingUser) {
      return NextResponse.json({ message: "El usuario ya existe con este email" }, { status: 400 })
    }

    // Hashear la contraseña
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Crear nuevo usuario con valores normalizados
    const newUser = {
      name: sanitizedName,
      email: normalizedEmail,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await usersCollection.insertOne(newUser)

    // Obtener el usuario creado
    const createdUser = await usersCollection.findOne({ _id: result.insertedId })

    if (!createdUser) {
      return NextResponse.json({ message: "Error al crear el usuario" }, { status: 500 })
    }

    // Crear JWT token
    const token = jwt.sign(
      {
        userId: createdUser._id,
        email: createdUser.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    )

    // Remover la contraseña del objeto de respuesta
    const { password: _, ...userWithoutPassword } = createdUser

    return NextResponse.json({
      message: "Usuario creado exitosamente",
      user: userWithoutPassword,
      token,
    })
  } catch (error) {
    console.error("Error en registro:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

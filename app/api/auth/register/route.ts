import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    // Validar datos de entrada
    if (!name || !email || !password) {
      return NextResponse.json({ message: "Todos los campos son requeridos" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ message: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
    }

    // Conectar a la base de datos
    const db = await getDatabase()
    const usersCollection = db.collection("users")

    // Verificar si el usuario ya existe
    const existingUser = await usersCollection.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ message: "El usuario ya existe con este email" }, { status: 400 })
    }

    // Hashear la contraseña
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Crear nuevo usuario
    const newUser = {
      name,
      email,
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

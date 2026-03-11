import jwt from "jsonwebtoken"
import { headers } from "next/headers"
import User from "@/lib/models/User"
import { connectToDatabase } from "@/lib/mongodb"

type JwtPayload = {
  id: string
  email?: string
  iat?: number
  exp?: number
}

export async function requireAuthUser() {
  const hdrs = await headers()
  const auth = hdrs.get("authorization") || hdrs.get("Authorization")
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return { error: { status: 401, message: "No autorizado" } }
  }
  const token = auth.slice(7).trim()
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error("JWT_SECRET is not set")
      return { error: { status: 500, message: "Configuración inválida del servidor" } }
    }
    const decoded = jwt.verify(token, secret) as JwtPayload
    const userId = decoded.id
    if (!userId) {
      return { error: { status: 401, message: "Token inválido" } }
    }
    await connectToDatabase()
    const user = await User.findById(userId).lean()
    if (!user) {
      return { error: { status: 401, message: "Usuario no encontrado" } }
    }
    return { user }
  } catch (e) {
    return { error: { status: 401, message: "Token inválido" } }
  }
}

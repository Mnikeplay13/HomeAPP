import jwt from "jsonwebtoken"
import { headers } from "next/headers"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"

/**
 * El payload de los tokens emitidos por login/register usa el campo `userId`,
 * no `id`. Este tipo debe coincidir exactamente con lo que se firma en
 * app/api/auth/login/route.ts y app/api/auth/register/route.ts.
 */
type JwtPayload = {
  userId: string
  email?: string
  iat?: number
  exp?: number
}

/**
 * Verifica el Bearer token del encabezado Authorization y devuelve el usuario
 * autenticado desde la base de datos. No acepta `userId` del cuerpo de la
 * petición para evitar IDOR.
 */
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
      console.error("[AUTH] JWT_SECRET no está configurado")
      return { error: { status: 500, message: "Configuración inválida del servidor" } }
    }
    const decoded = jwt.verify(token, secret) as JwtPayload

    // Validar que el payload contenga el campo correcto antes de consultar la DB
    if (!decoded.userId || !ObjectId.isValid(decoded.userId)) {
      return { error: { status: 401, message: "Token inválido" } }
    }

    const db = await getDatabase()
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }, // nunca exponer el hash de contraseña
    )
    if (!user) {
      return { error: { status: 401, message: "Usuario no encontrado" } }
    }
    return { user }
  } catch {
    // jwt.verify lanza JsonWebTokenError / TokenExpiredError; los tratamos igual
    return { error: { status: 401, message: "Token inválido" } }
  }
}

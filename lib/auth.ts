import { cookies } from "next/headers"
import type { NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import { getDatabase } from "./mongodb"

type JwtPayload = {
  userId: string
  email: string
  iat?: number
  exp?: number
}

export async function getTokenFromHeaders(req?: NextRequest): Promise<string | null> {
  // Try Authorization header
  const authHeader = req?.headers.get("authorization")
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.split(" ")[1]
  }
  // Try cookie "token"
  try {
    const cookieStore = cookies()
    const token = (await cookieStore).get("token")?.value
    if (token) return token
  } catch {
    // no-op for environments without cookie access
  }
  return null
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    return payload
  } catch {
    return null
  }
}

export async function requireUser(req?: NextRequest) {
  const token = await getTokenFromHeaders(req)
  if (!token) {
    return { error: "No token provided", status: 401 } as const
  }
  const payload = verifyToken(token)
  if (!payload?.userId) {
    return { error: "Invalid token", status: 401 } as const
  }

  const db = await getDatabase()
  const users = db.collection("users")
  const user = await users.findOne({ _id: new ObjectId(payload.userId) })
  if (!user) {
    return { error: "User not found", status: 401 } as const
  }

  return {
    user: {
      _id: user._id as ObjectId,
      name: user.name ?? "",
      email: user.email,
      households: (user.households as ObjectId[] | undefined) ?? [],
      activeHousehold: (user.activeHousehold as ObjectId | null | undefined) ?? null,
      createdAt: user.createdAt ?? null,
    },
  } as const
}

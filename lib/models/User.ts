// lib/user-model.ts

import type { ObjectId, Db } from "mongodb"
import { getDatabase } from "../mongodb"

// We define the same interface to ensure type safety.
export interface UserDoc {
  _id: ObjectId
  name: string
  email: string
  password?: string
  households?: ObjectId[]
  activeHousehold?: ObjectId | null
  createdAt?: Date
  updatedAt?: Date
  profileImage?: string
}

/**
 * Validates a user document before insertion or update.
 * This replaces the validation provided by Mongoose schemas.
 * @param {any} user - The user object to validate.
 * @returns {string | null} An error message if validation fails, otherwise null.
 */
export function validateUser(user: any): string | null {
  if (!user.name || typeof user.name !== "string") {
    return "Name is required and must be a string."
  }
  if (!user.email || typeof user.email !== "string" || !user.email.includes("@")) {
    return "A valid email is required."
  }
  // We can add more validation here as needed, like password length.
  return null
}

/**
 * Gets the users collection from the database.
 * @returns {Promise<Collection<UserDoc>>} A promise that resolves to the users collection.
 */
export async function getUsersCollection() {
  const db: Db = await getDatabase()
  return db.collection<UserDoc>("users")
}

export const User = {
  validateUser,
  getUsersCollection,
}

export default User

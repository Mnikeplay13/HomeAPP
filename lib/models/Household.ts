import { ObjectId, type Collection, type Db } from "mongodb"
import { getDatabase } from "@/lib/mongodb"

// We define the same interface to ensure type safety.
export interface HouseholdDoc {
  _id: ObjectId
  name: string
  imageUrl?: string
  inviteCode: string // unique PIN/code to join
  ownerId: ObjectId
  moderators?: ObjectId[]
  members: ObjectId[]
  tasks?: ObjectId[]
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Validates a household document before insertion or update.
 * @param {any} household - The household object to validate.
 * @returns {string | null} An error message if validation fails, otherwise null.
 */
export function validateHousehold(household: any): string | null {
  if (!household.name || typeof household.name !== "string") {
    return "Name is required and must be a string."
  }
  if (!household.inviteCode || typeof household.inviteCode !== "string") {
    return "An invite code is required and must be a string."
  }
  if (!household.ownerId || !(household.ownerId instanceof ObjectId)) {
    return "Owner ID is required and must be a valid ObjectId."
  }
  // We can add more validation here as needed.
  return null
}

/**
 * Gets the households collection from the database.
 * @returns {Promise<Collection<HouseholdDoc>>} A promise that resolves to the households collection.
 */
export async function getHouseholdsCollection(): Promise<Collection<HouseholdDoc>> {
  const db: Db = await getDatabase()
  return db.collection<HouseholdDoc>("households")
}

export const Household = {
  validateHousehold,
  getHouseholdsCollection,
}

export default Household
    
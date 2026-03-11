import type { ObjectId } from "mongodb"

export type MealType = "Desayuno" | "Almuerzo" | "Merienda" | "Cena" | "Snack"
export type DayOfWeek = "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado" | "Domingo"

export interface Menu {
  _id?: ObjectId
  householdId: ObjectId
  date: Date
  dayOfWeek: DayOfWeek
  mealType: MealType
  dishName: string
  description?: string
  imageUrl?: string
  ingredients?: string[]
  preparationTime?: number // in minutes
  servings?: number
  recipe?: string
  tags: string[]
  nutritionalInfo?: {
    calories?: number
    protein?: number // in grams
    carbs?: number // in grams
    fat?: number // in grams
    fiber?: number // in grams
    vegetables?: boolean
    healthy?: boolean
    lowCalorie?: boolean
    vegetarian?: boolean
    vegan?: boolean
    glutenFree?: boolean
  }
  warnings?: string[]
  done?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface MenuInput {
  householdId: string
  date: string
  dayOfWeek?: DayOfWeek
  mealType: MealType
  dishName: string
  description?: string
  imageUrl?: string
  ingredients?: string[]
  preparationTime?: number
  servings?: number
  recipe?: string
  tags: string[]
  nutritionalInfo?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    fiber?: number
    vegetables?: boolean
    healthy?: boolean
    lowCalorie?: boolean
    vegetarian?: boolean
    vegan?: boolean
    glutenFree?: boolean
  }
  warnings?: string[]
}

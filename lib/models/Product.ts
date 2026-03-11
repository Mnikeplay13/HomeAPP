import type { ObjectId } from "mongodb"

export type ProductUnit = "kg" | "lts" | "unidades" | "paquetes" | "botellas" | "cajas"

export interface Product {
  _id?: ObjectId
  name: string
  category: "despensa" | "refrigerados" | "limpieza" | "higiene"
  quantity: number
  quantityUnit: ProductUnit
  threshold: number
  thresholdUnit: ProductUnit
  expiryDate?: Date
  householdId: ObjectId
  location?: string
  createdAt: Date
  updatedAt: Date
}

export interface ProductInput {
  name: string
  category: "despensa" | "refrigerados" | "limpieza" | "higiene"
  quantity: number
  quantityUnit: ProductUnit
  threshold: number
  thresholdUnit: ProductUnit
  expiryDate?: string
  householdId: string
  location?: string
}

export function calculateProductStatus(product: Product): "ok" | "low" | "expiring" | "expired" {
  // Verificar si está vencido o por vencer (prioridad más alta)
  if (product.expiryDate) {
    const now = new Date()
    const expiry = new Date(product.expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return "expired"
    } else if (daysUntilExpiry <= 3) {
      return "expiring"
    }
  }

  // Verificar stock comparando cantidades numéricas
  // Solo comparar si las unidades son las mismas
  if (product.quantityUnit === product.thresholdUnit) {
    if (product.quantity <= product.threshold) {
      return "low"
    }
  } else {
    // Si las unidades son diferentes, mostrar como "low" para que el usuario revise
    return "low"
  }

  return "ok"
}

export function formatProductQuantity(quantity: number, unit: ProductUnit): string {
  return `${quantity} ${unit}`
}

export function getUnitOptions(): { value: ProductUnit; label: string }[] {
  return [
    { value: "kg", label: "Kilogramos (kg)" },
    { value: "lts", label: "Litros (lts)" },
    { value: "unidades", label: "Unidades" },
    { value: "paquetes", label: "Paquetes" },
    { value: "botellas", label: "Botellas" },
    { value: "cajas", label: "Cajas" },
  ]
}

export function getDaysUntilExpiry(expiryDate: Date): number {
  const now = new Date()
  const expiry = new Date(expiryDate)
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function isDateInPast(dateString: string): boolean {
  const inputDate = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return inputDate < today
}

export function getTodayDateString(): string {
  const today = new Date()
  return today.toISOString().split("T")[0]
}

import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { Product, ProductInput } from "@/lib/models/Product"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection<Product>("products")

    const product = await collection.findOne({ _id: new ObjectId(id) })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body: Omit<ProductInput, "householdId"> = await request.json()

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    // Validar datos requeridos
    if (
      !body.name ||
      !body.category ||
      body.quantity === undefined ||
      !body.quantityUnit ||
      body.threshold === undefined ||
      !body.thresholdUnit
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validar que quantity y threshold sean números positivos
    if (body.quantity < 0 || body.threshold < 0) {
      return NextResponse.json({ error: "Quantity and threshold must be positive numbers" }, { status: 400 })
    }

    // Validar fecha de vencimiento (no puede ser pasada)
    if (body.expiryDate) {
      const expiryDate = new Date(body.expiryDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Resetear horas para comparar solo fechas

      if (expiryDate < today) {
        return NextResponse.json({ error: "Expiry date cannot be in the past" }, { status: 400 })
      }
    }

    const db = await getDatabase()
    const collection = db.collection<Product>("products")

    const updateData: Partial<Product> = {
      name: body.name.trim(),
      category: body.category,
      quantity: Number(body.quantity),
      quantityUnit: body.quantityUnit,
      threshold: Number(body.threshold),
      thresholdUnit: body.thresholdUnit,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      updatedAt: new Date(),
    }

    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateData })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const updatedProduct = await collection.findOne({ _id: new ObjectId(id) })

    return NextResponse.json({
      message: "Product updated successfully",
      product: updatedProduct,
    })
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection<Product>("products")

    const result = await collection.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Product deleted successfully" })
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

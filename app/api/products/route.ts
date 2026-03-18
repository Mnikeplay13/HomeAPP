import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { Product, ProductInput } from "@/lib/models/Product"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const householdId = searchParams.get("householdId")
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const location = searchParams.get("location")

    if (!householdId) {
      return NextResponse.json({ error: "householdId is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection<Product>("products")

    const filter: any = {
      householdId: new ObjectId(householdId),
    }

    if (category) {
      filter.category = category
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" }
    }

    if (location && location.trim()) {
      filter.location = location.trim()
    }

    const products = await collection.find(filter).sort({ createdAt: -1 }).toArray()

    return NextResponse.json({ products })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ProductInput = await request.json()

    // Validar datos requeridos
    if (
      !body.name ||
      !body.category ||
      body.quantity === undefined ||
      !body.quantityUnit ||
      body.threshold === undefined ||
      !body.thresholdUnit ||
      !body.householdId
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
    const notificationsCol = db.collection("notifications")
    const householdsCol = db.collection("households")

    const newProduct: any = {
      name: body.name.trim(),
      category: body.category,
      quantity: Number(body.quantity),
      quantityUnit: body.quantityUnit,
      threshold: Number(body.threshold),
      thresholdUnit: body.thresholdUnit,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      householdId: new ObjectId(body.householdId),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    if (body.location != null && String(body.location).trim()) {
      newProduct.location = String(body.location).trim()
    }

    const result = await collection.insertOne(newProduct)
    const createdProduct = await collection.findOne({ _id: result.insertedId })

    const household = await householdsCol.findOne({ _id: new ObjectId(body.householdId) })

    if (household && household.members) {
      // Check if product is low stock
      if (body.quantity <= body.threshold) {
        const notificationPromises = household.members.map((memberId: ObjectId) =>
          notificationsCol.insertOne({
            userId: memberId,
            householdId: new ObjectId(body.householdId),
            type: "product-low-stock",
            title: "Stock bajo en alacena",
            message: `${body.name} tiene stock bajo (${body.quantity} ${body.quantityUnit})`,
            data: { productId: result.insertedId, productName: body.name },
            read: false,
            createdAt: new Date(),
          }),
        )
        await Promise.all(notificationPromises)
      }

      // Check if product is expiring soon (within 7 days)
      if (body.expiryDate) {
        const expiryDate = new Date(body.expiryDate)
        const today = new Date()
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          const notificationPromises = household.members.map((memberId: ObjectId) =>
            notificationsCol.insertOne({
              userId: memberId,
              householdId: new ObjectId(body.householdId),
              type: "product-expiring",
              title: "Producto próximo a vencer",
              message: `${body.name} vence en ${daysUntilExpiry} días`,
              data: { productId: result.insertedId, productName: body.name, daysUntilExpiry },
              read: false,
              createdAt: new Date(),
            }),
          )
          await Promise.all(notificationPromises)
        }
      }
    }

    return NextResponse.json(
      {
        message: "Product created successfully",
        product: createdProduct,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

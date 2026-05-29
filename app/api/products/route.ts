import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { requireUser } from "@/lib/auth"
import type { Product, ProductInput } from "@/lib/models/Product"
import { ObjectId } from "mongodb"

/**
 * Valida que un string sea un ObjectId de MongoDB válido antes de construirlo,
 * evitando que `new ObjectId()` lance una excepción ante IDs malformados.
 */
function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id
}

/**
 * Escapa caracteres especiales de regex en strings de usuario.
 * Previene ataques ReDoS cuando el valor se pasa directamente a `$regex`.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ---------------------------------------------------------------------------
// GET — Listar productos de un hogar
// SEGURIDAD: autenticación requerida; búsqueda por regex con input escapado.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const householdId = searchParams.get("householdId")
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const location = searchParams.get("location")

    if (!householdId) {
      return NextResponse.json({ error: "householdId es requerido" }, { status: 400 })
    }

    if (!isValidObjectId(householdId)) {
      return NextResponse.json({ error: "householdId inválido" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection<Product>("products")

    const filter: Record<string, unknown> = {
      householdId: new ObjectId(householdId),
    }

    if (category) {
      filter.category = String(category)
    }

    if (search) {
      // Escapar el input del usuario antes de usarlo como expresión regular.
      // Sin esto, una búsqueda como "(.*){10}" podría causar backtracking catastrófico (ReDoS).
      filter.name = { $regex: escapeRegex(String(search)), $options: "i" }
    }

    if (location?.trim()) {
      filter.location = location.trim()
    }

    const products = await collection.find(filter).sort({ createdAt: -1 }).toArray()

    return NextResponse.json({ products })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — Crear nuevo producto
// SEGURIDAD: autenticación requerida; validación de ObjectId y rangos numéricos.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json() as ProductInput

    if (
      !body.name ||
      !body.category ||
      body.quantity === undefined ||
      !body.quantityUnit ||
      body.threshold === undefined ||
      !body.thresholdUnit ||
      !body.householdId
    ) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    if (!isValidObjectId(String(body.householdId))) {
      return NextResponse.json({ error: "householdId inválido" }, { status: 400 })
    }

    if (body.quantity < 0 || body.threshold < 0) {
      return NextResponse.json({ error: "Quantity y threshold deben ser números positivos" }, { status: 400 })
    }

    if (body.expiryDate) {
      const expiryDate = new Date(body.expiryDate)
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json({ error: "Fecha de vencimiento inválida" }, { status: 400 })
      }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (expiryDate < today) {
        return NextResponse.json({ error: "La fecha de vencimiento no puede ser en el pasado" }, { status: 400 })
      }
    }

    const db = await getDatabase()
    const collection = db.collection<Product>("products")
    const notificationsCol = db.collection("notifications")
    const householdsCol = db.collection("households")

    const newProduct: Omit<Product, "_id"> = {
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
      ...(body.location?.trim() ? { location: String(body.location).trim() } : {}),
    }

    const result = await collection.insertOne(newProduct as Product)
    const createdProduct = await collection.findOne({ _id: result.insertedId })

    const household = await householdsCol.findOne({ _id: new ObjectId(body.householdId) })

    if (household?.members) {
      const memberIds: ObjectId[] = household.members

      if (body.quantity <= body.threshold) {
        await Promise.all(
          memberIds.map((memberId) =>
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
          ),
        )
      }

      if (body.expiryDate) {
        const expiryDate = new Date(body.expiryDate)
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          await Promise.all(
            memberIds.map((memberId) =>
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
            ),
          )
        }
      }
    }

    return NextResponse.json({ message: "Producto creado exitosamente", product: createdProduct }, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

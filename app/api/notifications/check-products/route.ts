import { NextResponse, type NextRequest } from "next/server"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"
import { requireUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }

    const { user } = auth
    const db = await getDatabase()
    const usersCol = db.collection("users")
    const productsCol = db.collection("products")
    const notificationsCol = db.collection("notifications")

    // Obtener el hogar activo del usuario
    const userDoc = await usersCol.findOne({ _id: new ObjectId(user._id) })
    if (!userDoc || !userDoc.activeHousehold) {
      return NextResponse.json({ message: "Usuario o hogar no encontrado" }, { status: 404 })
    }

    const householdId = userDoc.activeHousehold

    // Obtener todos los productos del hogar
    const products = await productsCol.find({
      householdId: new ObjectId(householdId)
    }).toArray()

    const now = new Date()
    const notificationsToCreate = []

    for (const product of products) {
      // Verificar stock bajo
      const thresholds: { [key: string]: number } = {
        alimentos: 2,
        bebidas: 1,
        limpieza: 1,
        higiene: 1,
        medicamentos: 1,
        otros: 1,
      }
      const threshold = thresholds[product.category] || 1

      if (product.quantity <= threshold) {
        // Verificar si ya existe una notificación similar para este usuario en las últimas 24h
        const existingLowStock = await notificationsCol.findOne({
          userId: new ObjectId(user._id),
          householdId: new ObjectId(householdId),
          type: "product-low-stock",
          "data.productId": product._id,
          createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })

        if (!existingLowStock) {
          notificationsToCreate.push({
            userId: new ObjectId(user._id),
            householdId: new ObjectId(householdId),
            type: "product-low-stock",
            title: "📦 Stock Bajo",
            message: `El producto "${product.name}" tiene bajo stock (${product.quantity} ${product.unit})`,
            data: { 
              productId: product._id, 
              productName: product.name,
              quantity: product.quantity,
              unit: product.unit
            },
            read: false,
            createdAt: new Date(),
          })
        }
      }

      // Verificar productos vencidos o por vencer
      if (product.expirationDate) {
        const expiryDate = new Date(product.expirationDate)
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntilExpiry < 0) {
          // Producto vencido
          const existingExpired = await notificationsCol.findOne({
            userId: new ObjectId(user._id),
            householdId: new ObjectId(householdId),
            type: "product-expired",
            "data.productId": product._id,
            createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          })

          if (!existingExpired) {
            notificationsToCreate.push({
              userId: new ObjectId(user._id),
              householdId: new ObjectId(householdId),
              type: "product-expired",
              title: "⚠️ Producto Vencido",
              message: `El producto "${product.name}" ha vencido`,
              data: { 
                productId: product._id, 
                productName: product.name,
                expirationDate: product.expirationDate
              },
              read: false,
              createdAt: new Date(),
            })
          }
        } else if (daysUntilExpiry <= 3) {
          // Producto por vencer (3 días o menos)
          const existingExpiring = await notificationsCol.findOne({
            userId: new ObjectId(user._id),
            householdId: new ObjectId(householdId),
            type: "product-expiring",
            "data.productId": product._id,
            createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          })

          if (!existingExpiring) {
            notificationsToCreate.push({
              userId: new ObjectId(user._id),
              householdId: new ObjectId(householdId),
              type: "product-expiring",
              title: "⏰ Producto por Vencer",
              message: `El producto "${product.name}" vence en ${daysUntilExpiry} día${daysUntilExpiry === 1 ? '' : 's'}`,
              data: { 
                productId: product._id, 
                productName: product.name,
                daysUntilExpiry,
                expirationDate: product.expirationDate
              },
              read: false,
              createdAt: new Date(),
            })
          }
        }
      }
    }

    // Insertar todas las notificaciones nuevas
    if (notificationsToCreate.length > 0) {
      await notificationsCol.insertMany(notificationsToCreate)
    }

    return NextResponse.json({ 
      message: "Verificación de productos completada",
      notificationsCreated: notificationsToCreate.length
    }, { status: 200 })

  } catch (error) {
    console.error("POST /api/notifications/check-products error:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

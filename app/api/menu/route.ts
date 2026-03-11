import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { Menu, MenuInput, DayOfWeek } from "@/lib/models/Menu"
import { ObjectId } from "mongodb"

function getDayOfWeekFromDate(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  return days[date.getDay()] === "Domingo" ? "Domingo" : (days[date.getDay()] as DayOfWeek)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const householdId = searchParams.get("householdId")
    const dayOfWeek = searchParams.get("dayOfWeek")
    const mealType = searchParams.get("mealType")
    const month = searchParams.get("month") // YYYY-MM

    if (!householdId) {
      return NextResponse.json({ error: "householdId is required" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection<Menu>("menus")

    // Construir filtro
    const filter: any = {
      householdId: new ObjectId(householdId),
    }

    if (dayOfWeek) {
      filter.dayOfWeek = dayOfWeek
    }

    if (mealType) {
      filter.mealType = mealType
    }

    if (month) {
      const [yearStr, monthStr] = month.split("-")
      const year = Number.parseInt(yearStr, 10)
      const m = Number.parseInt(monthStr, 10) - 1
      if (!Number.isNaN(year) && !Number.isNaN(m)) {
        const start = new Date(year, m, 1)
        const end = new Date(year, m + 1, 0, 23, 59, 59, 999)
        filter.date = { $gte: start, $lte: end }
      }
    }

    const menus = await collection.find(filter).sort({ date: 1, createdAt: -1 }).toArray()

    return NextResponse.json({ menus })
  } catch (error) {
    console.error("Error fetching menus:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: MenuInput = await request.json()

    // Validar datos requeridos
    if (!body.dishName || !body.date || !body.mealType || !body.householdId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const date = new Date(body.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) {
      return NextResponse.json({ error: "La fecha de la comida no puede estar en el pasado" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection<Menu>("menus")
    const notificationsCol = db.collection("notifications")
    const householdsCol = db.collection("households")

    const newMenu: Omit<Menu, "_id"> = {
      householdId: new ObjectId(body.householdId),
      date,
      dayOfWeek: getDayOfWeekFromDate(date),
      mealType: body.mealType,
      dishName: body.dishName.trim(),
      description: body.description?.trim(),
      imageUrl: body.imageUrl,
      ingredients: body.ingredients,
      preparationTime: body.preparationTime,
      servings: body.servings,
      difficulty: body.difficulty,
      recipe: body.recipe,
      tags: body.tags || [],
      nutritionalInfo: body.nutritionalInfo,
      warnings: body.warnings,
      done: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collection.insertOne(newMenu)
    const createdMenu = await collection.findOne({ _id: result.insertedId })

    const household = await householdsCol.findOne({ _id: new ObjectId(body.householdId) })
    if (household && household.members) {
      const notificationPromises = household.members.map((memberId: ObjectId) =>
        notificationsCol.insertOne({
          userId: memberId,
          householdId: new ObjectId(body.householdId),
          type: "menu_added",
          title: "Nuevo plato en el menú",
          message: `Se agregó ${body.dishName} para ${getDayOfWeekFromDate(date)} - ${body.mealType}`,
          data: { menuId: result.insertedId, date, mealType: body.mealType },
          read: false,
          createdAt: new Date(),
        }),
      )
      await Promise.all(notificationPromises)
    }

    return NextResponse.json(
      {
        message: "Menu created successfully",
        menu: createdMenu,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating menu:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

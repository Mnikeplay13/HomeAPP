import { type NextRequest, NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { Menu, DayOfWeek } from "@/lib/models/Menu"
import { ObjectId } from "mongodb"

function getDayOfWeekFromDate(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  return days[date.getDay()] === "Domingo" ? "Domingo" : (days[date.getDay()] as DayOfWeek)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid menu ID" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection<Menu>("menus")

    const result = await collection.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Menu deleted successfully" })
  } catch (error) {
    console.error("Error deleting menu:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid menu ID" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection<Menu>("menus")

    const updateData: any = {
      updatedAt: new Date(),
    }

    if (body.dishName !== undefined) updateData.dishName = body.dishName.trim()
    if (body.description !== undefined) updateData.description = body.description?.trim()
    if (body.mealType !== undefined) updateData.mealType = body.mealType
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.nutritionalInfo !== undefined) updateData.nutritionalInfo = body.nutritionalInfo
    if (body.warnings !== undefined) updateData.warnings = body.warnings
    if (body.done !== undefined) updateData.done = !!body.done
    if (body.date !== undefined) {
      const date = new Date(body.date)
      updateData.date = date
      updateData.dayOfWeek = getDayOfWeekFromDate(date)
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: "after" },
    )

    if (!result) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Menu updated successfully",
      menu: result,
    })
  } catch (error) {
    console.error("Error updating menu:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
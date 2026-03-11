import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"

// GET - Obtener gastos e ingresos del mes actual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const householdId = searchParams.get("householdId")
    const mes = searchParams.get("mes") // formato YYYY-MM
    const viewMode = searchParams.get("viewMode") || "individual"

    if (!userId || !householdId || !mes) {
      return NextResponse.json({ error: "Faltan parámetros requeridos: userId, householdId, mes" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection("expenses")

    // Convertir householdId a ObjectId si es string
    const householdObjectId = typeof householdId === 'string' ? new ObjectId(householdId) : householdId

    const query: any = { mes, householdId: householdObjectId }

    // Vista individual: solo datos del usuario actual
    if (viewMode === "individual") {
      query.userId = userId
    } else {
      // Vista hogar: gastos/ingresos de los demás (excluir al usuario actual)
      query.userId = { $ne: userId }
    }

    const expenseDocuments = await collection.find(query).toArray()

    let allExpenses: any[] = []
    let allIncomes: any[] = []

    expenseDocuments.forEach((doc) => {
      if (doc.gastos && Array.isArray(doc.gastos)) {
        allExpenses = allExpenses.concat(doc.gastos)
      }
      if (doc.ingresos && Array.isArray(doc.ingresos)) {
        allIncomes = allIncomes.concat(doc.ingresos)
      }
    })

    return NextResponse.json({
      gastos: allExpenses,
      ingresos: allIncomes,
      totalDocuments: expenseDocuments.length,
    })
  } catch (error) {
    console.error("Error al obtener gastos:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST - Agregar nuevo gasto o ingreso o guardar presupuesto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, householdId, fecha, monto, tipo = "gasto", presupuesto } = body

    // Validar campos mínimos
    if (!userId || !householdId) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: userId, householdId" },
        { status: 400 },
      )
    }

    const db = await getDatabase()
    const collection = db.collection("expenses")
    const householdObjectId = typeof householdId === 'string' ? new ObjectId(householdId) : householdId

    // Si viene un presupuesto, guardarlo en el documento del mes
    if (presupuesto !== undefined) {
      const mes = new Date().toISOString().slice(0, 7) // YYYY-MM
      
      const documentoExistente = await collection.findOne({
        userId,
        householdId: householdObjectId,
        mes,
      })

      if (documentoExistente) {
        await collection.updateOne(
          { _id: documentoExistente._id },
          { $set: { presupuesto: presupuesto, updatedAt: new Date() } },
        )
      } else {
        const doc: any = {
          userId,
          householdId: householdObjectId,
          mes,
          gastos: [],
          ingresos: [],
          presupuesto: presupuesto,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        await collection.insertOne(doc)
      }

      return NextResponse.json({
        message: "Presupuesto guardado exitosamente",
        presupuesto: presupuesto,
      })
    }

    // Validar campos para gastos/ingresos
    if (!fecha || monto === undefined) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: fecha, monto" },
        { status: 400 },
      )
    }

    const fechaObj = new Date(fecha)
    const mes = fechaObj.toISOString().slice(0, 7)

    const montoNumerico = Number.parseFloat(monto)
    if (isNaN(montoNumerico) || montoNumerico < 0) {
      return NextResponse.json({ error: "El monto debe ser un número válido mayor o igual a 0" }, { status: 400 })
    }

    const item = { fecha, monto: montoNumerico }
    const isIncome = tipo === "ingreso"
    const arrayField = isIncome ? "ingresos" : "gastos"

    const documentoExistente = await collection.findOne({
      userId,
      householdId: householdObjectId,
      mes,
    })

    if (documentoExistente) {
      const existingArray = documentoExistente[arrayField]
      if (Array.isArray(existingArray)) {
        await collection.updateOne(
          { _id: documentoExistente._id },
          { 
            $push: { [arrayField]: item } as any, 
            $set: { updatedAt: new Date() } 
          },
        )
      } else {
        await collection.updateOne(
          { _id: documentoExistente._id },
          { 
            $set: { [arrayField]: [item], updatedAt: new Date() } 
          },
        )
      }
    } else {
      const doc: any = {
        userId,
        householdId: householdObjectId,
        mes,
        gastos: isIncome ? [] : [item],
        ingresos: isIncome ? [item] : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await collection.insertOne(doc)
    }

    return NextResponse.json({
      message: isIncome ? "Ingreso agregado exitosamente" : "Gasto agregado exitosamente",
      [isIncome ? "ingreso" : "gasto"]: item,
    })
  } catch (error) {
    console.error("Error al agregar gasto/ingreso:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// PUT - Editar gasto o ingreso existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, householdId, fecha, montoAnterior, montoNuevo, tipo = "gasto" } = body

    if (!userId || !householdId || !fecha || montoAnterior === undefined || montoNuevo === undefined) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection("expenses")
    const householdObjectId = typeof householdId === 'string' ? new ObjectId(householdId) : householdId

    const fechaObj = new Date(fecha)
    const mes = fechaObj.toISOString().slice(0, 7)
    const arrayField = tipo === "ingreso" ? "ingresos" : "gastos"

    const documentoExistente = await collection.findOne({
      userId,
      householdId: householdObjectId,
      mes,
    })

    if (documentoExistente) {
      const existingArray = documentoExistente[arrayField]
      if (Array.isArray(existingArray)) {
        // Editar item existente
        const updatedArray = existingArray.map((item: any) => 
          item.fecha === fecha ? { ...item, monto: Number.parseFloat(montoNuevo.toString()) } : item
        )
        await collection.updateOne(
          { _id: documentoExistente._id },
          { $set: { [arrayField]: updatedArray, updatedAt: new Date() } },
        )
      }
    }

    return NextResponse.json({
      message: tipo === "ingreso" ? "Ingreso actualizado exitosamente" : "Gasto actualizado exitosamente",
    })
  } catch (error) {
    console.error("Error al actualizar gasto/ingreso:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE - Eliminar gasto o ingreso
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const householdId = searchParams.get("householdId")
    const fecha = searchParams.get("fecha")
    const monto = searchParams.get("monto")
    const tipo = searchParams.get("tipo") || "gasto"

    if (!userId || !householdId || !fecha || !monto) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection("expenses")
    const householdObjectId = typeof householdId === 'string' ? new ObjectId(householdId) : householdId

    const fechaObj = new Date(fecha)
    const mes = fechaObj.toISOString().slice(0, 7)
    const arrayField = tipo === "ingreso" ? "ingresos" : "gastos"

    const resultado = await collection.updateOne(
      { userId, householdId: householdObjectId, mes },
      {
        $pull: {
          [arrayField]: {
            fecha: fecha,
            monto: Number.parseFloat(monto),
          },
        } as any,
        $set: { updatedAt: new Date() },
      },
    )

    if (resultado.matchedCount === 0) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      message: tipo === "ingreso" ? "Ingreso eliminado exitosamente" : "Gasto eliminado exitosamente",
    })
  } catch (error) {
    console.error("Error al eliminar gasto/ingreso:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

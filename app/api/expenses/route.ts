import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"
import { requireUser } from "@/lib/auth"

/** Estructura de un ítem individual de gasto o ingreso. */
interface ExpenseItem {
  fecha: string
  monto: number
  [key: string]: unknown
}

/** Estructura del documento mensual almacenado en la colección "expenses". */
interface ExpenseDoc {
  userId: string
  householdId: ObjectId
  mes: string
  gastos: ExpenseItem[]
  ingresos: ExpenseItem[]
  presupuesto?: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Valida que un string sea un ObjectId de MongoDB válido.
 * Previene excepciones de `new ObjectId()` ante entradas malformadas.
 */
function isValidObjectId(id: string): boolean {
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id
}

// ---------------------------------------------------------------------------
// GET — Obtener gastos/ingresos del mes actual
// SEGURIDAD: requireUser garantiza que solo se devuelven datos del usuario
// autenticado (o de su hogar), evitando el IDOR que existía cuando userId
// venía directamente del query string.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { user } = auth

    const { searchParams } = new URL(request.url)
    const householdId = searchParams.get("householdId")
    const mes = searchParams.get("mes") // formato YYYY-MM
    const viewMode = searchParams.get("viewMode") || "individual"

    if (!householdId || !mes) {
      return NextResponse.json({ error: "Faltan parámetros requeridos: householdId, mes" }, { status: 400 })
    }

    // Validar formato ObjectId antes de pasarlo al driver para evitar excepciones
    if (!isValidObjectId(householdId)) {
      return NextResponse.json({ error: "householdId inválido" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection<ExpenseDoc>("expenses")
    const householdObjectId = new ObjectId(householdId)

    // Construir query tipada: userId proviene del token, no del cliente
    const query: Partial<ExpenseDoc> & Record<string, unknown> = {
      mes,
      householdId: householdObjectId,
    }

    if (viewMode === "individual") {
      // Solo los documentos del usuario autenticado
      query.userId = user._id.toString()
    } else {
      // Vista hogar: todos los demás miembros
      query.userId = { $ne: user._id.toString() } as unknown as string
    }

    const expenseDocuments = await collection.find(query).toArray()

    let allExpenses: ExpenseItem[] = []
    let allIncomes: ExpenseItem[] = []

    for (const doc of expenseDocuments) {
      if (Array.isArray(doc.gastos)) allExpenses = allExpenses.concat(doc.gastos)
      if (Array.isArray(doc.ingresos)) allIncomes = allIncomes.concat(doc.ingresos)
    }

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

// ---------------------------------------------------------------------------
// POST — Agregar gasto, ingreso o guardar presupuesto
// SEGURIDAD: userId ya no se acepta del body; se extrae del token autenticado.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { user } = auth

    const body: Record<string, unknown> = await request.json()
    const { householdId, fecha, monto, tipo = "gasto", presupuesto } = body as {
      householdId?: string
      fecha?: string
      monto?: unknown
      tipo?: string
      presupuesto?: unknown
    }

    if (!householdId) {
      return NextResponse.json({ error: "Falta campo requerido: householdId" }, { status: 400 })
    }

    if (!isValidObjectId(householdId)) {
      return NextResponse.json({ error: "householdId inválido" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection<ExpenseDoc>("expenses")
    const householdObjectId = new ObjectId(householdId)
    // userId proviene del token autenticado, no del cliente
    const userId = user._id.toString()

    // ── Rama presupuesto ────────────────────────────────────────────────────
    if (presupuesto !== undefined) {
      const presupuestoNum = Number(presupuesto)
      if (isNaN(presupuestoNum) || presupuestoNum < 0) {
        return NextResponse.json({ error: "Presupuesto inválido" }, { status: 400 })
      }

      const mes = new Date().toISOString().slice(0, 7)
      const documentoExistente = await collection.findOne({ userId, householdId: householdObjectId, mes })

      if (documentoExistente) {
        await collection.updateOne(
          { _id: documentoExistente._id },
          { $set: { presupuesto: presupuestoNum, updatedAt: new Date() } },
        )
      } else {
        await collection.insertOne({
          userId,
          householdId: householdObjectId,
          mes,
          gastos: [],
          ingresos: [],
          presupuesto: presupuestoNum,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }

      return NextResponse.json({ message: "Presupuesto guardado exitosamente", presupuesto: presupuestoNum })
    }

    // ── Rama gasto / ingreso ────────────────────────────────────────────────
    if (!fecha || monto === undefined) {
      return NextResponse.json({ error: "Faltan campos requeridos: fecha, monto" }, { status: 400 })
    }

    const fechaObj = new Date(String(fecha))
    if (isNaN(fechaObj.getTime())) {
      return NextResponse.json({ error: "Formato de fecha inválido" }, { status: 400 })
    }

    const montoNumerico = Number(monto)
    if (isNaN(montoNumerico) || montoNumerico < 0) {
      return NextResponse.json({ error: "El monto debe ser un número válido mayor o igual a 0" }, { status: 400 })
    }

    const mes = fechaObj.toISOString().slice(0, 7)
    const isIncome = tipo === "ingreso"
    const arrayField = isIncome ? "ingresos" : "gastos"
    const item: ExpenseItem = { fecha: String(fecha), monto: montoNumerico }

    const documentoExistente = await collection.findOne({ userId, householdId: householdObjectId, mes })

    if (documentoExistente) {
      const existingArray = documentoExistente[arrayField]
      if (Array.isArray(existingArray)) {
        await collection.updateOne(
          { _id: documentoExistente._id },
          { $push: { [arrayField]: item }, $set: { updatedAt: new Date() } },
        )
      } else {
        await collection.updateOne(
          { _id: documentoExistente._id },
          { $set: { [arrayField]: [item], updatedAt: new Date() } },
        )
      }
    } else {
      await collection.insertOne({
        userId,
        householdId: householdObjectId,
        mes,
        gastos: isIncome ? [] : [item],
        ingresos: isIncome ? [item] : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
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

// ---------------------------------------------------------------------------
// PUT — Editar gasto o ingreso existente
// SEGURIDAD: userId del token; montoNuevo re-validado como número.
// ---------------------------------------------------------------------------
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { user } = auth

    const body = await request.json() as {
      householdId?: string
      fecha?: string
      montoAnterior?: unknown
      montoNuevo?: unknown
      tipo?: string
    }
    const { householdId, fecha, montoAnterior, montoNuevo, tipo = "gasto" } = body

    if (!householdId || !fecha || montoAnterior === undefined || montoNuevo === undefined) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    if (!isValidObjectId(householdId)) {
      return NextResponse.json({ error: "householdId inválido" }, { status: 400 })
    }

    const montoNuevoNum = Number(montoNuevo)
    if (isNaN(montoNuevoNum) || montoNuevoNum < 0) {
      return NextResponse.json({ error: "montoNuevo debe ser un número válido" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection<ExpenseDoc>("expenses")
    const householdObjectId = new ObjectId(householdId)
    const userId = user._id.toString()

    const fechaObj = new Date(String(fecha))
    if (isNaN(fechaObj.getTime())) {
      return NextResponse.json({ error: "Formato de fecha inválido" }, { status: 400 })
    }
    const mes = fechaObj.toISOString().slice(0, 7)
    const arrayField = tipo === "ingreso" ? "ingresos" : "gastos"

    const documentoExistente = await collection.findOne({ userId, householdId: householdObjectId, mes })

    if (documentoExistente) {
      const existingArray = documentoExistente[arrayField]
      if (Array.isArray(existingArray)) {
        const updatedArray = existingArray.map((item) =>
          item.fecha === fecha ? { ...item, monto: montoNuevoNum } : item,
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

// ---------------------------------------------------------------------------
// DELETE — Eliminar gasto o ingreso
// SEGURIDAD: userId del token. Validación de ObjectId y monto antes de $pull.
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { user } = auth

    const { searchParams } = new URL(request.url)
    const householdId = searchParams.get("householdId")
    const fecha = searchParams.get("fecha")
    const monto = searchParams.get("monto")
    const tipo = searchParams.get("tipo") || "gasto"

    if (!householdId || !fecha || !monto) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    if (!isValidObjectId(householdId)) {
      return NextResponse.json({ error: "householdId inválido" }, { status: 400 })
    }

    const montoNum = Number.parseFloat(monto)
    if (isNaN(montoNum)) {
      return NextResponse.json({ error: "monto inválido" }, { status: 400 })
    }

    const db = await getDatabase()
    const collection = db.collection<ExpenseDoc>("expenses")
    const householdObjectId = new ObjectId(householdId)
    const userId = user._id.toString()

    const fechaObj = new Date(fecha)
    if (isNaN(fechaObj.getTime())) {
      return NextResponse.json({ error: "Formato de fecha inválido" }, { status: 400 })
    }
    const mes = fechaObj.toISOString().slice(0, 7)
    const arrayField = tipo === "ingreso" ? "ingresos" : "gastos"

    const resultado = await collection.updateOne(
      { userId, householdId: householdObjectId, mes },
      {
        $pull: { [arrayField]: { fecha, monto: montoNum } },
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

import { NextResponse, type NextRequest } from "next/server"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"
import { requireUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status })
    }
    const { user } = auth

    if (!user.activeHousehold) {
      return NextResponse.json({ error: "No se encontró el hogar activo" }, { status: 404 })
    }

    const db = await getDatabase()
    const householdId = new ObjectId(user.activeHousehold)

    // Obtener fecha actual para filtrar por mes
    const now = new Date()
    const currentMonth = now.toISOString().slice(0, 7) // YYYY-MM

    // 1. Obtener datos del hogar y miembros
    const householdsCol = db.collection("households")
    const usersCol = db.collection("users")
    
    const household = await householdsCol.findOne({ _id: householdId })
    if (!household) {
      return NextResponse.json({ error: "Hogar no encontrado" }, { status: 404 })
    }

    const members = await usersCol
      .find({ _id: { $in: household.members } })
      .project({ name: 1, email: 1 })
      .toArray()

    const membersWithRoles = members.map(member => {
      const isOwner = household.ownerId.toString() === member._id.toString()
      const isModerator = household.moderators?.some((modId: ObjectId) => modId.toString() === member._id.toString())
      const role = isOwner ? "dueño" : isModerator ? "admin" : "miembro"
      
      return {
        name: member.name,
        email: member.email,
        role: role
      }
    })

    // 2. Obtener gastos del mes y presupuesto del usuario
    const expensesCol = db.collection("expenses")
    const expenseDocs = await expensesCol.find({ 
      householdId,
      mes: currentMonth 
    }).toArray()

    let totalExpenses = 0
    let totalIncomes = 0
    let allExpenses: any[] = []
    let allIncomes: any[] = []
    let monthlyBudget = 1000 // Presupuesto por defecto

    expenseDocs.forEach((doc) => {
      // Acumular gastos de todos los usuarios del hogar
      if (doc.gastos && Array.isArray(doc.gastos)) {
        allExpenses = allExpenses.concat(doc.gastos)
        totalExpenses += doc.gastos.reduce((sum: number, gasto: any) => sum + gasto.monto, 0)
      }
      // Acumular ingresos de todos los usuarios del hogar
      if (doc.ingresos && Array.isArray(doc.ingresos)) {
        allIncomes = allIncomes.concat(doc.ingresos)
        totalIncomes += doc.ingresos.reduce((sum: number, ingreso: any) => sum + ingreso.monto, 0)
      }
      
      // Obtener presupuesto del documento de expenses (donde se guarda realmente)
      if (doc.presupuesto) {
        monthlyBudget = doc.presupuesto
      }
    })

    // 3. Obtener tareas
    const tasksCol = db.collection("tasks")
    const tasks = await tasksCol.find({ householdId }).toArray()
    
    const completedTasks = tasks.filter(task => task.status === "completed").length
    const pendingTasks = tasks.filter(task => task.status === "pending").length
    const overdueTasks = tasks.filter(task => task.status === "overdue").length

    // 4. Obtener productos de alacena
    const productsCol = db.collection("products")
    const products = await productsCol.find({ householdId }).toArray()

    let normalStock = 0
    let lowStock = 0
    let expired = 0
    let expiring = 0

    products.forEach(product => {
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
        lowStock++
      } else {
        normalStock++
      }

      // Verificar vencimiento
      if (product.expiryDate) {
        const now = new Date()
        const expiry = new Date(product.expiryDate)
        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntilExpiry < 0) {
          expired++
        } else if (daysUntilExpiry <= 3) {
          expiring++
        }
      }
    })

    // 5. Obtener platos del menú
    const menuCol = db.collection("menus")
    const menus = await menuCol.find({ 
      householdId,
      date: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }
    }).toArray()

    const pendingMenuItems = menus.filter(menu => !menu.done).length
    const completedMenuItems = menus.filter(menu => menu.done).length

    // 6. Construir respuesta
    const reportData = {
      hogar: {
        nombre: household.name,
        imagen: household.imageUrl || null,
        miembros: membersWithRoles,
        totalMiembros: members.length
      },
      finanzas: {
        mes: currentMonth,
        totalGastos: totalExpenses,
        totalIngresos: totalIncomes,
        presupuesto: monthlyBudget || 0
      },
      tareas: {
        completadas: completedTasks,
        pendientes: pendingTasks,
        vencidas: overdueTasks,
        total: tasks.length
      },
      alacena: {
        totalProductos: products.length,
        stockNormal: normalStock,
        stockBajo: lowStock,
        vencidos: expired,
        porVencer: expiring
      },
      menu: {
        platosPendientes: pendingMenuItems,
        platosCompletados: completedMenuItems,
        totalPlatos: menus.length
      },
      fechaReporte: now.toISOString(),
      periodo: `${now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error("Error generando reporte:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

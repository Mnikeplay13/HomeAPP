"use client" // Componente de cliente para manejar estado y eventos

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ThemeToggle from "@/components/theme-toggle" // Control de tema claro/oscuro
import NotificationButton from "@/components/notification-button" // Sistema de notificaciones
import ProfileDropdown from "@/components/profile-dropdown" // Menú de perfil
import ExpenseCalendar from "@/components/expense-calendar" // Calendario de gastos
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts" // Gráficos

// Interface para datos del usuario
interface User {
  _id: string
  name: string
  email: string
  profileImage?: string
  createdAt: string
}

// Interface para transacciones individuales
interface Expense {
  fecha: string
  monto: number
}

// Interface para datos completos de gastos del mes
interface ExpenseData {
  userId: string
  householdId: string
  mes: string // Formato "YYYY-MM"
  gastos: Expense[] // Array de gastos
}

// Componente principal de la página de Finanzas
export default function FinanzasPage() {
  // Estados de usuario y UI
  const [user, setUser] = useState<User | null>(null) // Usuario autenticado
  const [loading, setLoading] = useState(true) // Estado de carga inicial
  const [sidebarHidden, setSidebarHidden] = useState(false) // Control de sidebar
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // Menú móvil
  
  // Estados para formulario de transacciones
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]) // Fecha por defecto: hoy
  const [expenseAmount, setExpenseAmount] = useState("") // Monto de la transacción
  const [entryType, setEntryType] = useState<"gasto" | "ingreso">("gasto") // Tipo: gasto o ingreso
  const [viewMode, setViewMode] = useState<"individual" | "household">("individual") // Vista: individual o del hogar
  
  // Estados para datos financieros
  const [expenses, setExpenses] = useState<Expense[]>([]) // Lista de gastos
  const [ingresos, setIngresos] = useState<Expense[]>([]) // Lista de ingresos
  const [monthlyTotal, setMonthlyTotal] = useState(0) // Total de gastos mensuales
  const [monthlyIncome, setMonthlyIncome] = useState(0) // Total de ingresos mensuales
  const [estimatedSavings, setEstimatedSavings] = useState(0) // Ahorro estimado (ingresos - gastos)
  
  // Estados para visualización
  const [chartData, setChartData] = useState<any[]>([]) // Datos para gráficos
  const [chartViewMode, setChartViewMode] = useState<"chart" | "calendar">("chart") // Vista: gráfico o calendario
  const [monthlyBudget, setMonthlyBudget] = useState(1000) // Presupuesto mensual
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState("1000")
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (!token || !userData) {
      router.push("/login")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)

      const budgetKey = parsedUser._id ? `monthlyBudget_${parsedUser._id}` : "monthlyBudget"
      const savedBudget = localStorage.getItem(budgetKey) || localStorage.getItem("monthlyBudget")
      if (savedBudget) setMonthlyBudget(Number.parseFloat(savedBudget))

      const activeHouseholdId = localStorage.getItem("activeHouseholdId")
      if (!activeHouseholdId) {
        router.push("/select-household")
        return
      }

      loadExpenses(parsedUser._id, activeHouseholdId)
    } catch (error) {
      console.error("Error parsing user data:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }, [router])

  const loadExpenses = async (userId: string, householdId: string) => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7)
      const response = await fetch(
        `/api/expenses?userId=${userId}&householdId=${householdId}&mes=${currentMonth}&viewMode=${viewMode}`,
      )

      if (response.ok) {
        const data = await response.json()
        const gastos = data.gastos || []
        const ingresosData = data.ingresos || []
        setExpenses(gastos)
        setIngresos(ingresosData)
        calculateStats(gastos, ingresosData)
        generateChartData(gastos, ingresosData)
      }
    } catch (error) {
      console.error("Error loading expenses:", error)
    }
  }

  const calculateStats = (expenseList: Expense[], incomeList: Expense[]) => {
    const totalGastos = expenseList.reduce((sum, e) => sum + e.monto, 0)
    const totalIngresos = incomeList.reduce((sum, e) => sum + e.monto, 0)
    setMonthlyTotal(totalGastos)
    setMonthlyIncome(totalIngresos)
    setEstimatedSavings(Math.max(0, monthlyBudget - totalGastos + totalIngresos))
  }

  const generateChartData = (expenseList: Expense[], incomeList: Expense[]) => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    const dailyGastos: { [key: number]: number } = {}
    const dailyIngresos: { [key: number]: number } = {}
    for (let day = 1; day <= daysInMonth; day++) {
      dailyGastos[day] = 0
      dailyIngresos[day] = 0
    }
    expenseList.forEach((e) => {
      const d = new Date(e.fecha + "T00:00:00").getDate()
      if (d >= 1 && d <= daysInMonth) dailyGastos[d] += e.monto
    })
    incomeList.forEach((e) => {
      const d = new Date(e.fecha + "T00:00:00").getDate()
      if (d >= 1 && d <= daysInMonth) dailyIngresos[d] += e.monto
    })

    const chartArray = []
    for (let day = 1; day <= daysInMonth; day++) {
      chartArray.push({
        day: `Día ${day}`,
        monto: dailyGastos[day] - dailyIngresos[day],
      })
    }
    setChartData(chartArray)
  }

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !expenseAmount) return
    const householdId = localStorage.getItem("activeHouseholdId")
    if (!householdId) return
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          householdId,
          fecha: expenseDate,
          monto: Number.parseFloat(expenseAmount),
          tipo: entryType,
        }),
      })
      if (response.ok) {
        setExpenseAmount("")
        loadExpenses(user._id, householdId)
      }
    } catch (error) {
      console.error("Error adding entry:", error)
    }
  }

  const handleDeleteEntry = async (fecha: string, monto: number, tipo: "gasto" | "ingreso" = "gasto") => {
    if (!user) return
    const householdId = localStorage.getItem("activeHouseholdId")
    if (!householdId) return
    if (!confirm(tipo === "ingreso" ? "¿Eliminar este ingreso?" : "¿Eliminar este gasto?")) return
    try {
      const res = await fetch(
        `/api/expenses?userId=${user._id}&householdId=${householdId}&fecha=${fecha}&monto=${monto}&tipo=${tipo}`,
        { method: "DELETE" },
      )
      if (res.ok) loadExpenses(user._id, householdId)
    } catch (error) {
      console.error("Error deleting entry:", error)
    }
  }

  const handleEditEntry = async (fecha: string, montoAnterior: number, montoNuevo: number, tipo: "gasto" | "ingreso" = "gasto") => {
    if (!user) return
    const householdId = localStorage.getItem("activeHouseholdId")
    if (!householdId) return
    try {
      const res = await fetch("/api/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          householdId,
          fecha,
          montoAnterior,
          montoNuevo,
          tipo,
        }),
      })
      if (res.ok) loadExpenses(user._id, householdId)
    } catch (error) {
      console.error("Error editing entry:", error)
    }
  }

  const handleSaveBudget = async () => {
    const newBudget = Number.parseFloat(budgetInput)
    if (!isNaN(newBudget) && newBudget >= 0 && user) {
      setMonthlyBudget(newBudget)
      
      // Guardar en localStorage
      const key = user._id ? `monthlyBudget_${user._id}` : "monthlyBudget"
      localStorage.setItem(key, newBudget.toString())
      
      // También guardar en la base de datos MongoDB usando el endpoint existente
      try {
        const householdId = localStorage.getItem("activeHouseholdId")
        if (householdId) {
          const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
          const res = await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user._id,
              householdId,
              mes: currentMonth,
              presupuesto: newBudget,
            }),
          })
          
          if (res.ok) {
            console.log("Presupuesto guardado en base de datos")
          } else {
            console.error("Error al guardar presupuesto en base de datos")
          }
        }
      } catch (error) {
        console.error("Error guardando presupuesto en base de datos:", error)
      }
      
      setIsEditingBudget(false)
      calculateStats(expenses, ingresos)
    }
  }

  const handleCancelBudgetEdit = () => {
    setBudgetInput(monthlyBudget.toString())
    setIsEditingBudget(false)
  }

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "individual" ? "household" : "individual"))
  }

  useEffect(() => {
    if (!user) return
    const householdId = localStorage.getItem("activeHouseholdId")
    if (householdId) loadExpenses(user._id, householdId)
  }, [user?._id, viewMode])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  const toggleSidebar = () => {
    setSidebarHidden(!sidebarHidden)
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="font-roboto min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-80 bg-blue-500 dark:bg-gray-800 text-white transform transition-transform duration-300 ease-in-out ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } ${sidebarHidden ? "lg:-translate-x-full" : ""}`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 lg:justify-center">
            <span className="text-2xl lg:text-3xl font-bold text-white animate-fade-in">HomeApp</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-8 px-4 space-y-2">
            {/* Icono de inicio */}
            <Link
              href="/dashboard"
              className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 hover:bg-blue-700 hover:scale-105 transform group animate-fade-in"
            >
              <svg
                className="w-6 h-6 text-white transition-transform group-hover:scale-110"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" />
              </svg>
              <span className="text-white ml-4 text-lg font-semibold">Inicio</span>
            </Link>

            {/* Icono de Finanzas */}
            <Link
              href="/finanzas"
              className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 bg-blue-700 hover:scale-105 transform group animate-fade-in"
            >
              <svg
                className="w-6 h-6 text-white transition-transform group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span className="text-white ml-4 text-lg font-semibold">Finanzas</span>
            </Link>

            {/* Icono de Perfil */}

            {/* Icono de Tareas */}
            <Link
              href="/todo"
              className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 hover:bg-blue-700 hover:scale-105 transform group animate-fade-in"
            >
              <svg
                className="w-6 h-6 text-white transition-transform group-hover:scale-110"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3M7,7H17V5H19V19H5V5H7V7Z" />
                <path d="M8,13H16V11H8V13Z" />
                <path d="M8,17H16V15H8V17Z" />
              </svg>
              <span className="text-white ml-4 text-lg font-semibold">Lista de Tareas</span>
            </Link>

            {/* Icono de Menú */}
            <Link
              href="/menu"
              className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 hover:bg-blue-700 hover:scale-105 transform group animate-fade-in"
            >
              <svg
                className="w-6 h-6 text-white transition-transform group-hover:scale-110"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8.1,13.34L3.91,9.16C2.35,7.59 2.35,5.06 3.91,3.5L10.93,10.5L8.1,13.34M22.91,3.5C21.34,1.93 18.81,1.93 17.25,3.5L13.07,7.69L16.9,11.5L22.91,5.5C24.47,3.94 24.47,1.41 22.91,3.5M3.91,16.16L10.93,23.18L13.76,20.34L6.74,13.32L3.91,16.16M20.07,15.93L17.24,13.1L13.07,17.27L15.9,20.1L20.07,15.93Z" />
              </svg>
              <span className="text-white ml-4 text-lg font-semibold">Menú</span>
            </Link>

            {/* Icono de Alacena */}
            <Link
              href="/alacena"
              className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 hover:bg-blue-700 hover:scale-105 transform group animate-fade-in"
            >
              <svg
                className="w-6 h-6 text-white transition-transform group-hover:scale-110"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
              </svg>
              <span className="text-white ml-4 text-lg font-semibold">Alacena</span>
            </Link>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4">
              <button
                onClick={toggleMobileMenu}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Finanzas</h1>
              <div className="flex items-center space-x-2">
                <NotificationButton />
                <ThemeToggle />
                <ProfileDropdown user={user} />
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block">
              {/* Navbar */}
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center space-x-4 flex-1">
                  <button
                    onClick={toggleSidebar}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    title="Ocultar/Mostrar menú"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 6h16M4 12h16M4 18h16"
                      ></path>
                    </svg>
                  </button>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gestión Financiera</h1>
                </div>
                <div className="flex items-center space-x-4">
                  <NotificationButton />
                  <ThemeToggle />
                  <ProfileDropdown user={user} />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
            <div className="max-w-7xl mx-auto">
              {/* Expense Statistics */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-fade-in transition-colors duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-2xl font-bold text-gray-800 dark:text-white">Estadísticas de Gastos</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={toggleViewMode}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                        viewMode === "individual"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {viewMode === "individual" ? "Vista Individual" : "Vista del Hogar"}
                    </button>
                  </div>
                </div>

                {/* Expense/Income Entry Form */}
                <form onSubmit={handleAddEntry} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <h5 className="text-lg font-semibold text-gray-800 dark:text-white">Agregar</h5>
                    <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                      <button
                        type="button"
                        onClick={() => setEntryType("gasto")}
                        className={`px-4 py-2 text-sm font-medium ${entryType === "gasto" ? "bg-red-600 text-white" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                      >
                        Gasto
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntryType("ingreso")}
                        className={`px-4 py-2 text-sm font-medium ${entryType === "ingreso" ? "bg-green-600 text-white" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                      >
                        Ingreso
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fecha</label>
                      <input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monto ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className={`w-full text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 transform ${entryType === "ingreso" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                </form>

                {/* Monthly Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <h6 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Gastos del mes</h6>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">${monthlyTotal.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <h6 className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">Ingresos del mes</h6>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">${monthlyIncome.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-1">
                      <h6 className="text-sm font-medium text-green-800 dark:text-green-300">
                        Ahorro Estimado (Presupuesto: ${monthlyBudget.toFixed(2)})
                      </h6>
                      {!isEditingBudget && (
                        <button
                          onClick={() => {
                            setIsEditingBudget(true)
                            setBudgetInput(monthlyBudget.toString())
                          }}
                          className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          title="Editar presupuesto"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            ></path>
                          </svg>
                        </button>
                      )}
                    </div>
                    {isEditingBudget ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600 dark:text-green-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={budgetInput}
                          onChange={(e) => setBudgetInput(e.target.value)}
                          className="flex-1 px-2 py-1 border border-green-300 dark:border-green-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveBudget}
                          className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          title="Guardar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M5 13l4 4L19 7"
                            ></path>
                          </svg>
                        </button>
                        <button
                          onClick={handleCancelBudgetEdit}
                          className="p-1 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          title="Cancelar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            ></path>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ${estimatedSavings.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Expense Chart */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h6 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {chartViewMode === "chart" ? "Evolución de Gastos Diarios" : "Calendario de Gastos"}
                    </h6>
                    <div className="flex bg-gray-200 dark:bg-gray-600 rounded-lg p-1">
                      <button
                        onClick={() => setChartViewMode("chart")}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                          chartViewMode === "chart"
                            ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        Gráfico
                      </button>
                      <button
                        onClick={() => setChartViewMode("calendar")}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                          chartViewMode === "calendar"
                            ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        Calendario
                      </button>
                    </div>
                  </div>
                  {chartViewMode === "chart" ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip
                            formatter={(value) => [`$${value}`, "Monto"]}
                            labelStyle={{ color: "#374151" }}
                            contentStyle={{
                              backgroundColor: "#f9fafb",
                              border: "1px solid #d1d5db",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar dataKey="monto" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <ExpenseCalendar
                      expenses={expenses}
                      ingresos={ingresos}
                      onDeleteExpense={handleDeleteEntry}
                      onEditExpense={handleEditEntry}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

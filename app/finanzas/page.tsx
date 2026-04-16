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
        monto: dailyIngresos[day] - dailyGastos[day], // Ingresos positivos, gastos negativos
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
            <div className="flex items-center space-x-2 animate-fade-in">
              <img
                src="https://cdn.discordapp.com/attachments/416734955440308244/1412109067308110126/homeapp-logo.png?ex=69e10b8d&is=69dfba0d&hm=ac1b6ace8c064e513f3a9d59aaba998e65852b9f78df1c57fbcd2c6d486ea9d5&"
                alt="HomeApp"
                className="h-10 w-auto drop-shadow-md"
              />
              <span className="text-2xl lg:text-3xl font-bold text-white">HomeApp</span>
            </div>
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
                  d="M12 8c1.657 0 3 .895 3 2s-1.343 2-3 2-3 .895-3 2 1.343 2 3 2m0-8c-1.11 0-2.08.402-2.599 1M12 8V7m0 1v8m0 0v1m0-1c1.11 0 2.08-.402 2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                ></path>
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
                stroke="white" 
                strokeWidth="2.2118399999999996"
                viewBox="0 0 120 120"
                >
                
                <path d="M97.34,0.74c0.86-0.93,2.3-0.99,3.23-0.13c0.93,0.86,0.99,2.3,0.13,3.23L81.98,24.1l-0.03,0.04 c-2.29,2.77-3.86,5.33-4.56,7.67c-0.62,2.07-0.53,3.95,0.39,5.59c0.49,0.88,0.33,1.96-0.32,2.67l0,0l-8.89,9.62 c-0.87-0.95-1.56-1.72-2.02-2.22c-0.21-0.28-0.45-0.55-0.7-0.81l-0.02,0.02c-0.12-0.13-0.25-0.25-0.38-0.37l7.6-8.23 c-0.89-2.38-0.88-4.91-0.06-7.6c0.88-2.92,2.75-6.03,5.44-9.27c0.06-0.08,0.11-0.16,0.18-0.23L97.32,0.72L97.34,0.74L97.34,0.74z M57.13,55.01c-0.84-0.94-0.76-2.39,0.18-3.23c0.94-0.84,2.39-0.76,3.23,0.18c9.41,10.54,38.5,41.73,46.56,53.39 c10.63,15.05-5.83,19.79-11.29,14.31c-13.64-13.19-42.6-46.82-55.33-61.08c-4.58,1.94-9.03,2.24-13.5,0.96 c-4.81-1.37-9.52-4.58-14.3-9.51l-0.06-0.06c-3.64-3.84-6.49-7.63-8.55-11.38c-2.11-3.86-3.4-7.68-3.86-11.47 c-0.49-4.08-0.11-7.88,0.99-11.25c1.29-3.96,3.58-7.31,6.58-9.8c3.02-2.5,6.73-4.12,10.87-4.62c3.44-0.41,7.19-0.06,11.07,1.21 c5.37,1.75,11.63,6.1,16.82,11.68c3.83,4.11,7.11,8.92,9.06,13.87c2.03,5.16,2.65,10.5,1.02,15.5c-0.96,2.96-2.7,5.74-5.4,8.25 c-0.93,0.86-2.37,0.8-3.23-0.12c-0.86-0.93-0.8-2.37,0.12-3.23c2.09-1.95,3.43-4.08,4.16-6.33c1.26-3.87,0.73-8.16-0.93-12.38 c-1.74-4.42-4.69-8.74-8.15-12.45c-4.68-5.02-10.23-8.91-14.91-10.44c-3.21-1.04-6.28-1.34-9.09-1c-3.26,0.4-6.18,1.65-8.51,3.6 c-2.34,1.95-4.13,4.58-5.16,7.71c-0.89,2.73-1.2,5.87-0.79,9.26c0.39,3.2,1.5,6.47,3.32,9.81c1.91,3.43,4.53,6.9,7.9,10.45 l0.02,0.03c4.22,4.35,8.27,7.15,12.28,8.29c3.79,1.08,7.65,0.66,11.68-1.35c0.92-0.53,2.11-0.35,2.84,0.47 c12.42,13.91,42.63,48.92,56.01,61.89c5.81,2.37,9.03-0.55,6.25-5.7C100.7,102.43,63.5,62.17,57.13,55.01L57.13,55.01L57.13,55.01z M45.07,75.12l-29.16,31.55c-0.06,0.06-0.11,0.12-0.18,0.18c-4.26,4.6,3.28,11.3,7.96,6.82l28.32-30.65l3.04,3.45l-28.1,30.41l0,0 c-0.06,0.07-0.12,0.13-0.2,0.2c-1.68,1.41-3.37,2.33-5.08,2.71c-1.76,0.4-3.49,0.22-5.15-0.56c-0.28-0.11-0.54-0.25-0.77-0.46 l-4.03-3.73l0,0c-0.06-0.06-0.12-0.11-0.18-0.18c-1.56-1.8-2.3-3.72-2.1-5.75c0.19-1.92,1.21-3.79,3.14-5.59l29.44-31.86 L45.07,75.12L45.07,75.12z M75.63,57.46l1.73-1.87c0.86-0.93,2.31-0.99,3.23-0.13s0.99,2.3,0.13,3.23l-2,2.16L75.63,57.46 L75.63,57.46z M104.45,7.43c0.86-0.93,2.3-0.99,3.23-0.13c0.93,0.86,0.99,2.3,0.13,3.23L91.4,28.3c-0.86,0.93-2.3,0.99-3.23,0.13 c-0.93-0.86-0.99-2.3-0.13-3.23L104.45,7.43L104.45,7.43L104.45,7.43z M111.55,14c0.86-0.93,2.3-0.99,3.23-0.13 c0.93,0.86,0.99,2.3,0.13,3.23L98.51,34.86c-0.86,0.93-2.3,0.99-3.23,0.13c-0.93-0.86-0.99-2.3-0.13-3.23L111.55,14L111.55,14 L111.55,14z M118.91,20.83c0.86-0.93,2.3-0.99,3.23-0.13c0.93,0.86,0.99,2.31,0.13,3.23L103.55,44.2c-0.07,0.07-0.14,0.13-0.21,0.2 c-4.26,4.1-8.33,6.47-12.22,7.14c-4.22,0.73-8.09-0.47-11.64-3.57c-0.95-0.83-1.04-2.28-0.22-3.22c0.83-0.95,2.28-1.04,3.22-0.22 c2.45,2.14,5.07,2.98,7.84,2.49c2.98-0.51,6.26-2.48,9.84-5.93l0.02-0.02l18.71-20.25L118.91,20.83L118.91,20.83z" />
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
                <path d="M22,1H2A1,1,0,0,0,1,2V22a1,1,0,0,0,1,1H22a1,1,0,0,0,1-1V2A1,1,0,0,0,22,1ZM19,9.667h2v4.666H19Zm2-2H19V3h2Zm-4,7.666V17H11V3h6ZM3,3H9V17H3ZM3,19H17v2H3Zm18,2H19V16.333h2ZM8,9v2a1,1,0,0,1-2,0V9A1,1,0,0,1,8,9Zm4,2V9a1,1,0,0,1,2,0v2a1,1,0,0,1-2,0Z" />
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
                     <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                    d="M12 8c1.657 0 3 .895 3 2s-1.343 2-3 2-3 .895-3 2 1.343 2 3 2m0-8c-1.11 0-2.08.402-2.599 1M12 8V7m0 1v8m0 0v1m0-1c1.11 0 2.08-.402 2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
              </svg>
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

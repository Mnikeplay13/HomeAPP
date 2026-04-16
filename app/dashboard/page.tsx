"use client" // Componente de cliente para usar hooks de React

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ThemeToggle from "@/components/theme-toggle" // Componente para cambiar tema claro/oscuro
import NotificationButton from "@/components/notification-button" // Sistema de notificaciones
import ProfileDropdown from "@/components/profile-dropdown" // Menú de perfil de usuario
import ReportGenerator from "@/components/report-generator" // Generador de reportes PDF
import NotificationCenter from "@/components/notification-center" // Centro de notificaciones centralizado
import { useCentralNotifications } from "@/hooks/useCentralNotifications"
import { getImageUrl, handleImageError } from "@/lib/image-utils"

// Interface para definir estructura de datos del usuario
interface User {
  _id: string
  name: string
  email: string
  profileImage?: string
  createdAt: string
}

// Interface para productos del inventario (alacena)
interface Product {
  _id: string
  name: string
  category: string
  quantity: number
  unit: string
  expirationDate: string
  purchaseDate: string
  location: string
  notes?: string
  image?: string
  householdId: string
  createdAt: string
  updatedAt: string
}

// Interface para tareas del hogar
interface Task {
  _id: string
  title: string
  description: string
  status: "pending" | "completed" | "overdue" // Estados posibles de la tarea
  priority: "high" | "medium" | "low" // Niveles de prioridad
  category: string
  dueDate: string
  assignedTo: {
    _id: string
    name: string
    email: string
  }
  createdBy: {
    _id: string
    name: string
    email: string
  }
  createdAt: string
}

// Interface para notificaciones del sistema
interface Notification {
  data: any
  _id: string
  type: string
  title: string
  message: string
  read: boolean // Indica si la notificación fue leída
  createdAt: string
}

// Componente principal del Dashboard - Panel de control central
export default function DashboardPage() {
  // Estados principales del componente
  const [user, setUser] = useState<User | null>(null) // Datos del usuario actual
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null) // ID del hogar activo
  const [loading, setLoading] = useState(true) // Estado de carga inicial
  const [sidebarHidden, setSidebarHidden] = useState(false) // Control de sidebar
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // Menú móvil
  
  // Estados para datos del dashboard
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]) // Productos con stock bajo
  const [expiredProducts, setExpiredProducts] = useState<Product[]>([]) // Productos vencidos
  const [userTasks, setUserTasks] = useState<Task[]>([]) // Tareas del usuario
  
  // Estados para UI
  const [loadingAlerts, setLoadingAlerts] = useState(true) // Carga de alertas
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false) // Panel de alertas
  const [reportModalOpen, setReportModalOpen] = useState(false) // Modal de reportes
  
  // Hook centralizado de notificaciones
  const { 
    hasCheckedProducts, 
    fetchAndShowNotifications,
    notifications: centralNotifications,
    clearAll,
    unreadCount
  } = useCentralNotifications()
  
  const router = useRouter()

  // Función optimizada con cache para calcular estado de productos
  const calculateProductStatus = (() => {
    const cache = new Map<string, "ok" | "low" | "expiring" | "expired">()

    return (product: Product): "ok" | "low" | "expiring" | "expired" => {
      // Usar cache para evitar cálculos repetidos
      if (cache.has(product._id)) {
        return cache.get(product._id)!
      }

      let status: "ok" | "low" | "expiring" | "expired" = "ok"

      // Prioridad 1: Verificar vencimiento (más crítico)
      if (product.expirationDate) {
        const now = new Date()
        const expiry = new Date(product.expirationDate)
        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntilExpiry < 0) {
          status = "expired" // Producto vencido
        } else if (daysUntilExpiry <= 3) {
          status = "expiring" // Por vencer (3 días o menos)
        }
      }

      // Check stock by comparing with threshold values
      if (status === "ok") {
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
          status = "low"
        }
      }

      cache.set(product._id, status)
      return status
    }
  })()

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
      setActiveHouseholdId(localStorage.getItem("activeHouseholdId"))
      loadAlerts(parsedUser._id)
      
      // Cargar notificaciones desde API y mostrarlas
      fetchAndShowNotifications()
    } catch (error) {
      console.error("Error parsing user data:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }, [router])

  const loadAlerts = async (userId: string) => {
    setLoadingAlerts(true)
    try {
      // Load products from alacena
      const token = localStorage.getItem("token")
      const productsResponse = await fetch("/api/products", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        const products = productsData.products || []
        console.log("Productos recibidos:", products) // <-- Agrega esto

        // Filter expired and low stock products
        const expired = products.filter((product: Product) => calculateProductStatus(product) === "expired")
        const lowStock = products.filter((product: Product) => calculateProductStatus(product) === "low")

        setExpiredProducts(expired)
        setLowStockProducts(lowStock)
      }

      // Load user's pending tasks
      const tasksResponse = await fetch("/api/tasks", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        const pendingUserTasks = tasksData.tasks.filter(
          (task: Task) => task.assignedTo._id === userId && task.status === "pending",
        )
        setUserTasks(pendingUserTasks)
      }

      const notificationsResponse = await fetch("/api/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json()
        // Las notificaciones se manejan en el hook centralizado
        console.log('Notificaciones cargadas:', notificationsData.notifications?.length || 0)
      }
    } catch (error) {
      console.error("Error loading alerts:", error)
    } finally {
      setLoadingAlerts(false)
    }
  }

  const clearNotifications = async () => {
    setNotifications([]) // Limpia en el frontend
    const token = localStorage.getItem("token")
    await fetch("/api/notifications/clear", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  const productAlerts = (centralNotifications ?? []).filter(
    n => n.type === "product-low-stock" || n.type === "product-expiring"
  )

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const formatTaskDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Hoy"
    if (diffDays === 1) return "Mañana"
    if (diffDays === -1) return "Ayer"
    if (diffDays < 0) return `Hace ${Math.abs(diffDays)} días`
    return `En ${diffDays} días`
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
              className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 bg-blue-700 hover:scale-105 transform group animate-fade-in"
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <span className="text-white ml-4 text-lg font-semibold">Finanzas</span>
            </Link>

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

            {/* Configuración del grupo */}
            {activeHouseholdId && (
              <Link
                href={`/household-settings/${activeHouseholdId}`}
                className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 hover:bg-blue-700 hover:scale-105 transform group animate-fade-in"
              >
                            <svg
                className="w-6 h-6 text-white transition-transform group-hover:scale-110"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
              </svg>
                <span className="text-white ml-4 text-lg font-semibold">Configuración del grupo</span>
              </Link>
            )}

                      </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 shadow-xl border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
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
              <div className="flex items-center space-x-2">
                <img
                  src="https://cdn.discordapp.com/attachments/416734955440308244/1412109067308110126/homeapp-logo.png?ex=69e10b8d&is=69dfba0d&hm=ac1b6ace8c064e513f3a9d59aaba998e65852b9f78df1c57fbcd2c6d486ea9d5&"
                  alt="HomeApp"
                  className="h-8 w-auto"
                />
                <span className="text-xl font-bold text-gray-800 dark:text-white">HomeApp</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAlertsPanelOpen(!alertsPanelOpen)}
                    className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    title="Alertas"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {(expiredProducts.length > 0 || lowStockProducts.length > 0 || userTasks.length > 0) && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-4.5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                        {expiredProducts.length + lowStockProducts.length + userTasks.length}
                      </span>
                    )}
                  </button>
                  {alertsPanelOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAlertsPanelOpen(false)} />
                      <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-80 overflow-y-auto p-3">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Alertas</h3>
                        {expiredProducts.length > 0 && (
                          <p className="text-sm text-red-600 dark:text-red-400">{expiredProducts.length} producto(s) vencido(s)</p>
                        )}
                        {lowStockProducts.length > 0 && (
                          <p className="text-sm text-yellow-600 dark:text-yellow-400">{lowStockProducts.length} con stock bajo</p>
                        )}
                        {userTasks.length > 0 && (
                          <p className="text-sm text-blue-600 dark:text-blue-400">{userTasks.length} tarea(s) pendiente(s)</p>
                        )}
                        {expiredProducts.length === 0 && lowStockProducts.length === 0 && userTasks.length === 0 && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Sin alertas</p>
                        )}
                        <Link href="/alacena" className="text-xs text-blue-600 dark:text-blue-400 mt-2 block">Ver alacena</Link>
                        <Link href="/todo" className="text-xs text-blue-600 dark:text-blue-400 block">Ver tareas</Link>
                      </div>
                    </>
                  )}
                </div>
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
                    onClick={() => setSidebarHidden(!sidebarHidden)}
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
                  <div className="relative flex-1 max-w-md">
                  </div>
                </div>
              <div className="flex items-center space-x-4">
                  {/* Alertas Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setAlertsPanelOpen(!alertsPanelOpen)}
                      className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                      title="Alertas"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {(expiredProducts.length > 0 || lowStockProducts.length > 0 || userTasks.length > 0) && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-4.5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                          {expiredProducts.length + lowStockProducts.length + userTasks.length}
                        </span>
                      )}
                    </button>
                    {alertsPanelOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setAlertsPanelOpen(false)} />
                        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-80 overflow-y-auto p-3">
                          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Alertas</h3>
                          {expiredProducts.length > 0 && (
                            <p className="text-sm text-red-600 dark:text-red-400">{expiredProducts.length} producto(s) vencido(s)</p>
                          )}
                          {lowStockProducts.length > 0 && (
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">{lowStockProducts.length} con stock bajo</p>
                          )}
                          {userTasks.length > 0 && (
                            <p className="text-sm text-blue-600 dark:text-blue-400">{userTasks.length} tarea(s) pendiente(s)</p>
                          )}
                          {expiredProducts.length === 0 && lowStockProducts.length === 0 && userTasks.length === 0 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Sin alertas</p>
                          )}
                          <Link href="/alacena" className="text-xs text-blue-600 dark:text-blue-400 mt-2 block">Ver alacena</Link>
                          <Link href="/todo" className="text-xs text-blue-600 dark:text-blue-400 block">Ver tareas</Link>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Notificaciones Button */}
                  <NotificationButton />
                  
                  {/* Theme Toggle */}
                  <ThemeToggle />
                  
                  {/* Profile Dropdown */}
                  <ProfileDropdown user={user} />
                </div>
              </div>

              {/* Welcome Section */}
              <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition-colors duration-300">
                <div className="flex items-center space-x-4">
                  <img
                    src={getImageUrl(user?.profileImage)}
                    alt="Profile Picture"
                    className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-600 shadow-sm"
                    onError={(e) => handleImageError(e)}
                  />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Hola,</p>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {user.name} ({user.email})
                    </h3>
                  </div>
                </div>
                <div className="hidden md:flex items-center space-x-6">
                  <div className="flex space-x-4 text-sm">
                    <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      Vencidos: {expiredProducts.length}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                      Stock bajo: {lowStockProducts.length}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      Tareas: {userTasks.length}
                    </span>
                  </div>
                  <Link
                    href="/select-household"
                    className="shadow-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-105 transform"
                  >
                    Inicio
                  </Link>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
              <div className="max-w-7xl mx-auto space-y-6">
                {/* Page Title + Limpiar notificaciones */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                  <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Panel de Alertas</h1>
                    <p className="text-gray-600 dark:text-gray-400">Información importante de tu hogar</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setReportModalOpen(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v2a2 2 0 002 2h6a2 2 0 002-2v-2M9 17H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M9 17l6-6m-6 6l6 6" />
                      </svg>
                      Generar Reporte PDF
                    </button>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                    >
                      Limpiar notificaciones
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('🧪 Enviando notificación de prueba...')
                        fetchAndShowNotifications()
                      }}
                      className="px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      Probar Notificación
                    </button>
                  </div>
                </div>

                {loadingAlerts ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    {/* Alacena Status Alert */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 animate-fade-in transition-colors duration-300">
                      <div className="flex items-center mb-4">
                        <div
                          className={`p-3 rounded-full ${
                            expiredProducts.length > 0 || lowStockProducts.length > 0
                              ? "bg-red-100 dark:bg-red-900/20"
                              : "bg-green-100 dark:bg-green-900/20"
                          }`}
                        >
                          <svg
                            className={`w-6 h-6 ${
                              expiredProducts.length > 0 || lowStockProducts.length > 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            ></path>
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Estado de la Alacena</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {expiredProducts.length > 0 || lowStockProducts.length > 0
                              ? `${expiredProducts.length} vencido${expiredProducts.length !== 1 ? "s" : ""}, ${lowStockProducts.length} con stock bajo`
                              : "Todos los productos están en buen estado"}
                          </p>
                        </div>
                      </div>

                      {expiredProducts.length > 0 || lowStockProducts.length > 0 ? (
                        <div className="space-y-3">
                          {expiredProducts.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
                              <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">Productos Vencidos:</h4>
                              <div className="space-y-2">
                                {expiredProducts.slice(0, 3).map((product) => (
                                  <div key={product._id} className="flex justify-between items-center text-sm">
                                    <span className="text-red-700 dark:text-red-300">{product.name}</span>
                                    <span className="text-red-600 dark:text-red-400 font-medium">Vencido</span>
                                  </div>
                                ))}
                                {expiredProducts.length > 3 && (
                                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                                    Y {expiredProducts.length - 3} producto{expiredProducts.length - 3 > 1 ? "s" : ""}{" "}
                                    más...
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {lowStockProducts.length > 0 && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                              <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                                Productos con Stock Bajo:
                              </h4>
                              <div className="space-y-2">
                                {lowStockProducts.slice(0, 3).map((product) => (
                                  <div key={product._id} className="flex justify-between items-center text-sm">
                                    <span className="text-yellow-700 dark:text-yellow-300">{product.name}</span>
                                    <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                                      {product.quantity} {product.unit}
                                    </span>
                                  </div>
                                ))}
                                {lowStockProducts.length > 3 && (
                                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                                    Y {lowStockProducts.length - 3} producto{lowStockProducts.length - 3 > 1 ? "s" : ""}{" "}
                                    más...
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          <Link
                            href="/alacena"
                            className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                          >
                            Ver alacena completa
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 5l7 7-7 7"
                              ></path>
                            </svg>
                          </Link>
                        </div>
                      ) : (
                        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <p className="text-green-800 dark:text-green-300 text-sm">
                            ¡Excelente! Todos los productos en tu alacena están en buen estado.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Pending Tasks Alert */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 animate-fade-in transition-colors duration-300">
                      <div className="flex items-center mb-4">
                        <div
                          className={`p-3 rounded-full ${userTasks.length > 0 ? "bg-orange-100 dark:bg-orange-900/20" : "bg-green-100 dark:bg-green-900/20"}`}
                        >
                          <svg
                            className={`w-6 h-6 ${userTasks.length > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                            ></path>
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Mis Tareas Pendientes</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {userTasks.length > 0
                              ? `Tienes ${userTasks.length} tarea${userTasks.length > 1 ? "s" : ""} pendiente${userTasks.length > 1 ? "s" : ""}`
                              : "No tienes tareas pendientes"}
                          </p>
                        </div>
                      </div>

                      {userTasks.length > 0 ? (
                        <div className="space-y-3">
                          <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                            <h4 className="font-medium text-orange-800 dark:text-orange-300 mb-2">Tareas Asignadas:</h4>
                            <div className="space-y-3">
                              {userTasks.slice(0, 3).map((task) => (
                                <div
                                  key={task._id}
                                  className="border-l-2 border-orange-300 dark:border-orange-600 pl-3"
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <h5 className="font-medium text-orange-800 dark:text-orange-300 text-sm">
                                        {task.title}
                                      </h5>
                                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                        {task.description.length > 50
                                          ? `${task.description.substring(0, 50)}...`
                                          : task.description}
                                      </p>
                                    </div>
                                    <div className="ml-2 text-right">
                                      <span
                                        className={`inline-block px-2 py-1 text-xs rounded-full ${
                                          task.priority === "high"
                                            ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                                            : task.priority === "medium"
                                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                                              : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                                        }`}
                                      >
                                        {task.priority === "high"
                                          ? "Alta"
                                          : task.priority === "medium"
                                            ? "Media"
                                            : "Baja"}
                                      </span>
                                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                        {formatTaskDate(task.dueDate)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {userTasks.length > 3 && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                  Y {userTasks.length - 3} tarea{userTasks.length - 3 > 1 ? "s" : ""} más...
                                </p>
                              )}
                            </div>
                          </div>
                          <Link
                            href="/todo"
                            className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                          >
                            Ver todas las tareas
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 5l7 7-7 7"
                              ></path>
                            </svg>
                          </Link>
                        </div>
                      ) : (
                        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <p className="text-green-800 dark:text-green-300 text-sm">
                            ¡Perfecto! No tienes tareas pendientes en este momento.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Notifications Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 animate-fade-in transition-colors duration-300">
                      <div className="flex items-center mb-4 justify-between">
                        <div className="flex items-center">
                          <div
                            className={`p-3 rounded-full ${centralNotifications.filter((n) => !n.read).length > 0 ? "bg-blue-100 dark:bg-blue-900/20" : "bg-gray-100 dark:bg-gray-700"}`}
                          >
                            <svg
                              className={`w-6 h-6 ${centralNotifications.filter((n) => !n.read).length > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                              ></path>
                            </svg>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Notificaciones</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {centralNotifications.filter((n) => !n.read).length > 0
                                ? `${centralNotifications.filter((n) => !n.read).length} sin leer`
                                : "No hay notificaciones nuevas"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={clearAll}
                          className="text-xs text-red-600 dark:text-red-400 hover:underline ml-2"
                          title="Limpiar notificaciones"
                        >
                          Limpiar
                        </button>
                      </div>

                      {centralNotifications.length > 0 ? (
                        <div className="space-y-3">
                          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                            <div className="space-y-3">
                              {centralNotifications.slice(0, 5).map((notification) => (
                                <div
                                  key={notification._id}
                                  className={`border-l-2 ${
                                    !notification.read
                                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                      : "border-gray-300 dark:border-gray-600"
                                  } pl-3 py-2`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h5 className="font-medium text-blue-800 dark:text-blue-300 text-sm">
                                        {notification.title}
                                      </h5>
                                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        {notification.message}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                        {new Date(notification.createdAt || Date.now()).toLocaleDateString("es-ES", {
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                    </div>
                                    {!notification.read && (
                                      <span className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {centralNotifications.length > 5 && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center">
                                  Y {centralNotifications.length - 5} notificación{centralNotifications.length - 5 > 1 ? "es" : ""}{" "}
                                  más...
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                          <p className="text-gray-600 dark:text-gray-400 text-sm text-center">
                            No tienes notificaciones en este momento.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(centralNotifications.filter(n => n.type === "product-low-stock" || n.type === "product-expiring")).length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 animate-fade-in transition-colors duration-300">
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-4 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-1.414 1.414A9 9 0 105.636 18.364l1.414-1.414A7 7 0 1116.95 7.05l1.414-1.414z" />
                      </svg>
                      Alertas
                    </h3>
                    <div className="space-y-3">
                      {centralNotifications.filter(n => n.type === "product-low-stock" || n.type === "product-expiring").slice(0, 5).map(alert => (
                        <div
                          key={alert._id}
                          className={`border-l-4 ${
                            alert.type === "product-low-stock"
                              ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10"
                              : "border-red-500 bg-red-50 dark:bg-red-900/10"
                          } p-3`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">
                              {alert.type === "product-low-stock" && (
                                <>Stock bajo: <span className="font-bold">{alert.title}</span></>
                              )}
                              {alert.type === "product-expiring" && (
                                <>{alert.title || "Producto próximo a vencer"}</>
                              )}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(alert.createdAt || Date.now()).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {alert.message && (
                            <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">{alert.message}</div>
                          )}
                        </div>
                      ))}
                      {(centralNotifications.filter(n => n.type === "product-low-stock" || n.type === "product-expiring")).length > 5 && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-center">
                          Y {(centralNotifications.filter(n => n.type === "product-low-stock" || n.type === "product-expiring")).length - 5} alerta{(centralNotifications.filter(n => n.type === "product-low-stock" || n.type === "product-expiring")).length - 5 > 1 ? "s" : ""} más...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 animate-fade-in transition-colors duration-300">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Acciones Rápidas</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link
                      href="/alacena"
                      className="border border-2 border-solid border-blue-900/20 flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <svg
                        className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        ></path>
                      </svg>
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Alacena</span>
                    </Link>
                    <Link
                      href="/todo"
                      className="border border-2 border-solid border-green-900/20 flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                    >
                      <svg
                        className="w-8 h-8 text-green-600 dark:text-green-400 mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        ></path>
                      </svg>
                      <span className="text-sm font-medium text-green-800 dark:text-green-300">Tareas</span>
                    </Link>
                    <Link
                      href="/finanzas"
                      className="border border-2 border-solid border-purple-900/20 flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                    >
                      <svg
                        className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      <span className="text-sm font-medium text-purple-800 dark:text-purple-300">Finanzas</span>
                    </Link>
                    <Link
                      href="/menu"
                      className="border border-2 border-solid border-orange-900/20 flex flex-col items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                    >
                      <svg
                        className="w-8 h-8 text-orange-600 dark:text-orange-400 mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                        ></path>
                      </svg>
                      <span className="text-sm font-medium text-orange-800 dark:text-orange-300">Menú</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Generator Modal */}
      <ReportGenerator 
        isOpen={reportModalOpen} 
        onClose={() => setReportModalOpen(false)} 
      />
    </div>
  )
}

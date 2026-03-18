"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { User } from "@/lib/models/User"
import HouseholdMember from "@/lib/models/Household"
import { useNotifications } from "@/hooks/useNotifications"
import NotificationButton from "@/components/notification-button"
import ProfileDropdown from "@/components/profile-dropdown"
import ThemeToggle from "@/components/theme-toggle"

interface User {
  _id: string
  name: string
  email: string
  profileImage?: string
  createdAt: string
}

interface HouseholdMember {
  _id: string
  name: string
  email: string
  profileImage?: string
}

interface Task {
  _id: string
  title: string
  description: string
  status: "pending" | "completed" | "overdue"
  priority: "high" | "medium" | "low"
  category: string
  dueDate: string
  assignedTo: string | HouseholdMember // API puede devolver string u objeto
  createdBy: HouseholdMember
  createdAt: string
  householdId: string
}

const getAssignedToName = (assignedTo: string | HouseholdMember, householdMembers: HouseholdMember[]): string => {
  if (!assignedTo) return 'Sin asignar'
  
  // Si es un objeto HouseholdMember, devolver su nombre directamente
  if (typeof assignedTo === 'object' && assignedTo.name) {
    return assignedTo.name
  }
  
  // Si es un string (ID), buscar en los miembros del hogar
  if (typeof assignedTo === 'string') {
    const member = householdMembers.find(m => m._id === assignedTo)
    return member?.name || assignedTo || 'Sin asignar'
  }
  
  return 'Sin asignar'
}

export default function TodoPage() {
  const { showTaskNotification } = useNotifications()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([])
  const [filterStatus, setFilterStatus] = useState("")
  const [filterPriority, setFilterPriority] = useState("")
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    category: "casa",
    dueDate: "",
    assignedTo: "", // Now stores the name directly as text
  })
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
      fetchTasks()
      fetchHouseholdMembers()
    } catch (error) {
      console.error("Error parsing user data:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }, [router])

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/tasks", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks)
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    }
  }

  const fetchHouseholdMembers = async () => {
    try {
      const token = localStorage.getItem("token")
      const activeHouseholdId = localStorage.getItem("activeHouseholdId")

      console.log("[v0] Fetching household members for:", activeHouseholdId)

      if (!activeHouseholdId) {
        console.log("[v0] No active household found")
        return
      }

      const response = await fetch("/api/households", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Households data received:", data)

        const activeHousehold = data.households.find((h: any) => h._id === activeHouseholdId)

        if (activeHousehold && activeHousehold.members) {
          console.log("[v0] Found household members:", activeHousehold.members)
          setHouseholdMembers(activeHousehold.members)
        } else {
          console.log("[v0] No members found in active household, using current user")
          if (user) {
            setHouseholdMembers([
              {
                _id: user._id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
              },
            ])
          }
        }
      } else {
        console.error("[v0] Failed to fetch households:", response.status)
      }
    } catch (error) {
      console.error("Error fetching household members:", error)
      if (user) {
        setHouseholdMembers([
          {
            _id: user._id,
            name: user.name,
            email: user.email,
            profileImage: user.profileImage,
          },
        ])
      }
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newTask.title || !newTask.description || !newTask.dueDate) {
      alert("Por favor completa todos los campos requeridos")
      return
    }

    const activeHouseholdId = localStorage.getItem("activeHouseholdId")

    console.log("[v0] Creating task with householdId:", activeHouseholdId)

    if (!activeHouseholdId) {
      alert("No se encontró el hogar activo. Por favor selecciona un hogar primero.")
      return
    }

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newTask,
          householdId: activeHouseholdId, // Include householdId explicitly
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTasks([data.task, ...tasks])
        
        // Enviar notificación si la tarea está asignada a alguien
        if (data.task.assignedTo) {
          const assignedMember = householdMembers.find(m => m._id === data.task.assignedTo)
          if (assignedMember) {
            showTaskNotification(data.task.title, assignedMember.name)
          }
        }
        
        setAddTaskModalOpen(false)
        setNewTask({
          title: "",
          description: "",
          priority: "medium",
          category: "casa",
          dueDate: "",
          assignedTo: "",
        })
      } else {
        const error = await response.json()
        alert(error.error || "Error al crear la tarea")
      }
    } catch (error) {
      console.error("Error creating task:", error)
      alert("Error al crear la tarea")
    }
  }

  const toggleTaskComplete = async (taskId: string) => {
    const task = tasks.find((t) => t._id === taskId)
    if (!task) return

    const newStatus = task.status === "completed" ? "pending" : "completed"

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(tasks.map((t) => (t._id === taskId ? data.task : t)))
      }
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarea?")) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setTasks(tasks.filter((t) => t._id !== taskId))
      }
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (filterStatus && task.status !== filterStatus) return false
    if (filterPriority && task.priority !== filterPriority) return false
    return true
  })

  const formatDate = (dateString: string) => {
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
    <div className="font-roboto min-h-screen bg-gray-50 dark:bg-gray-900">
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
          {/* sidebar header */}
          <div className="flex items-center justify-between p-4 lg:justify-center">
            <div className="flex items-center space-x-2 animate-fade-in">
              <img
                src="https://files.catbox.moe/xhu5ls.png"
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

          <nav className="mt-8 px-4 space-y-2">
            <Link
              href="/dashboard"
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
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m0 0V9a2 2 0 012-2h2a2 2 0 012 2v12m-6 0h6"
                ></path>
              </svg>
              <span className="text-white ml-4 text-lg font-semibold">Inicio</span>
            </Link>
            {/* Icono de finanzas */}
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

            <Link
              href="/todo"
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
                  d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                ></path>
              </svg>
              <span className="text-white ml-4 text-lg font-semibold">Lista de Tareas</span>
            </Link>

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
        <div className="flex-1 lg:ml-0">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Lista de Tareas</h1>
              <div className="flex items-center space-x-2">
                <NotificationButton />
                <ThemeToggle />
                <ProfileDropdown user={user} />
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setSidebarHidden(!sidebarHidden)}
                    className="p-2 text-gray-600 hover:text-gray-900 transition-colors dark:text-gray-300 dark:hover:text-white"
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
                  <div className="flex items-center space-x-3">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      ></path>
                    </svg>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Lista de Tareas</h1>
                  </div>
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
          <div className="p-4 lg:p-8 bg-gray-50 min-h-screen dark:bg-gray-900">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header con filtros */}
              <div className="bg-white rounded-xl shadow-sm p-6 animate-fade-in dark:bg-gray-800">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Mis Tareas</h2>
                  <div className="flex flex-wrap gap-3">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                    >
                      <option value="">Todas las tareas</option>
                      <option value="pending">Pendientes</option>
                      <option value="completed">Completadas</option>
                      <option value="overdue">Vencidas</option>
                    </select>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                    >
                      <option value="">Todas las prioridades</option>
                      <option value="high">Alta</option>
                      <option value="medium">Media</option>
                      <option value="low">Baja</option>
                    </select>
                    <button
                      onClick={() => setAddTaskModalOpen(true)}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 hover:scale-105 transform flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        ></path>
                      </svg>
                      <span className="text-white">Nueva Tarea</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tareas */}
              <div className="space-y-4">
                {filteredTasks.map((task) => (
                  <div
                    key={task._id}
                    className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] transform animate-scale-in dark:bg-gray-800 ${
                      task.status === "completed" ? "opacity-75" : ""
                    }`}
                  >
                    <div className="flex">
                      <div
                        className={`w-2 rounded-l-xl ${
                          task.priority === "high"
                            ? "bg-red-500"
                            : task.priority === "medium"
                              ? "bg-orange-500"
                              : "bg-blue-500"
                        }`}
                      ></div>
                      <div className="flex-1 p-6">
                        <div className="flex items-start space-x-4">
                          <div className="flex items-center mt-1">
                            <input
                              type="checkbox"
                              checked={task.status === "completed"}
                              onChange={() => toggleTaskComplete(task._id)}
                              className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-600 focus:ring-2 transition-all dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex-1 mb-4 lg:mb-0 lg:pr-6">
                                <h3
                                  className={`text-lg font-semibold text-gray-800 mb-2 dark:text-gray-100 ${
                                    task.status === "completed" ? "line-through" : ""
                                  }`}
                                >
                                  {task.title}
                                </h3>
                                <p
                                  className={`text-gray-600 mb-3 dark:text-gray-400 ${
                                    task.status === "completed" ? "line-through" : ""
                                  }`}
                                >
                                  {task.description}
                                </p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  <span
                                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                                      task.status === "completed"
                                        ? "bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100"
                                        : task.priority === "high"
                                          ? "bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100"
                                          : task.priority === "medium"
                                            ? "bg-orange-100 text-orange-800 dark:bg-orange-700 dark:text-orange-100"
                                            : "bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100"
                                    }`}
                                  >
                                    {task.status === "completed"
                                      ? "Completada"
                                      : task.priority === "high"
                                        ? "Prioridad Alta"
                                        : task.priority === "medium"
                                          ? "Prioridad Media"
                                          : "Prioridad Baja"}
                                  </span>
                                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full dark:bg-blue-700 dark:text-blue-100">
                                    {task.category}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-300">
                                  <span>📅 {formatDate(task.dueDate)}</span>
                                  <span>👤 {getAssignedToName(task.assignedTo, householdMembers)}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => deleteTask(task._id)}
                                  className="p-2 hover:bg-red-100 rounded-lg transition-colors group dark:hover:bg-gray-600"
                                >
                                  <svg
                                    className="w-5 h-5 text-gray-600 group-hover:text-red-600 group-hover:scale-110 transition-all dark:text-gray-300 dark:group-hover:text-red-300"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    ></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-full dark:bg-blue-700">
                      <svg
                        className="w-6 h-6 text-blue-600 dark:text-blue-100"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total de Tareas</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{tasks.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-full dark:bg-green-700">
                      <svg
                        className="w-6 h-6 text-green-600 dark:text-green-100"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Completadas</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {tasks.filter((task) => task.status === "completed").length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 dark:bg-gray-800">
                  <div className="flex items-center">
                    <div className="p-3 bg-orange-100 rounded-full dark:bg-orange-700">
                      <svg
                        className="w-6 h-6 text-orange-600 dark:text-orange-100"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pendientes</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {tasks.filter((task) => task.status === "pending").length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para agregar tarea */}
      {addTaskModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in dark:bg-gray-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Nueva Tarea</h3>
                <button
                  onClick={() => setAddTaskModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors dark:text-gray-300 dark:hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Título de la tarea
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Ej: Limpiar la sala"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Descripción</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Describe los detalles de la tarea..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Prioridad</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Fecha límite
                  </label>
                  <input
                    type="datetime-local"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Asignar a (opcional)
                  </label>
                  <select
                    value={newTask.assignedTo || ''}
                    onChange={(e) => {
                      setNewTask({ ...newTask, assignedTo: e.target.value })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                  >
                    <option value="">Sin asignar</option>
                    {householdMembers.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Categoría</label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                  >
                    <option value="casa">Casa</option>
                    <option value="compras">Compras</option>
                    <option value="trabajo">Trabajo</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setAddTaskModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Crear Tarea
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

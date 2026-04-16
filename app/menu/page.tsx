"use client" // Componente de cliente para manejar estado y eventos del menú

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import NotificationButton from "@/components/notification-button" // Sistema de notificaciones
import ProfileDropdown from "@/components/profile-dropdown" // Menú de perfil de usuario
import { ThemeToggle } from "@/components/theme-toggle" // Control de tema claro/oscuro
import type { Menu, DayOfWeek, MealType } from "@/lib/models/Menu" // Tipos del menú

// Componente principal de la página de Menú
export default function MenuPage() {
  // Estados de UI y usuario
  const [sidebarOpen, setSidebarOpen] = useState(false) // Control de sidebar
  const [modalOpen, setModalOpen] = useState(false) // Modal para agregar/editar plato
  const [user, setUser] = useState<any>(null) // Usuario autenticado
  
  // Estados para datos del menú
  const [menus, setMenus] = useState<Menu[]>([]) // Lista completa de platos del menú
  const [loading, setLoading] = useState(true) // Estado de carga inicial
  const [householdId, setHouseholdId] = useState<string | null>(null) // ID del hogar activo
  
  // Estado para formulario de nuevo plato
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10), // Fecha por defecto: hoy
    dayOfWeek: "Lunes" as DayOfWeek, // Día de la semana
    mealType: "Almuerzo" as MealType, // Tipo de comida
    dishName: "", // Nombre del plato
    description: "", // Descripción del plato
    imageUrl: "", // URL de la imagen
    ingredients: [] as string[], // Lista de ingredientes
    ingredientInput: "", // Input para agregar ingredientes
    preparationTime: 0, // Tiempo de preparación (minutos)
    servings: 1, // Porciones
    recipe: "", // Receta detallada
    tags: [] as string[], // Etiquetas (vegano, sin gluten, etc.)
    done: false, // Indica si el plato fue completado
    nutritionalInfo: {
      // Información nutricional
      calories: 0, // Calorías
      protein: 0, // Proteínas (g)
      carbs: 0, // Carbohidratos (g)
      fat: 0, // Grasas (g)
      fiber: 0, // Fibra (g)
    },
  })

  // useEffect para inicializar datos del usuario y hogar
  useEffect(() => {
    const userData = localStorage.getItem("user")
    const activeHouseholdId = localStorage.getItem("activeHouseholdId")

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }

    if (activeHouseholdId) {
      setHouseholdId(activeHouseholdId)
      fetchMenus(activeHouseholdId)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchMenus = async (householdId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/menu?householdId=${householdId}`)
      if (response.ok) {
        const data = await response.json()
        setMenus(data.menus)
      } else {
        console.error("Error fetching menus:", await response.text())
      }
    } catch (error) {
      console.error("Error fetching menus:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddIngredient = () => {
    if (formData.ingredientInput.trim()) {
      setFormData({
        ...formData,
        ingredients: [...formData.ingredients, formData.ingredientInput.trim()],
        ingredientInput: "",
      })
    }
  }

  const handleRemoveIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!householdId) {
      alert("No se encontró el hogar activo")
      return
    }

    if (!formData.dishName.trim()) {
      alert("Por favor ingresa el nombre del plato")
      return
    }

    if (!formData.date) {
      alert("Selecciona una fecha para la comida")
      return
    }

    try {
      const response = await fetch("/api/menu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          householdId: householdId,
          date: formData.date,
          mealType: formData.mealType,
          dishName: formData.dishName,
          description: formData.description,
          imageUrl: formData.imageUrl,
          ingredients: formData.ingredients,
          preparationTime: formData.preparationTime,
          servings: formData.servings,
          recipe: formData.recipe,
          tags: formData.tags,
          nutritionalInfo: formData.nutritionalInfo,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMenus([data.menu, ...menus])
        closeModal()
        // Reset form
        setFormData({
          date: new Date().toISOString().slice(0, 10),
          dayOfWeek: "Lunes",
          mealType: "Almuerzo",
          dishName: "",
          description: "",
          imageUrl: "",
          ingredients: [],
          ingredientInput: "",
          preparationTime: 0,
          servings: 1,
          recipe: "",
          tags: [],
          done: false,
          nutritionalInfo: {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
          },
        })
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error("Error creating menu:", error)
      alert("Error al crear el menú")
    }
  }

  const handleDelete = async (menuId: string) => {
    if (!confirm("¿Estás seguro de eliminar este menú?")) {
      return
    }

    try {
      const response = await fetch(`/api/menu/${menuId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMenus(menus.filter((menu) => menu._id?.toString() !== menuId))
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error("Error deleting menu:", error)
      alert("Error al eliminar el menú")
    }
  }

  const handleTagChange = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }))
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const openModal = () => {
    setModalOpen(true)
    document.body.classList.add("overflow-hidden")
  }

  const closeModal = () => {
    setModalOpen(false)
    document.body.classList.remove("overflow-hidden")
  }

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      Proteína: "bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100",
      Carbohidratos: "bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100",
      Vegetales: "bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100",
      Saludable: "bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100",
      "Bajo en calorías": "bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100",
      Vegetariano: "bg-purple-100 text-purple-800 dark:bg-purple-700 dark:text-purple-100",
      Fibra: "bg-orange-100 text-orange-800 dark:bg-orange-700 dark:text-orange-100",
    }
    return colors[tag] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
  }

  const getDayColor = (day: string) => {
    const colors: Record<string, string> = {
      Lunes: "bg-green-500",
      Martes: "bg-orange-500",
      Miércoles: "bg-orange-500",
      Jueves: "bg-blue-500",
      Viernes: "bg-purple-500",
      Sábado: "bg-pink-500",
      Domingo: "bg-red-500",
    }
    return colors[day] || "bg-gray-500"
  }

  return (
    <div className="font-roboto min-h-screen bg-gray-50 dark:bg-gray-900">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex min-h-screen">
        <div
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-80 bg-blue-500 dark:bg-gray-800 text-white transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-300 ease-in-out`}
        >
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
                {/* Icono de Dashboard */}
          <nav className="mt-8 px-4 space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 hover:bg-blue-600 hover:scale-105 transform group animate-fade-in"
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
              className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 hover:bg-blue-600 hover:scale-105 transform group animate-fade-in"
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
                {/* Icono de tareas */}
            <Link
              href="/todo"
              className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 hover:bg-blue-600 hover:scale-105 transform group animate-fade-in"
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
                {/* Icono de Menú */}
            </Link>

            <div className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 bg-blue-600 hover:scale-105 transform group animate-fade-in">
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
            </div>
                {/* Icono de Alacena */}
            <Link
              href="/alacena"
              className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 hover:bg-blue-600 hover:scale-105 transform group animate-fade-in"
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

        <div className="flex-1 lg:ml-0">
          <div className="bg-white shadow-sm border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="lg:hidden flex items-center justify-between p-4">
              <button
                onClick={toggleSidebar}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
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
              </button>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Planificador de Menús</h1>
              <div className="flex items-center space-x-2">
                <NotificationButton />
                <ThemeToggle />
                <ProfileDropdown user={user} />
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={toggleSidebar}
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
              <svg
                className="w-9 h-9 text-blue-600 transition-transform group-hover:scale-110"
                fill="currentColor"
                stroke="blue-600" 
                strokeWidth="7.2118399999999996"
                viewBox="0 0 120 120"
                >
                
                <path d="M97.34,0.74c0.86-0.93,2.3-0.99,3.23-0.13c0.93,0.86,0.99,2.3,0.13,3.23L81.98,24.1l-0.03,0.04 c-2.29,2.77-3.86,5.33-4.56,7.67c-0.62,2.07-0.53,3.95,0.39,5.59c0.49,0.88,0.33,1.96-0.32,2.67l0,0l-8.89,9.62 c-0.87-0.95-1.56-1.72-2.02-2.22c-0.21-0.28-0.45-0.55-0.7-0.81l-0.02,0.02c-0.12-0.13-0.25-0.25-0.38-0.37l7.6-8.23 c-0.89-2.38-0.88-4.91-0.06-7.6c0.88-2.92,2.75-6.03,5.44-9.27c0.06-0.08,0.11-0.16,0.18-0.23L97.32,0.72L97.34,0.74L97.34,0.74z M57.13,55.01c-0.84-0.94-0.76-2.39,0.18-3.23c0.94-0.84,2.39-0.76,3.23,0.18c9.41,10.54,38.5,41.73,46.56,53.39 c10.63,15.05-5.83,19.79-11.29,14.31c-13.64-13.19-42.6-46.82-55.33-61.08c-4.58,1.94-9.03,2.24-13.5,0.96 c-4.81-1.37-9.52-4.58-14.3-9.51l-0.06-0.06c-3.64-3.84-6.49-7.63-8.55-11.38c-2.11-3.86-3.4-7.68-3.86-11.47 c-0.49-4.08-0.11-7.88,0.99-11.25c1.29-3.96,3.58-7.31,6.58-9.8c3.02-2.5,6.73-4.12,10.87-4.62c3.44-0.41,7.19-0.06,11.07,1.21 c5.37,1.75,11.63,6.1,16.82,11.68c3.83,4.11,7.11,8.92,9.06,13.87c2.03,5.16,2.65,10.5,1.02,15.5c-0.96,2.96-2.7,5.74-5.4,8.25 c-0.93,0.86-2.37,0.8-3.23-0.12c-0.86-0.93-0.8-2.37,0.12-3.23c2.09-1.95,3.43-4.08,4.16-6.33c1.26-3.87,0.73-8.16-0.93-12.38 c-1.74-4.42-4.69-8.74-8.15-12.45c-4.68-5.02-10.23-8.91-14.91-10.44c-3.21-1.04-6.28-1.34-9.09-1c-3.26,0.4-6.18,1.65-8.51,3.6 c-2.34,1.95-4.13,4.58-5.16,7.71c-0.89,2.73-1.2,5.87-0.79,9.26c0.39,3.2,1.5,6.47,3.32,9.81c1.91,3.43,4.53,6.9,7.9,10.45 l0.02,0.03c4.22,4.35,8.27,7.15,12.28,8.29c3.79,1.08,7.65,0.66,11.68-1.35c0.92-0.53,2.11-0.35,2.84,0.47 c12.42,13.91,42.63,48.92,56.01,61.89c5.81,2.37,9.03-0.55,6.25-5.7C100.7,102.43,63.5,62.17,57.13,55.01L57.13,55.01L57.13,55.01z M45.07,75.12l-29.16,31.55c-0.06,0.06-0.11,0.12-0.18,0.18c-4.26,4.6,3.28,11.3,7.96,6.82l28.32-30.65l3.04,3.45l-28.1,30.41l0,0 c-0.06,0.07-0.12,0.13-0.2,0.2c-1.68,1.41-3.37,2.33-5.08,2.71c-1.76,0.4-3.49,0.22-5.15-0.56c-0.28-0.11-0.54-0.25-0.77-0.46 l-4.03-3.73l0,0c-0.06-0.06-0.12-0.11-0.18-0.18c-1.56-1.8-2.3-3.72-2.1-5.75c0.19-1.92,1.21-3.79,3.14-5.59l29.44-31.86 L45.07,75.12L45.07,75.12z M75.63,57.46l1.73-1.87c0.86-0.93,2.31-0.99,3.23-0.13s0.99,2.3,0.13,3.23l-2,2.16L75.63,57.46 L75.63,57.46z M104.45,7.43c0.86-0.93,2.3-0.99,3.23-0.13c0.93,0.86,0.99,2.3,0.13,3.23L91.4,28.3c-0.86,0.93-2.3,0.99-3.23,0.13 c-0.93-0.86-0.99-2.3-0.13-3.23L104.45,7.43L104.45,7.43L104.45,7.43z M111.55,14c0.86-0.93,2.3-0.99,3.23-0.13 c0.93,0.86,0.99,2.3,0.13,3.23L98.51,34.86c-0.86,0.93-2.3,0.99-3.23,0.13c-0.93-0.86-0.99-2.3-0.13-3.23L111.55,14L111.55,14 L111.55,14z M118.91,20.83c0.86-0.93,2.3-0.99,3.23-0.13c0.93,0.86,0.99,2.31,0.13,3.23L103.55,44.2c-0.07,0.07-0.14,0.13-0.21,0.2 c-4.26,4.1-8.33,6.47-12.22,7.14c-4.22,0.73-8.09-0.47-11.64-3.57c-0.95-0.83-1.04-2.28-0.22-3.22c0.83-0.95,2.28-1.04,3.22-0.22 c2.45,2.14,5.07,2.98,7.84,2.49c2.98-0.51,6.26-2.48,9.84-5.93l0.02-0.02l18.71-20.25L118.91,20.83L118.91,20.83z" />
              </svg>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Planificador de Menús</h1>
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

          <div className="p-4 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-3 space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6 animate-fade-in dark:bg-gray-800">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Mi Menú</h2>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={openModal}
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
                        <span className="text-white">Agregar Comida</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando menús...</p>
                    </div>
                  ) : menus.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center dark:bg-gray-800">
                      <svg
                        className="w-16 h-16 mx-auto text-gray-400 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        ></path>
                      </svg>
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                        No hay menús planificados
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Comienza a planificar tus comidas de la semana
                      </p>
                      <button
                        onClick={openModal}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Agregar Primera Comida
                      </button>
                    </div>
                  ) : (
                    menus.map((menu) => (
                      <div
                        key={menu._id?.toString()}
                        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] transform animate-scale-in dark:bg-gray-800 dark:hover:shadow-lg"
                      >
                        <div className="flex">
                          <div className={`w-2 ${getDayColor(menu.dayOfWeek)} rounded-l-xl`}></div>
                          <div className="flex-1 p-6">
                            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                              {menu.imageUrl && (
                                <Image
                                  src={menu.imageUrl || "/placeholder.svg"}
                                  alt={menu.dishName}
                                  width={120}
                                  height={120}
                                  className="w-30 h-30 rounded-xl object-cover"
                                />
                              )}
                              <div className="flex-1">
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                                  <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-1 dark:text-white">
                                      {menu.date ? new Date(menu.date as unknown as string).toLocaleDateString("es-ES") : menu.dayOfWeek}{" "}
                                      - {menu.mealType}
                                    </h3>
                                    <p className="text-xl font-bold text-gray-900 mb-2 dark:text-gray-100">
                                      {menu.dishName}
                                    </p>
                                    {menu.description && (
                                      <p className="text-sm text-gray-600 mb-2 dark:text-gray-400">
                                        {menu.description}
                                      </p>
                                    )}
                                    {menu.ingredients && menu.ingredients.length > 0 && (
                                      <div className="mb-2">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          Ingredientes:
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                          {menu.ingredients.join(", ")}
                                        </p>
                                      </div>
                                    )}
                                    <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                      {menu.preparationTime && menu.preparationTime > 0 && (
                                        <span>⏱️ {menu.preparationTime} min</span>
                                      )}
                                      {menu.servings && menu.servings > 0 && <span>🍽️ {menu.servings} porciones</span>}
                                    </div>
                                    {menu.tags && menu.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mb-2">
                                        {menu.tags.map((tag, index) => (
                                          <span
                                            key={index}
                                            className={`px-3 py-1 text-xs font-medium rounded-full ${getTagColor(tag)}`}
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-3 mt-4 lg:mt-0">
                                    <label className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300">
                                      <input
                                        type="checkbox"
                                        checked={!!menu.done}
                                        onChange={async () => {
                                          const id = menu._id?.toString()
                                          if (!id) return
                                          try {
                                            const res = await fetch(`/api/menu/${id}`, {
                                              method: "PUT",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ done: !menu.done }),
                                            })
                                            if (res.ok) {
                                              const data = await res.json()
                                              setMenus((prev) =>
                                                prev.map((m) => (m._id?.toString() === id ? data.menu : m)),
                                              )
                                            }
                                          } catch (e) {
                                            console.error("Error toggling menu done:", e)
                                          }
                                        }}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600"
                                      />
                                      <span>Hecho</span>
                                    </label>
                                    <button
                                      className="p-2 hover:bg-red-100 rounded-lg transition-colors group dark:hover:bg-red-700"
                                      onClick={() => handleDelete(menu._id?.toString() || "")}
                                    >
                                      <svg
                                        className="w-5 h-5 text-gray-600 group-hover:text-red-600 group-hover:scale-110 transition-all dark:text-gray-400 dark:group-hover:text-red-300"
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
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6 animate-fade-in dark:bg-gray-800">
                  <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center dark:text-white">
                    <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      ></path>
                    </svg>
                    Sugerencias
                  </h4>
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-600 transition-colors cursor-pointer group dark:bg-gray-700 dark:border-gray-600 dark:hover:border-blue-600">
                      <div className="flex items-center space-x-3">
                        <Image
                          src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60&h=60&fit=crop&crop=center"
                          alt="Ensalada mediterránea"
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h6 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors dark:text-white dark:group-hover:text-blue-600">
                            Ensalada Mediterránea
                          </h6>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Perfecta para el almuerzo</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full dark:bg-green-700 dark:text-green-100">
                              Saludable
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full dark:bg-blue-700 dark:text-blue-100">
                              Bajo en calorías
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-600 transition-colors cursor-pointer group dark:bg-gray-700 dark:border-gray-600 dark:hover:border-blue-600">
                      <div className="flex items-center space-x-3">
                        <Image
                          src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=60&h=60&fit=crop&crop=center"
                          alt="Pizza margherita"
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h6 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors dark:text-white dark:group-hover:text-blue-600">
                            Pizza Margherita
                          </h6>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Ideal para la cena</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full dark:bg-purple-700 dark:text-purple-100">
                              Vegetariano
                            </span>
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full dark:bg-yellow-700 dark:text-yellow-100">
                              Proteína
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-600 transition-colors cursor-pointer group dark:bg-gray-700 dark:border-gray-600 dark:hover:border-blue-600">
                      <div className="flex items-center space-x-3">
                        <Image
                          src="https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=60&h=60&fit=crop&crop=center"
                          alt="Smoothie bowl"
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h6 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors dark:text-white dark:group-hover:text-blue-600">
                            Smoothie Bowl
                          </h6>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Perfecto para desayuno</p>
                          <div className="flex-wrap gap-1 mt-1">
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full dark:bg-green-700 dark:text-green-100">
                              Saludable
                            </span>
                            <span className="px-2 py-0.5 bg-pink-100 text-pink-800 text-xs rounded-full dark:bg-pink-700 dark:text-pink-100">
                              Antioxidantes
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 animate-fade-in dark:bg-gray-800">
                  <h4 className="text-xl font-bold text-gray-800 mb-4 dark:text-white">Resumen Nutricional</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Comidas planificadas</span>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">{menus.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Comidas saludables</span>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-300">
                        {menus.filter((m) => m.tags.includes("Saludable")).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Con proteínas</span>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                        {menus.filter((m) => m.tags.includes("Proteína")).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Con vegetales</span>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-300">
                        {menus.filter((m) => m.tags.includes("Vegetales")).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in dark:bg-gray-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Agregar Nueva Comida</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors dark:text-gray-300 dark:hover:text-gray-400"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                      Tipo de comida
                    </label>
                    <select
                      value={formData.mealType}
                      onChange={(e) => setFormData({ ...formData, mealType: e.target.value as MealType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    >
                      <option>Desayuno</option>
                      <option>Almuerzo</option>
                      <option>Merienda</option>
                      <option>Cena</option>
                      <option>Snack</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Nombre del plato
                  </label>
                  <input
                    type="text"
                    value={formData.dishName}
                    onChange={(e) => setFormData({ ...formData, dishName: e.target.value })}
                    placeholder="Ej: Ensalada César"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe el plato..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    URL de la imagen
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Ingredientes
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={formData.ingredientInput}
                      onChange={(e) => setFormData({ ...formData, ingredientInput: e.target.value })}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddIngredient())}
                      placeholder="Agregar ingrediente..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    />
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.ingredients.map((ingredient, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full flex items-center gap-2 dark:bg-gray-700 dark:text-gray-300"
                      >
                        {ingredient}
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                      Tiempo (min)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.preparationTime}
                      onChange={(e) =>
                        setFormData({ ...formData, preparationTime: Number.parseInt(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Porciones</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.servings}
                      onChange={(e) => setFormData({ ...formData, servings: Number.parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Receta (opcional)
                  </label>
                  <textarea
                    value={formData.recipe}
                    onChange={(e) => setFormData({ ...formData, recipe: e.target.value })}
                    placeholder="Pasos para preparar el plato..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Información nutricional (opcional)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="number"
                      min="0"
                      placeholder="Calorías"
                      value={formData.nutritionalInfo.calories || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nutritionalInfo: {
                            ...formData.nutritionalInfo,
                            calories: Number.parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Proteína (g)"
                      value={formData.nutritionalInfo.protein || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nutritionalInfo: {
                            ...formData.nutritionalInfo,
                            protein: Number.parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Carbohidratos (g)"
                      value={formData.nutritionalInfo.carbs || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nutritionalInfo: { ...formData.nutritionalInfo, carbs: Number.parseInt(e.target.value) || 0 },
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Tags nutricionales
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Saludable", "Bajo en calorías", "Vegetariano", "Proteína", "Vegetales", "Fibra"].map((tag) => (
                      <label key={tag} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.tags.includes(tag)}
                          onChange={() => handleTagChange(tag)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="text-sm dark:text-gray-300">{tag}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Agregar
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

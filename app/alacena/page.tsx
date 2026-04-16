"use client" // Componente de cliente para manejar estado y eventos del inventario

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { User } from "@/lib/models/User"
import HouseholdMember from "@/lib/models/Household"
import { useNotifications } from "@/hooks/useNotifications"
import { useProductNotifications } from "@/hooks/useProductNotifications"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle" // Control de tema claro/oscuro
import NotificationButton from "@/components/notification-button" // Sistema de notificaciones
import ProfileDropdown from "@/components/profile-dropdown" // Menú de perfil de usuario

// Interface para estructura completa de un producto del inventario
interface Product {
  _id: string
  name: string // Nombre del producto
  category: string // Categoría (alimentos, limpieza, etc.)
  quantity: number // Cantidad actual
  quantityUnit: string // Unidad de medida (kg, litros, unidades)
  threshold: number // Stock mínimo alerta
  thresholdUnit: string // Unidad del umbral
  expiryDate?: string // Fecha de vencimiento
  purchaseDate?: string // Fecha de compra
  householdId: string // ID del hogar
  createdAt: string // Fecha de creación
  updatedAt: string // Fecha de última actualización
  notes?: string // Notas adicionales
  location?: string // Ubicación física (cocina, despensa, etc.)
}

// Componente principal de la página de Alacena (Inventario)
export default function AlacenaPage() {
  // Eliminar notificaciones duplicadas - ahora se manejan centralizadamente
  // const { showProductNotification } = useNotifications()
  
  // Estados principales de datos
  const [products, setProducts] = useState<Product[]>([]) // Lista completa de productos
  const [loading, setLoading] = useState(true) // Estado de carga inicial
  const [sidebarOpen, setSidebarOpen] = useState(false) // Control de sidebar
  const [user, setUser] = useState<any>(null) // Usuario autenticado
  
  // Estados para modales y edición
  const [modalOpen, setModalOpen] = useState(false) // Modal para agregar/editar producto
  const [editingProduct, setEditingProduct] = useState<Product | null>(null) // Producto en edición
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("") // Término de búsqueda
  const [categoryFilter, setCategoryFilter] = useState("") // Filtro por categoría
  const [locationFilter, setLocationFilter] = useState("") // Filtro por ubicación
  const [sortBy, setSortBy] = useState("name") // Ordenamiento
  
  // Estado para alertas de stock bajo descartadas
  const [dismissedLowStockIds, setDismissedLowStockIds] = useState<string[]>(() => {
    // Recuperar IDs descartados del localStorage
    if (typeof window === "undefined") return []
    try {
      const s = localStorage.getItem("alacena_dismissed_low_stock")
      return s ? JSON.parse(s) : []
    } catch {
      return []
    }
  })
  
  // Estado para formulario de nuevo producto
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "alimentos",
    quantity: 1,
    quantityUnit: "unidad", // Changed from 'unit' to 'quantityUnit'
    threshold: 1, // Added required threshold field
    thresholdUnit: "unidad", // Added required thresholdUnit field
    expiryDate: "", // Changed from 'expirationDate' to 'expiryDate'
    purchaseDate: "", // Added purchaseDate
    notes: "",
    location: "despensa", // Added default location
  })

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    const lowIds = new Set(
      products
        .filter((p) => (p.quantityUnit || "") === (p.thresholdUnit || "") && p.quantity <= p.threshold)
        .map((p) => String(p._id)),
    )
    const stillDismissed = dismissedLowStockIds.filter((id) => lowIds.has(id))
    if (stillDismissed.length !== dismissedLowStockIds.length) {
      setDismissedLowStockIds(stillDismissed)
      try {
        localStorage.setItem("alacena_dismissed_low_stock", JSON.stringify(stillDismissed))
      } catch {}
    }
  }, [products])

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token")
      const userData = localStorage.getItem("user")

      if (!userData) {
        console.error("No user data found")
        setLoading(false)
        return
      }

      const user = JSON.parse(userData)
      const householdId = user.activeHousehold

      if (!householdId) {
        console.error("No active household found")
        setLoading(false)
        return
      }

      const params = new URLSearchParams({ householdId })
      if (locationFilter) params.set("location", locationFilter)
      const response = await fetch(`/api/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      } else {
        console.error("Failed to fetch products:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  // Notificaciones centralizadas en el dashboard - eliminar duplicación
  // useProductNotifications(products)

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem("token")
      const userData = localStorage.getItem("user")

      if (!userData) {
        console.error("No user data found")
        return
      }

      const user = JSON.parse(userData)
      const householdId = user.activeHousehold

      if (!householdId) {
        console.error("No active household found")
        return
      }

      const productData = {
        ...newProduct,
        householdId: householdId,
        quantity: Number(newProduct.quantity),
        threshold: Number(newProduct.threshold),
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      })

      if (response.ok) {
        const data = await response.json()
        setProducts([data.product, ...products])
        setModalOpen(false)
        setNewProduct({
          name: "",
          category: "alimentos",
          quantity: 1,
          quantityUnit: "unidad",
          threshold: 1,
          thresholdUnit: "unidad",
          expiryDate: "",
          purchaseDate: "",
          notes: "",
          location: "despensa",
        })
      } else {
        const errorData = await response.json()
        console.error("Failed to create product:", response.status, errorData)
        alert(`Error: ${errorData.error || "Failed to create product"}`)
      }
    } catch (error) {
      console.error("Error creating product:", error)
      alert("Error creating product. Please try again.")
    }
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/products/${editingProduct._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingProduct),
      })

      if (response.ok) {
        const data = await response.json()
        setProducts(products.map((p) => (p._id === editingProduct._id ? data.product : p)))
        setEditingProduct(null)
        closeModal() // Close modal after successful update
      } else {
        const errorData = await response.json()
        console.error("Failed to update product:", response.status, errorData)
        alert(`Error: ${errorData.error || "Failed to update product"}`)
      }
    } catch (error) {
      console.error("Error updating product:", error)
      alert("Error updating product. Please try again.")
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setProducts(products.filter((p) => p._id !== productId))
      } else {
        const errorData = await response.json()
        console.error("Failed to delete product:", response.status, errorData)
        alert(`Error: ${errorData.error || "Failed to delete product"}`)
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      alert("Error deleting product. Please try again.")
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  const openModal = () => {
    setModalOpen(true)
    setEditingProduct(null) // Ensure no product is being edited when opening for new creation
    setNewProduct({
      // Reset newProduct state when opening modal for creation
      name: "",
      category: "alimentos",
      quantity: 1,
      quantityUnit: "unidad",
      threshold: 1,
      thresholdUnit: "unidad",
      expiryDate: "",
      purchaseDate: "",
      notes: "",
      location: "despensa",
    })
    document.body.classList.add("overflow-hidden")
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingProduct(null)
    document.body.classList.remove("overflow-hidden")
  }

  const openEditModal = (product: Product) => {
    setEditingProduct({ ...product })
    setModalOpen(true) // Open the modal when editing
    document.body.classList.add("overflow-hidden")
  }

  // Filtrar y ordenar productos
  const filteredProducts = products
    .filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = !categoryFilter || product.category === categoryFilter
      const matchesLocation = !locationFilter || product.location === locationFilter
      return matchesSearch && matchesCategory && matchesLocation
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "category":
          return a.category.localeCompare(b.category)
        case "quantity":
          return b.quantity - a.quantity
        case "expiration":
          // Handle cases where expiryDate might be missing or invalid
          const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.POSITIVE_INFINITY
          const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.POSITIVE_INFINITY
          return dateA - dateB
        default:
          return 0
      }
    })

  // Calcular productos vencidos y con stock bajo
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize today's date for comparison

  const expiredProducts = products.filter((product) => {
    if (!product.expiryDate) return false
    const expirationDate = new Date(product.expiryDate)
    expirationDate.setHours(0, 0, 0, 0) // Normalize expiration date
    return expirationDate < today
  })

  const lowStockProductsAll = products.filter((product) => {
    const sameUnit = (product.quantityUnit || "") === (product.thresholdUnit || "")
    return sameUnit && product.quantity <= product.threshold
  })
  const lowStockProducts = lowStockProductsAll.filter((p) => !dismissedLowStockIds.includes(String(p._id)))

  const dismissLowStockAlert = (productId: string) => {
    const id = String(productId)
    const next = [...dismissedLowStockIds, id]
    setDismissedLowStockIds(next)
    try {
      localStorage.setItem("alacena_dismissed_low_stock", JSON.stringify(next))
    } catch {}
  }

  const soonToExpireProducts = products.filter((product) => {
    if (!product.expiryDate) return false
    const expirationDate = new Date(product.expiryDate)
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiration > 0 && daysUntilExpiration <= 7
  })

  // Crear alertas
  const alerts = [
    ...expiredProducts.map((product) => ({
      type: "expired" as const,
      message: `${product.name} está vencido`,
      product,
    })),
    ...soonToExpireProducts.map((product) => ({
      type: "expiring" as const,
      message: `${product.name} vence pronto`,
      product,
    })),
    ...lowStockProducts.map((product) => ({
      type: "lowStock" as const,
      message: `Stock bajo: ${product.name}`,
      product,
    })),
  ]

  // Generar lista de compras automática (solo productos con stock bajo)
  const shoppingList = lowStockProducts

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Sin fecha"
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getDaysUntilExpiration = (expirationDate: string | undefined) => {
    if (!expirationDate) return Number.POSITIVE_INFINITY
    const expDate = new Date(expirationDate)
    const today = new Date()
    const diffTime = expDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getExpirationStatus = (expirationDate: string | undefined) => {
    if (!expirationDate) return { status: "none", color: "bg-gray-400", text: "Sin vencimiento" }

    const days = getDaysUntilExpiration(expirationDate)
    if (days < 0) return { status: "expired", color: "bg-red-500", text: "Vencido" }
    if (days <= 3) return { status: "critical", color: "bg-red-400", text: `${days} días` }
    if (days <= 7) return { status: "warning", color: "bg-yellow-400", text: `${days} días` }
    return { status: "good", color: "bg-green-400", text: `${days} días` }
  }

  const getStockStatus = (product: Product) => {
    const threshold = product.threshold ?? 1
    const sameUnit = (product.quantityUnit || "") === (product.thresholdUnit || "")
    if (product.quantity === 0) return { status: "empty", color: "bg-red-500", text: "Agotado" }
    if (sameUnit && product.quantity <= threshold) return { status: "low", color: "bg-yellow-400", text: "Stock bajo" }
    return { status: "good", color: "bg-green-400", text: "Stock OK" }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="font-roboto min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Menu Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={closeSidebar} />}

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-80 bg-blue-500 dark:bg-gray-800 text-white transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-300 ease-in-out`}
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                ></path>
              </svg>
              <span className="text-white ml-4 text-lg font-semibold">Lista de Tareas</span>
            </Link>

            <Link
              href="/menu"
              className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 hover:bg-blue-600 hover:scale-105 transform group animate-fade-in"
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
              className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 bg-blue-600 hover:scale-105 transform group animate-fade-in"
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
                onClick={toggleSidebar}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Alacena</h1>
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
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                      fill="currentColor"
                        strokeWidth="0"
                        d="M22,1H2A1,1,0,0,0,1,2V22a1,1,0,0,0,1,1H22a1,1,0,0,0,1-1V2A1,1,0,0,0,22,1ZM19,9.667h2v4.666H19Zm2-2H19V3h2Zm-4,7.666V17H11V3h6ZM3,3H9V17H3ZM3,19H17v2H3Zm18,2H19V16.333h2ZM8,9v2a1,1,0,0,1-2,0V9A1,1,0,0,1,8,9Zm4,2V9a1,1,0,0,1,2,0v2a1,1,0,0,1-2,0Z"
                      ></path>
                    </svg>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Alacena</h1>
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
            {/* Alerta global si hay productos críticos */}
            {(expiredProducts.length > 0 || lowStockProducts.length > 0) && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg dark:bg-red-900 dark:border-red-600">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      ¡Atención! Productos que requieren tu atención
                    </h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <ul className="list-disc list-inside space-y-1">
                        {expiredProducts.length > 0 && <li>{expiredProducts.length} producto(s) vencido(s)</li>}
                        {lowStockProducts.length > 0 && <li>{lowStockProducts.length} producto(s) con stock bajo</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Left Side - Lista de productos */}
              <div className="xl:col-span-3 space-y-6">
                {/* Header con filtros */}
                <div className="bg-white rounded-xl shadow-sm p-6 animate-fade-in dark:bg-gray-800">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex flex-wrap gap-3">
                      <input
                        type="text"
                        placeholder="Buscar productos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                      />
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                      >
                        <option value="">Todas las categorías</option>
                        <option value="alimentos">Alimentos</option>
                        <option value="bebidas">Bebidas</option>
                        <option value="limpieza">Limpieza</option>
                        <option value="higiene">Higiene</option>
                        <option value="medicamentos">Medicamentos</option>
                        <option value="otros">Otros</option>
                      </select>
                      <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                      >
                        <option value="">Todas las ubicaciones</option>
                        <option value="despensa">Despensa</option>
                        <option value="refrigerador">Refrigerador</option>
                        <option value="congelador">Congelador</option>
                        <option value="armario">Armario</option>
                        <option value="otros">Otros</option>
                      </select>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                      >
                        <option value="name">Ordenar por nombre</option>
                        <option value="category">Ordenar por categoría</option>
                        <option value="quantity">Ordenar por cantidad</option>
                        <option value="expiration">Ordenar por vencimiento</option>
                      </select>
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
                        <span className="text-white">Agregar Producto</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de productos */}
                <div className="space-y-4">
                  {filteredProducts.map((product) => {
                    const expirationStatus = getExpirationStatus(product.expiryDate)
                    const stockStatus = getStockStatus(product)

                    return (
                      <div
                        key={product._id}
                        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02] transform animate-scale-in dark:bg-gray-800"
                      >
                        <div className="flex">
                          <div
                            className={`w-2 rounded-l-xl ${
                              expirationStatus.status === "expired" || stockStatus.status === "empty"
                                ? "bg-red-500"
                                : expirationStatus.status === "critical" || stockStatus.status === "low"
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                          ></div>
                          <div className="flex-1 p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                              <div className="w-20 h-20 bg-gray-200 rounded-xl flex items-center justify-center dark:bg-gray-700">
                                <div className="text-3xl text-gray-400 dark:text-gray-500">
                                  📦
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                                  <div className="flex-1 mb-4 lg:mb-0 lg:pr-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2 dark:text-white">
                                      {product.name}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full dark:bg-blue-700 dark:text-blue-100">
                                        {product.category}
                                      </span>
                                      {product.location && (
                                        <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full dark:bg-purple-700 dark:text-purple-100">
                                          {product.location}
                                        </span>
                                      )}
                                      <span
                                        className={`px-3 py-1 text-xs font-medium rounded-full text-white ${expirationStatus.color}`}
                                      >
                                        {expirationStatus.text}
                                      </span>
                                      <span
                                        className={`px-3 py-1 text-xs font-medium rounded-full text-white ${stockStatus.color}`}
                                      >
                                        {stockStatus.text}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                      <span>
                                        📦 {product.quantity} {product.quantityUnit}
                                      </span>
                                      {product.expiryDate && <span>📅 Vence: {formatDate(product.expiryDate)}</span>}
                                      <span>🛒 Comprado: {formatDate(product.createdAt)}</span>
                                    </div>
                                    {product.notes && (
                                      <p className="text-sm text-gray-600 mt-2 dark:text-gray-400">
                                        📝 {product.notes}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => openEditModal(product)}
                                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors group dark:hover:bg-blue-700"
                                    >
                                      <svg
                                        className="w-5 h-5 text-gray-600 group-hover:text-blue-600 group-hover:scale-110 transition-all dark:text-gray-400 dark:group-hover:text-blue-300"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        ></path>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProduct(product._id)}
                                      className="p-2 hover:bg-red-100 rounded-lg transition-colors group dark:hover:bg-red-700"
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
                    )
                  })}

                  {filteredProducts.length === 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-12 text-center animate-fade-in dark:bg-gray-800">
                      <svg
                        className="w-16 h-16 text-gray-400 mx-auto mb-4"
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
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 dark:text-white">
                        No se encontraron productos
                      </h3>
                      <p className="text-gray-600 mb-4 dark:text-gray-400">
                        {searchTerm || categoryFilter || locationFilter
                          ? "Intenta ajustar los filtros de búsqueda"
                          : "Comienza agregando productos a tu alacena"}
                      </p>
                      <button
                        onClick={openModal}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Agregar Primer Producto
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Estadísticas y alertas */}
              <div className="space-y-6">
                {/* Estadísticas */}
                <div className="bg-white rounded-xl shadow-sm p-6 animate-fade-in dark:bg-gray-800">
                  <h4 className="text-xl font-bold text-gray-800 mb-4 dark:text-white">Resumen</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total productos</span>
                      <span className="text-lg font-semibold text-blue-600 dark:text-blue-300">{products.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Productos vencidos</span>
                      <span className="text-lg font-semibold text-red-600 dark:text-red-300">
                        {expiredProducts.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Stock bajo</span>
                      <span className="text-lg font-semibold text-yellow-600 dark:text-yellow-300">
                        {lowStockProducts.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Vencen pronto</span>
                      <span className="text-lg font-semibold text-orange-600 dark:text-orange-300">
                        {soonToExpireProducts.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lista de compras automática */}
                {shoppingList.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-6 animate-fade-in dark:bg-gray-800">
                    <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center dark:text-white">
                      <svg
                        className="w-6 h-6 text-green-600 mr-2"
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
                      Lista de Compras
                    </h4>
                    <div className="space-y-2">
                      {shoppingList.map((product) => (
                        <div
                          key={product._id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-700"
                        >
                          <div>
                            <span className="font-medium text-gray-800 dark:text-white">{product.name}</span>
                            <span className="text-sm text-gray-600 ml-2 dark:text-gray-400">
                              ({product.quantity} {product.quantityUnit} restantes)
                            </span>
                          </div>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full dark:bg-yellow-700 dark:text-yellow-100">
                            Stock bajo
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alertas */}
                {alerts.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-6 animate-fade-in dark:bg-gray-800">
                    <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center dark:text-white">
                      <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        ></path>
                      </svg>
                      Alertas ({alerts.length})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {alerts.slice(0, 10).map((alert, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg text-sm ${
                            alert.type === "expired"
                              ? "bg-red-50 text-red-800 border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700"
                              : alert.type === "expiring"
                                ? "bg-orange-50 text-orange-800 border border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700"
                                : "bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center min-w-0">
                              <svg
                                className={`w-4 h-4 mr-2 flex-shrink-0 ${
                                  alert.type === "expired"
                                    ? "text-red-600"
                                    : alert.type === "expiring"
                                      ? "text-orange-600"
                                      : "text-yellow-600"
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="truncate">{alert.message}</span>
                            </div>
                            {alert.type === "lowStock" && alert.product && (
                              <button
                                type="button"
                                onClick={() => dismissLowStockAlert(String(alert.product!._id))}
                                className="text-xs font-medium text-yellow-700 dark:text-yellow-300 hover:underline flex-shrink-0"
                              >
                                Ignorar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {alerts.length > 10 && (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          Y {alerts.length - 10} alertas más...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para agregar/editar producto */}
      {(modalOpen || editingProduct) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in dark:bg-gray-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                  {editingProduct ? "Editar Producto" : "Agregar Nuevo Producto"}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors dark:text-gray-300 dark:hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Nombre del producto
                  </label>
                  <input
                    type="text"
                    value={editingProduct ? editingProduct.name || "" : newProduct.name}
                    onChange={(e) =>
                      editingProduct
                        ? setEditingProduct({ ...editingProduct, name: e.target.value })
                        : setNewProduct({ ...newProduct, name: e.target.value })
                    }
                    placeholder="Ej: Arroz integral"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Categoría</label>
                    <select
                      value={editingProduct ? editingProduct.category || "alimentos" : newProduct.category}
                      onChange={(e) =>
                        editingProduct
                          ? setEditingProduct({ ...editingProduct, category: e.target.value })
                          : setNewProduct({ ...newProduct, category: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                    >
                      <option value="alimentos">Alimentos</option>
                      <option value="bebidas">Bebidas</option>
                      <option value="limpieza">Limpieza</option>
                      <option value="higiene">Higiene</option>
                      <option value="medicamentos">Medicamentos</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Ubicación</label>
                    <select
                      value={editingProduct ? editingProduct.location || "despensa" : newProduct.location}
                      onChange={(e) =>
                        editingProduct
                          ? setEditingProduct({ ...editingProduct, location: e.target.value })
                          : setNewProduct({ ...newProduct, location: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                    >
                      <option value="despensa">Despensa</option>
                      <option value="refrigerador">Refrigerador</option>
                      <option value="congelador">Congelador</option>
                      <option value="armario">Armario</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Cantidad</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editingProduct ? editingProduct.quantity || 0 : newProduct.quantity}
                      onChange={(e) =>
                        editingProduct
                          ? setEditingProduct({ ...editingProduct, quantity: Number.parseFloat(e.target.value) || 0 })
                          : setNewProduct({ ...newProduct, quantity: Number.parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Unidad</label>
                    <select
                      value={editingProduct ? editingProduct.quantityUnit || "unidad" : newProduct.quantityUnit}
                      onChange={(e) => {
                        const u = e.target.value
                        if (editingProduct) {
                          setEditingProduct({ ...editingProduct, quantityUnit: u, thresholdUnit: u })
                        } else {
                          setNewProduct({ ...newProduct, quantityUnit: u, thresholdUnit: u })
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                    >
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="g">Gramos (g)</option>
                      <option value="l">Litros (l)</option>
                      <option value="unidad">Unidad</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                      Umbral mínimo de stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editingProduct ? editingProduct.threshold || 1 : newProduct.threshold}
                      onChange={(e) =>
                        editingProduct
                          ? setEditingProduct({ ...editingProduct, threshold: Number.parseFloat(e.target.value) || 1 })
                          : setNewProduct({ ...newProduct, threshold: Number.parseFloat(e.target.value) || 1 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                      Unidad del umbral
                    </label>
                    <select
                      value={editingProduct ? editingProduct.thresholdUnit || "unidad" : newProduct.thresholdUnit}
                      onChange={(e) =>
                        editingProduct
                          ? setEditingProduct({ ...editingProduct, thresholdUnit: e.target.value })
                          : setNewProduct({ ...newProduct, thresholdUnit: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                    >
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="g">Gramos (g)</option>
                      <option value="l">Litros (l)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="unidad">Unidad</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                      Fecha de vencimiento (opcional)
                    </label>
                    <input
                      type="date"
                      value={editingProduct ? editingProduct.expiryDate || "" : newProduct.expiryDate}
                      onChange={(e) =>
                        editingProduct
                          ? setEditingProduct({ ...editingProduct, expiryDate: e.target.value })
                          : setNewProduct({ ...newProduct, expiryDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                      Fecha de compra (opcional)
                    </label>
                    <input
                      type="date"
                      value={editingProduct ? editingProduct.purchaseDate || "" : newProduct.purchaseDate}
                      onChange={(e) =>
                        editingProduct
                          ? setEditingProduct({ ...editingProduct, purchaseDate: e.target.value })
                          : setNewProduct({ ...newProduct, purchaseDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={editingProduct ? editingProduct.notes || "" : newProduct.notes}
                    onChange={(e) =>
                      editingProduct
                        ? setEditingProduct({ ...editingProduct, notes: e.target.value })
                        : setNewProduct({ ...newProduct, notes: e.target.value })
                    }
                    placeholder="Notas adicionales sobre el producto..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500"
                  />
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
                    {editingProduct ? "Actualizar" : "Agregar"}
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

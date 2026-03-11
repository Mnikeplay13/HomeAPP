"use client" // Componente de cliente para manejar estado y eventos del inventario

import type React from "react"

import { useState, useEffect } from "react"
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
            <span className="text-2xl lg:text-3xl font-bold text-white animate-fade-in">HomeApp</span>
            <button onClick={closeSidebar} className="lg:hidden text-white hover:text-gray-300 transition-colors">
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
              <span className="text-white ml-4 text-lg font-semibold">Menú</span>
            </Link>

            <Link
              href="/alacena"
              className="flex items-center p-3 rounded-xl cursor-pointer transition-all duration-300 bg-blue-600 hover:scale-105 transform group animate-fade-in"
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
                  d="M4 7v10c0 2.21 4.03 4 9 4 4.97 0 9-1.79 9-4V7c0-2.21-4.03-4-9-4-4.97 0-9 1.79-9 4"
                ></path>
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
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 7v10c0 2.21 4.03 4 9 4 4.97 0 9-1.79 9-4V7c0-2.21-4.03-4-9-4-4.97 0-9 1.79-9 4"
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

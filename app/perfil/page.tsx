"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getImageUrl, handleImageError } from "@/lib/image-utils"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Copy, Share2, ArrowLeft, Edit, Home, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ThemeToggle from "@/components/theme-toggle"
import NotificationButton from "@/components/notification-button"

type Member = { _id: string; name: string; email: string; profileImage: string }
type HouseholdCard = {
  _id: string
  name: string
  description: string
  inviteCode: string | null
  membersCount: number
  imageUrl?: string
  createdAt?: string
  members?: Member[]
}

type Household = { _id: string; name: string; imageUrl?: string; inviteCode: string }

interface User {
  _id: string
  name: string
  email: string
  createdAt: string
  profileImage: string
}

export default function PerfilPage() {
  const [user, setUser] = useState<User | null>(null)
  const [activeHousehold, setActiveHousehold] = useState<any>(null)
  const [households, setHouseholds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editingProfile, setEditingProfile] = useState({ name: "", profileImage: "" })
  const [showEditHousehold, setShowEditHousehold] = useState(false)
  const [editingHousehold, setEditingHousehold] = useState({ name: "", imageUrl: "" })

  const token = useMemo(() => (typeof window === "undefined" ? null : localStorage.getItem("token")), [])

  const router = useRouter()

  async function load() {
    if (!token) return
    try {
      setLoading(true)
      const res = await fetch("/api/households", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "Error al cargar el perfil")
      setHouseholds(data.households || [])
      setActiveHousehold((data.households || []).find((h: Household) => h._id === data.activeHouseholdId) || null)
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const userData = localStorage.getItem("user")
    const theme = localStorage.getItem("theme") || "light"

    if (!userData) {
      router.push("/login")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      setDarkMode(theme === "dark")
      if (theme === "dark") document.documentElement.classList.add("dark")

      load()
    } catch (error) {
      console.error("Error parsing user data:", error)
      router.push("/login")
    }
  }, [router])

  const toggleDarkMode = () => {
    const newTheme = darkMode ? "light" : "dark"
    setDarkMode(!darkMode)
    localStorage.setItem("theme", newTheme)
    if (newTheme === "dark") document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
  }

  const toggleSidebar = () => setSidebarHidden(!sidebarHidden)
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen)

  const canShare = typeof navigator !== "undefined" && typeof (navigator as any).share === "function"

  async function saveHousehold() {
    if (!token || !activeHousehold) return
    if (!editingHousehold.name.trim()) {
      toast({ title: "Nombre inválido", description: "Mínimo 2 caracteres", variant: "destructive" })
      return
    }
    try {
      const res = await fetch(`/api/households/${activeHousehold._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editingHousehold),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "No se pudo guardar")
      toast({ title: "Guardado", description: "Se actualizó el hogar" })
      await load()
      setShowEditHousehold(false)
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  async function copyInvite() {
    if (!activeHousehold) return
    try {
      await navigator.clipboard.writeText(activeHousehold.inviteCode)
      toast({ title: "Copiado", description: "Código de invitación copiado al portapapeles" })
    } catch {
      toast({ title: "No se pudo copiar", description: "Copia manualmente el código", variant: "destructive" })
    }
  }

  async function shareInvite() {
    if (!activeHousehold) return
    const text = `Únete a mi hogar "${activeHousehold.name}" en HomeApp usando este código: ${activeHousehold.inviteCode}`
    try {
      if (navigator.share) {
        await navigator.share({ title: "Invitación a HomeApp", text })
      } else {
        await navigator.clipboard.writeText(text)
        toast({ title: "Copiado", description: "Invitación copiada para compartir" })
      }
    } catch {
      // user cancelled share — ignore
    }
  }

  async function updateProfile() {
    if (!user || !editingProfile.name.trim()) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingProfile.name,
          profileImage: editingProfile.profileImage,
        }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(updatedUser)
        localStorage.setItem("user", JSON.stringify(updatedUser))
        setShowEditProfile(false)
        toast({ title: "Perfil actualizado", description: "Tu perfil se ha actualizado correctamente" })
      } else {
        toast({ title: "Error", description: "No se pudo actualizar el perfil", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) return null

  const noActiveHousehold = !activeHousehold

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Mi Perfil</h1>
            </div>
            <div className="flex items-center space-x-2">
              <NotificationButton />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Profile Card */}
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 p-1">
                  <img
                    src={getImageUrl(user?.profileImage)}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover bg-white"
                    onError={(e) => handleImageError(e)}
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{user?.name || "Usuario"}</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{user?.email}</p>

                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  {/* Edit Profile button */}
                  <Button
                    onClick={() => {
                      setEditingProfile({ name: user?.name || "", profileImage: user?.profileImage || "" })
                      setShowEditProfile(true)
                    }}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Perfil
                  </Button>

                  <Button variant="outline" onClick={() => router.push("/dashboard")}>
                    <Home className="h-4 w-4 mr-2" />
                    Ir al Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Household Section */}
        <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Users className="h-5 w-5" />
              Grupo de Hogar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeHousehold ? (
              <div className="space-y-6">
                {/* Household Info */}
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg">
                  <img
                    src={getImageUrl(activeHousehold.imageUrl)}
                    alt={activeHousehold.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                    onError={(e) => handleImageError(e)}
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{activeHousehold.name}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{activeHousehold.members?.length || 0} miembros</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingHousehold({
                        name: activeHousehold.name,
                        imageUrl: activeHousehold.imageUrl || "",
                      })
                      setShowEditHousehold(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>

                {/* Invite code area */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Código de invitación</div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      readOnly
                      value={activeHousehold?.inviteCode || "—"}
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono tracking-widest text-center sm:text-left"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={copyInvite}
                        disabled={!activeHousehold?.inviteCode}
                        size="sm"
                      >
                        <Copy className="h-4 w-4 mr-1" /> Copiar
                      </Button>
                      <Button onClick={shareInvite} disabled={!activeHousehold?.inviteCode} size="sm">
                        <Share2 className="h-4 w-4 mr-1" /> Compartir
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Comparte este código para que otros puedan unirse a tu hogar.
                  </p>
                </div>

                {/* Members */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Miembros de la Familia ({activeHousehold.members?.length || 0})
                  </h4>

                  {activeHousehold.members && activeHousehold.members.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeHousehold.members.map((member: any, index: number) => {
                        const ownerId = activeHousehold.ownerId?.toString?.() ?? activeHousehold.ownerId
                        const modIds = (activeHousehold.moderators ?? []).map((m: any) => m?.toString?.() ?? m)
                        const memberId = member._id?.toString?.() ?? member._id
                        const role =
                          ownerId === memberId
                            ? "Dueño"
                            : modIds.includes(memberId)
                              ? "Administrador"
                              : "Miembro"
                        const roleClass =
                          role === "Dueño"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            : role === "Administrador"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200"
                        return (
                          <div
                            key={member._id || index}
                            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                          >
                            <img
                              src={getImageUrl(member.profileImage)}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover"
                              onError={(e) => handleImageError(e)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{member.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${roleClass}`}>
                              {role}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No hay miembros en este hogar aún.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">No tienes un hogar activo seleccionado</p>
                <Button onClick={() => router.push("/select-household")}>Seleccionar Hogar</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Editar Perfil</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre</label>
                <input
                  type="text"
                  value={editingProfile.name}
                  onChange={(e) => setEditingProfile((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL de imagen de perfil
                </label>
                <input
                  type="url"
                  value={editingProfile.profileImage}
                  onChange={(e) => setEditingProfile((prev) => ({ ...prev, profileImage: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>

              {editingProfile.profileImage && (
                <div className="flex justify-center">
                  <img
                    src={editingProfile.profileImage || "/placeholder.svg"}
                    alt="Vista previa"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                    onError={(e) => handleImageError(e)}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowEditProfile(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={updateProfile} disabled={!editingProfile.name.trim()} className="flex-1">
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Household Modal */}
      {showEditHousehold && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Editar Grupo de Hogar</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del Grupo
                </label>
                <input
                  type="text"
                  value={editingHousehold.name}
                  onChange={(e) => setEditingHousehold((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Nombre del Grupo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL de imagen del Grupo
                </label>
                <input
                  type="url"
                  value={editingHousehold.imageUrl}
                  onChange={(e) => setEditingHousehold((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowEditHousehold(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={saveHousehold} disabled={!editingHousehold.name.trim()} className="flex-1">
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

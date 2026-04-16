"use client"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"
import { Settings } from "lucide-react"

type HouseholdCard = {
  _id: string
  name: string
  description: string
  membersCount: number
  inviteCode: string | null
  imageUrl?: string
  createdAt?: string
}

type HouseholdItem = {
  _id: string
  name: string
  imageUrl?: string
  inviteCode: string
  membersCount?: number
  currentUserRole?: "owner" | "moderator" | "member"
}

// Función auxiliar para parsear respuestas JSON de forma segura
async function parseJsonResponse(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type")
  if (!contentType || !contentType.includes("application/json")) {
    const text = await res.text()
    console.error("Respuesta no JSON recibida:", text.substring(0, 200))
    throw new Error("El servidor devolvió una respuesta inválida. Verifica que el servidor esté corriendo correctamente.")
  }
  return res.json()
}

export default function SelectHouseholdPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [households, setHouseholds] = useState<HouseholdItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const [name, setName] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [inviteCode, setInviteCode] = useState("")

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  const token = useMemo(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("token")
  }, [])

  // const headerLogoSrc = "https://files.catbox.moe/xhu5ls.png"

  const hasHouseholds = useMemo(() => households.length > 0, [households])

  async function fetchHouseholds() {
    if (!token) return
    try {
      setLoading(true)
      const res = await fetch("/api/households", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      
      const data = await parseJsonResponse(res)
      if (!res.ok) throw new Error(data?.message || "Error al cargar grupos")
      setHouseholds(data.households || [])
      setActiveId(data.activeHouseholdId || null)
    } catch (e: any) {
      console.error("Error en fetchHouseholds:", e)
      setError(e.message || "Error al cargar grupos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHouseholds()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function createHousehold() {
    if (!token) return
    if (!name || name.trim().length < 2) {
      toast({
        title: "Nombre inválido",
        description: "El nombre debe tener al menos 2 caracteres",
        variant: "destructive",
      })
      return
    }
    try {
      setCreating(true)
      const res = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, imageUrl }),
      })
      const data = await parseJsonResponse(res)
      if (!res.ok) throw new Error(data?.message || "No se pudo crear el grupo")

      localStorage.setItem("activeHouseholdId", data.household._id)
      toast({ title: "Grupo creado", description: `Se generó el código ${data.household.inviteCode}` })
      setName("")
      setImageUrl("")
      setShowCreateModal(false)
      router.push("/dashboard")
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  async function joinHousehold() {
    if (!token) return
    if (!inviteCode || inviteCode.trim().length < 4) {
      toast({ title: "Código inválido", description: "Ingresa un código válido", variant: "destructive" })
      return
    }
    try {
      setJoinLoading(true)
      const res = await fetch("/api/households/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      })
      const data = await parseJsonResponse(res)
      if (!res.ok) throw new Error(data?.message || "No se pudo unir al grupo")

      localStorage.setItem("activeHouseholdId", data.household._id)
      toast({ title: "Unido al grupo", description: `Te uniste a ${data.household.name}` })
      setInviteCode("")
      setShowJoinModal(false)
      router.push("/dashboard")
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setJoinLoading(false)
    }
  }

  async function setActive(householdId: string) {
    if (!token) return
    try {
      const res = await fetch("/api/households/set-active", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ householdId }),
      })
      const data = await parseJsonResponse(res)
      if (!res.ok) throw new Error(data?.message || "No se pudo activar el grupo")

      localStorage.setItem("activeHouseholdId", householdId)
      setActiveId(householdId)
      toast({ title: "Grupo activo", description: "Se ha establecido el grupo como activo" })
      router.push("/dashboard")
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("activeHouseholdId")
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="font-inter min-h-screen bg-gradient-to-br from-[#141414] via-[#333333] to-gray-900 text-white">
      {/* Background decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#004cad]/10 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite]" />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#45a5ee]/10 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite]"
          style={{ animationDelay: "-3s" }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 lg:p-8">
        <div className="flex items-center space-x-3">
          <img
            src="https://cdn.discordapp.com/attachments/416734955440308244/1412109067308110126/homeapp-logo.png?ex=69e10b8d&is=69dfba0d&hm=ac1b6ace8c064e513f3a9d59aaba998e65852b9f78df1c57fbcd2c6d486ea9d5&"
            alt="HomeApp"
            className="h-10 lg:h-12 w-auto"
          />
          <span className="text-2xl lg:text-3xl font-bold text-white">HomeApp</span>
        </div>
        <button onClick={logout} className="text-gray-300 hover:text-white transition-colors text-sm lg:text-base">
          Cerrar Sesión
        </button>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center mb-12 animate-[slideUp_.6s_ease-out]">
          <h1 className="text-4xl lg:text-6xl font-bold mb-4 text-white">¿Quién está organizando hoy?</h1>
          <p className="text-xl lg:text-2xl text-gray-300">Selecciona tu grupo de hogar para continuar</p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* Existing households */}
          {households.map((h, idx) => (
            <div
              key={h._id}
              className="household-card group relative animate-[scaleIn_.5s_ease-out] [animation-fill-mode:backwards]"
              style={{ animationDelay: `${idx * 0.06}s` }}
            >
              {(h.currentUserRole === "owner" || h.currentUserRole === "moderator") && (
                <Link
                  href={`/household-settings/${h._id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-2 right-2 z-10 p-2 rounded-lg bg-black/40 hover:bg-black/60 text-white transition-colors"
                  title="Configuración del grupo"
                >
                  <Settings className="h-5 w-5" />
                </Link>
              )}
              <button
                onClick={() => setActive(h._id)}
                className="w-full text-left"
              >
                <div className="relative">
                  <div className="w-48 h-48 lg:w-56 lg:h-56 mx-auto mb-4 relative">
                    <div className="w-full h-full bg-gradient-to-br from-[#004cad] to-[#45a5ee] rounded-2xl flex items-center justify-center shadow-2xl group-hover:shadow-3xl transition-all duration-300 group-hover:scale-110">
                      <Avatar className="h-24 w-24 lg:h-28 lg:w-28">
                        <AvatarImage
                          src={h.imageUrl || "/placeholder.svg?height=80&width=80&query=household%20avatar"}
                          alt={h.name}
                        />
                        <AvatarFallback className="text-2xl font-bold">{h.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="text-white absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
                      {h.membersCount || 1} {(h.membersCount || 1) === 1 ? "miembro" : "miembros"}
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="text-xl lg:text-2xl font-bold text-white mb-2 group-hover:text-[#45a5ee] transition-colors">
                      {h.name}
                    </h3>
                    <p className="text-gray-400 text-sm lg:text-base mb-3 line-clamp-2">Grupo familiar</p>
                    <div className="flex justify-center space-x-2 text-xs">
                      {h.inviteCode && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                          Código: {h.inviteCode}
                        </span>
                      )}
                      {activeId === h._id && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full">Activo</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          ))}

          {/* Create Household */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="household-card group cursor-pointer animate-[scaleIn_.5s_ease-out] [animation-fill-mode:backwards]"
            style={{ animationDelay: `${households.length * 0.06 + 0.1}s` }}
          >
            <div className="relative">
              <div className="w-48 h-48 lg:w-56 lg:h-56 mx-auto mb-4 relative">
                <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center shadow-2xl group-hover:shadow-3xl transition-all duration-300 group-hover:scale-110 border-2 border-dashed border-gray-500 group-hover:border-[#45a5ee]">
                  <svg
                    className="w-24 h-24 lg:w-28 lg:h-28 text-gray-400 group-hover:text-[#45a5ee] transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-2 group-hover:text-[#45a5ee] transition-colors">
                  Crear Grupo
                </h3>
                <p className="text-gray-400 text-sm lg:text-base mb-6">Organiza un nuevo hogar</p>
                <div className="text-xs text-gray-500">Invita a tu familia y comienza a organizarse</div>
              </div>
            </div>
          </button>

          {/* Join Household */}
          <button
            onClick={() => setShowJoinModal(true)}
            className="household-card group cursor-pointer animate-[scaleIn_.5s_ease-out] [animation-fill-mode:backwards]"
            style={{ animationDelay: `${households.length * 0.06 + 0.2}s` }}
          >
            <div className="relative">
              <div className="w-48 h-48 lg:w-56 lg:h-56 mx-auto mb-4 relative">
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl flex items-center justify-center shadow-2xl group-hover:shadow-3xl transition-all duration-300 group-hover:scale-110">
                  <svg
                    className="w-24 h-24 lg:w-28 lg:h-28 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v6m-6-9a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                  Unirse a Grupo
                </h3>
                <p className="text-gray-400 text-sm lg:text-base mb-6">Únete con un código</p>
                <div className="text-xs text-gray-500">¿Tienes una invitación? Ingresa el código aquí</div>
              </div>
            </div>
          </button>
        </div>

        {error && <p className="mt-8 text-red-400">{error}</p>}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">Crear Nuevo Grupo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nombre del Grupo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="Mi Familia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">URL de Imagen (opcional)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createHousehold}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {creating ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4">Unirse a Grupo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Código de Invitación</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="HOME-25-ABCD"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={joinHousehold}
                disabled={joinLoading}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {joinLoading ? "Uniéndose..." : "Unirse"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .household-card { transition: all 0.3s ease }
        .household-card:hover { transform: translateY(-8px) }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes scaleIn { 0% { transform: scale(.9); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        @keyframes slideUp { 0% { transform: translateY(30px); opacity: 0 } 100% { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  )
}

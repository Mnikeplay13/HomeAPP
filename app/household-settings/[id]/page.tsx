"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, UserMinus, UserPlus, Crown, Shield, User } from "lucide-react"

type Member = { _id: string; name: string; email: string }
type Role = "owner" | "moderator" | "member"

type HouseholdData = {
  _id: string
  name: string
  imageUrl?: string
  inviteCode: string
  ownerId: string
  moderators: string[]
  members: Member[]
  membersCount: number
  currentUserRole: Role
}

function getRoleBadge(role: Role) {
  switch (role) {
    case "owner":
      return (
        <Badge variant="default" className="bg-amber-600 hover:bg-amber-600">
          <Crown className="h-3 w-3 mr-1" />
          Dueño
        </Badge>
      )
    case "moderator":
      return (
        <Badge variant="secondary" className="bg-blue-600/20 text-blue-300">
          <Shield className="h-3 w-3 mr-1" />
          Moderador
        </Badge>
      )
    default:
      return (
        <Badge variant="outline">
          <User className="h-3 w-3 mr-1" />
          Miembro
        </Badge>
      )
  }
}

function getMemberRole(memberId: string, ownerId: string, moderators: string[]): Role {
  if (ownerId === memberId) return "owner"
  if (moderators.includes(memberId)) return "moderator"
  return "member"
}

export default function HouseholdSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [loading, setLoading] = useState(true)
  const [household, setHousehold] = useState<HouseholdData | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmTransfer, setConfirmTransfer] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem("token")
    const user = localStorage.getItem("user")
    if (!t || !user) {
      router.push("/login")
      return
    }
    setToken(t)
    try {
      const parsed = JSON.parse(user)
      setCurrentUserId(parsed._id)
    } catch {
      router.push("/login")
    }
  }, [router])

  async function fetchHousehold() {
    if (!token || !id) return
    try {
      setLoading(true)
      const res = await fetch(`/api/households/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "Error al cargar el grupo")
      setHousehold(data.household)
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
      router.push("/select-household")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token && id) fetchHousehold()
  }, [token, id])

  async function removeMember(member: Member) {
    if (!token || !id) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/households/${id}/members/${member._id}/remove`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "Error al expulsar")
      toast({ title: "Miembro expulsado", description: `${member.name} fue eliminado del grupo` })
      setConfirmRemove(null)
      fetchHousehold()
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  async function leaveGroup() {
    if (!token || !id) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/households/${id}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "Error al abandonar")
      toast({ title: "Has abandonado el grupo" })
      localStorage.removeItem("activeHouseholdId")
      setConfirmLeave(false)
      router.push("/select-household")
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  async function addModerator(userId: string) {
    if (!token || !id) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/households/${id}/moderators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "Error al asignar moderador")
      toast({ title: "Moderador asignado" })
      fetchHousehold()
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  async function removeModerator(userId: string) {
    if (!token || !id) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/households/${id}/moderators/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "Error al quitar moderador")
      toast({ title: "Moderador removido" })
      fetchHousehold()
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  async function transferOwnership(newOwnerId: string) {
    if (!token || !id) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/households/${id}/transfer-ownership`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newOwnerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "Error al transferir propiedad")
      toast({ title: "Propiedad transferida" })
      setConfirmTransfer(null)
      fetchHousehold()
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || !household) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isOwner = household.currentUserRole === "owner"
  const isModerator = household.currentUserRole === "moderator"
  const canRemoveMember = isOwner || isModerator

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto p-6">
        <Link
          href="/select-household"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a grupos
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Configuración del grupo</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {household.name} · Código: {household.inviteCode}
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Miembros ({household.membersCount})</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gestiona los roles y miembros del grupo
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {household.members.map((member) => {
                const role = getMemberRole(member._id, household.ownerId, household.moderators ?? [])
                const isCurrentUser = member._id === currentUserId
                const isTargetOwner = member._id === household.ownerId

                return (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={undefined} alt={member.name} />
                        <AvatarFallback>{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-gray-500">(tú)</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                        <div className="mt-1">{getRoleBadge(role)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner && !isTargetOwner && (
                        <>
                          {role === "moderator" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeModerator(member._id)}
                              disabled={actionLoading}
                            >
                              Quitar moderador
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addModerator(member._id)}
                              disabled={actionLoading}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Hacer moderador
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-600 border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                            onClick={() => setConfirmTransfer(member._id)}
                            disabled={actionLoading}
                          >
                            <Crown className="h-4 w-4 mr-1" />
                            Transferir propiedad
                          </Button>
                        </>
                      )}
                      {canRemoveMember && !isTargetOwner && !isCurrentUser && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setConfirmRemove(member)}
                          disabled={actionLoading}
                        >
                          <UserMinus className="h-4 w-4 mr-1" />
                          Expulsar
                        </Button>
                      )}
                      {isCurrentUser && !isTargetOwner && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmLeave(true)}
                          disabled={actionLoading}
                        >
                          Abandonar grupo
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {isOwner && (
              <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
                Para abandonar el grupo, primero debes transferir la propiedad a otro miembro.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expulsar miembro</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas expulsar a {confirmRemove?.name}? Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemove && removeMember(confirmRemove)}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Expulsar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonar el grupo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas abandonar este grupo? Tendrás que usar un código de
              invitación para volver a unirte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={leaveGroup}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Abandonar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmTransfer} onOpenChange={(o) => !o && setConfirmTransfer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transferir propiedad</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas transferir la propiedad del grupo? El nuevo dueño tendrá
              control total y tú pasarás a ser miembro regular.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmTransfer && transferOwnership(confirmTransfer)}
              disabled={actionLoading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Transferir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

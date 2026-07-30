"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2, Search, ShieldCheck, Shield, User as UserIcon,
  RefreshCw, Crown, Users as UsersIcon, UserPlus, Trash2, Shirt, X,
} from "lucide-react"

interface UsuarioAuth {
  id: string
  email: string
  nombre: string
  avatar_url: string | null
  rol: Rol
  creado: string
  ultimo_acceso: string | null
  pendiente: boolean
}

const ROL_CONFIG = {
  admin: {
    label: "Admin",
    icon: Crown,
    badge: "bg-yellow-400/20 text-yellow-400 border-yellow-400/30",
  },
  grandteam: {
    label: "Grand Team",
    icon: ShieldCheck,
    badge: "bg-blue-400/20 text-blue-300 border-blue-400/30",
  },
  remera: {
    label: "Remeras",
    icon: Shirt,
    badge: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30",
  },
  usuario: {
    label: "Usuario",
    icon: UserIcon,
    badge: "bg-zinc-700/40 text-zinc-300 border-zinc-600/40",
  },
} as const

type Rol = keyof typeof ROL_CONFIG
const ROLES: Rol[] = ["admin", "grandteam", "remera", "usuario"]

/**
 * La base puede tener roles viejos o escritos distinto ("Admin", "grand_team").
 * Se normaliza para no romper el render con un rol desconocido.
 */
const normalizarRol = (rol: string | null | undefined): Rol => {
  const limpio = (rol || "").trim().toLowerCase().replace(/[\s_-]/g, "")
  const encontrado = ROLES.find((r) => r === limpio)
  return encontrado ?? "usuario"
}

const configDeRol = (rol: string | null | undefined) => ROL_CONFIG[normalizarRol(rol)]
// Roles que se pueden asignar al invitar a alguien nuevo
const ROLES_ASIGNABLES: Rol[] = ["admin", "grandteam", "remera"]

export default function AdminUsuariosPage() {
  const router = useRouter()
  const { user, session, loading: authLoading } = useSupabaseContext()
  const { toast } = useToast()

  const [usuarios, setUsuarios] = useState<UsuarioAuth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // La autoridad sobre el acceso es el servidor: si el GET responde 403,
  // se muestra la pantalla de acceso restringido.
  const [denegado, setDenegado] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRol, setFilterRol] = useState<string>("all")
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null)

  // Formulario de alta
  const [mostrarAlta, setMostrarAlta] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [nuevoEmail, setNuevoEmail] = useState("")
  const [nuevoRol, setNuevoRol] = useState<Rol>("grandteam")
  const [creando, setCreando] = useState(false)

  const fetchUsuarios = useCallback(async () => {
    const token = session?.access_token
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/usuarios", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setDenegado(res.status === 403)
        setError(data.error || "Error al cargar usuarios")
        setUsuarios([])
      } else {
        setDenegado(false)
        const lista = (data.usuarios || []) as UsuarioAuth[]
        setUsuarios(lista.map((u) => ({ ...u, rol: normalizarRol(u.rol) })))
      }
    } catch {
      setError("Error de red al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login?returnUrl=/admin/usuarios")
      return
    }
    fetchUsuarios()
  }, [authLoading, user, router, fetchUsuarios])

  const guardarRol = async (
    usuario: Pick<UsuarioAuth, "email" | "nombre"> & { id?: string },
    rol: Rol
  ) => {
    const token = session?.access_token
    if (!token) return { ok: false }

    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: usuario.email,
        role: rol,
        authUserId: usuario.id?.startsWith("pendiente:") ? undefined : usuario.id,
        nombre: usuario.nombre,
      }),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, error: data?.error as string | undefined }
  }

  const cambiarRol = async (usuario: UsuarioAuth, nuevoRolSel: Rol) => {
    if (usuario.rol === nuevoRolSel) return

    if (usuario.email === user?.email?.toLowerCase() && nuevoRolSel !== "admin") {
      const ok = confirm(
        "Estas por quitarte el rol admin a vos mismo. Perderas acceso al panel. Continuar?"
      )
      if (!ok) return
    }

    setUpdatingEmail(usuario.email)
    const previo = usuarios
    setUsuarios((list) =>
      list.map((u) => (u.email === usuario.email ? { ...u, rol: nuevoRolSel } : u))
    )

    try {
      const { ok, error: err } = await guardarRol(usuario, nuevoRolSel)
      if (!ok) {
        setUsuarios(previo)
        toast({ title: "No se pudo cambiar el rol", description: err, variant: "destructive" })
      } else if (nuevoRolSel === "usuario" && usuario.pendiente) {
        // Un pendiente sin rol ya no tiene por que figurar en la lista
        setUsuarios((list) => list.filter((u) => u.email !== usuario.email))
      }
    } catch {
      setUsuarios(previo)
      toast({ title: "Error de red al cambiar el rol", variant: "destructive" })
    } finally {
      setUpdatingEmail(null)
    }
  }

  const agregarUsuario = async () => {
    const email = nuevoEmail.trim().toLowerCase()
    const nombre = nuevoNombre.trim()

    if (!nombre) {
      toast({ title: "Falta el nombre", variant: "destructive" })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "El email no es valido", variant: "destructive" })
      return
    }

    setCreando(true)
    const { ok, error: err } = await guardarRol({ email, nombre }, nuevoRol)
    setCreando(false)

    if (!ok) {
      toast({ title: "No se pudo agregar", description: err, variant: "destructive" })
      return
    }

    toast({
      title: `${nombre} agregado como ${ROL_CONFIG[nuevoRol].label}`,
      description: "Va a tener acceso cuando inicie sesion con Google usando ese email.",
    })
    setNuevoNombre("")
    setNuevoEmail("")
    setMostrarAlta(false)
    fetchUsuarios()
  }

  const eliminarPendiente = async (usuario: UsuarioAuth) => {
    const token = session?.access_token
    if (!token) return
    if (!confirm(`Eliminar la invitacion de ${usuario.email}?`)) return

    setUpdatingEmail(usuario.email)
    try {
      const res = await fetch(
        `/api/admin/usuarios?email=${encodeURIComponent(usuario.email)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: "No se pudo eliminar", description: data?.error, variant: "destructive" })
        return
      }
      setUsuarios((list) => list.filter((u) => u.email !== usuario.email))
      toast({ title: "Invitacion eliminada" })
    } finally {
      setUpdatingEmail(null)
    }
  }

  const filtered = usuarios.filter((u) => {
    const matchRol = filterRol === "all" || u.rol === filterRol
    const term = searchTerm.trim().toLowerCase()
    const matchSearch =
      !term ||
      u.email.toLowerCase().includes(term) ||
      u.nombre.toLowerCase().includes(term)
    return matchRol && matchSearch
  })

  const conteo = {
    admin: usuarios.filter((u) => u.rol === "admin").length,
    grandteam: usuarios.filter((u) => u.rol === "grandteam").length,
    remera: usuarios.filter((u) => u.rol === "remera").length,
    usuario: usuarios.filter((u) => u.rol === "usuario").length,
  }

  const formatFecha = (iso: string | null) => {
    if (!iso) return "Nunca"
    try {
      return new Date(iso).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    } catch {
      return "-"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
    )
  }

  if (denegado) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center px-4">
        <Card className="bg-zinc-900/80 border-zinc-800 max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h2 className="text-white font-bold text-lg mb-1">Acceso restringido</h2>
            <p className="text-zinc-400 text-sm mb-4">
              Solo los usuarios con rol <span className="text-yellow-400 font-semibold">admin</span> pueden
              gestionar roles.
            </p>
            {error && <p className="text-red-300/80 text-xs mb-4">{error}</p>}
            <Button onClick={fetchUsuarios} variant="outline" className="border-zinc-700 text-zinc-300">
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black pt-20">
      {/* Header */}
      <div className="border-b border-yellow-400/20 bg-black/50 backdrop-blur-sm sticky top-20 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-white">
                <span className="gradient-text">Usuarios y Roles</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} en el sistema
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setMostrarAlta((v) => !v)}
                className="bg-yellow-400 text-black hover:bg-yellow-500 font-semibold text-sm"
              >
                {mostrarAlta ? (
                  <><X className="w-4 h-4 mr-1.5" />Cerrar</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-1.5" />Agregar</>
                )}
              </Button>
              <Button
                onClick={fetchUsuarios}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:text-white text-sm"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Actualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && !denegado && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Alta de usuario */}
        {mostrarAlta && (
          <Card className="bg-zinc-900/80 border-yellow-400/30 mb-6">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div>
                <h2 className="text-white font-bold">Agregar admin o miembro del Grand Team</h2>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Se guarda el permiso por email. La persona obtiene acceso al iniciar sesion con
                  Google usando ese mismo correo.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-300 text-xs">Nombre</Label>
                  <Input
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Nombre y apellido"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300 text-xs">Email</Label>
                  <Input
                    type="email"
                    value={nuevoEmail}
                    onChange={(e) => setNuevoEmail(e.target.value)}
                    placeholder="persona@gmail.com"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-zinc-300 text-xs block mb-1.5">Rol</Label>
                <div className="flex gap-2 flex-wrap">
                  {ROLES_ASIGNABLES.map((rol) => {
                    const RolIcon = ROL_CONFIG[rol].icon
                    const activo = nuevoRol === rol
                    return (
                      <Button
                        key={rol}
                        type="button"
                        size="sm"
                        variant={activo ? "default" : "outline"}
                        onClick={() => setNuevoRol(rol)}
                        className={
                          activo
                            ? "bg-yellow-400 text-black hover:bg-yellow-500"
                            : "border-zinc-700 text-zinc-400 hover:text-white"
                        }
                      >
                        <RolIcon className="w-3.5 h-3.5 mr-1.5" />
                        {ROL_CONFIG[rol].label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <Button
                onClick={agregarUsuario}
                disabled={creando}
                className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700 font-semibold"
              >
                {creando ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" />Agregar usuario</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats por rol */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {ROLES.map((rol) => {
            const config = ROL_CONFIG[rol]
            const Icon = config.icon
            return (
              <Card key={rol} className="bg-zinc-900/80 border-zinc-800">
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <Icon className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="text-xl sm:text-2xl font-black text-white">{conteo[rol]}</div>
                    <div className="text-xs text-gray-400">{config.label}</div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-700 text-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", ...ROLES].map((rol) => (
              <Button
                key={rol}
                variant={filterRol === rol ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterRol(rol)}
                className={
                  filterRol === rol
                    ? "bg-yellow-400 text-black hover:bg-yellow-500"
                    : "border-zinc-700 text-zinc-400 hover:text-white"
                }
              >
                {rol === "all" ? "Todos" : configDeRol(rol).label}
              </Button>
            ))}
          </div>
        </div>

        {/* Listado */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg">
            <UsersIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No hay usuarios que coincidan con el filtro.
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((usuario) => {
              const config = configDeRol(usuario.rol)
              const esYoMismo = usuario.email === user?.email?.toLowerCase()
              return (
                <Card
                  key={usuario.id}
                  className="bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 transition-all"
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      {/* Avatar */}
                      <div className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                        {usuario.avatar_url ? (
                          <img
                            src={usuario.avatar_url}
                            alt={usuario.nombre}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-yellow-400 text-sm font-bold">
                            {usuario.nombre.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-white font-bold text-sm sm:text-base truncate">
                            {usuario.nombre}
                          </h3>
                          <Badge className={config.badge}>{config.label}</Badge>
                          {esYoMismo && (
                            <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-600">
                              Vos
                            </Badge>
                          )}
                          {usuario.pendiente && (
                            <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/40">
                              Pendiente de ingreso
                            </Badge>
                          )}
                        </div>
                        <p className="text-zinc-400 text-xs sm:text-sm truncate">{usuario.email}</p>
                        <p className="text-zinc-600 text-[11px] mt-0.5">
                          Ultimo acceso: {formatFecha(usuario.ultimo_acceso)}
                        </p>
                      </div>

                      {/* Selector de rol */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {updatingEmail === usuario.email ? (
                          <Loader2 className="w-4 h-4 text-yellow-400 animate-spin mx-3" />
                        ) : (
                          <>
                            {ROLES.map((rol) => {
                              const activo = usuario.rol === rol
                              const RolIcon = ROL_CONFIG[rol].icon
                              return (
                                <Button
                                  key={rol}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => cambiarRol(usuario, rol)}
                                  title={`Cambiar a ${ROL_CONFIG[rol].label}`}
                                  className={[
                                    "h-8 px-2 text-xs",
                                    activo
                                      ? "bg-yellow-400/15 text-yellow-400"
                                      : "text-zinc-500 hover:text-white",
                                  ].join(" ")}
                                >
                                  <RolIcon className="w-3.5 h-3.5 lg:mr-1" />
                                  <span className="hidden lg:inline">{ROL_CONFIG[rol].label}</span>
                                </Button>
                              )
                            })}
                            {usuario.pendiente && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => eliminarPendiente(usuario)}
                                title="Eliminar invitacion"
                                className="h-8 px-2 text-red-400 hover:bg-red-400/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <p className="text-zinc-600 text-xs mt-6 text-center">
          Tras cambiar un rol, el usuario debe cerrar sesion y volver a entrar para que tome efecto.
        </p>
      </div>
    </div>
  )
}

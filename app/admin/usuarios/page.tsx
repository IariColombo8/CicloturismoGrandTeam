"use client"

import { useEffect, useState, useCallback } from "react"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, Search, ShieldCheck, Shield, User as UserIcon,
  RefreshCw, Crown, Users as UsersIcon,
} from "lucide-react"

interface UsuarioAuth {
  id: string
  email: string
  nombre: string
  avatar_url: string | null
  rol: "admin" | "grandteam" | "usuario"
  creado: string
  ultimo_acceso: string | null
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
  usuario: {
    label: "Usuario",
    icon: UserIcon,
    badge: "bg-zinc-700/40 text-zinc-300 border-zinc-600/40",
  },
} as const

type Rol = keyof typeof ROL_CONFIG
const ROLES: Rol[] = ["admin", "grandteam", "usuario"]

export default function AdminUsuariosPage() {
  const { user, userRole, session, loading: authLoading } = useSupabaseContext()
  const [usuarios, setUsuarios] = useState<UsuarioAuth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRol, setFilterRol] = useState<string>("all")
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null)

  // Solo admin puede gestionar roles
  const isAuthorized = userRole === "admin"

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
        setError(data.error || "Error al cargar usuarios")
        setUsuarios([])
      } else {
        setUsuarios(data.usuarios || [])
      }
    } catch {
      setError("Error de red al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthorized || !user) {
      setLoading(false)
      return
    }
    fetchUsuarios()
  }, [authLoading, isAuthorized, user, fetchUsuarios])

  const cambiarRol = async (usuario: UsuarioAuth, nuevoRol: Rol) => {
    if (usuario.rol === nuevoRol) return
    const token = session?.access_token
    if (!token) return

    // Evitar que el admin se quite a si mismo el rol admin sin querer
    if (usuario.email === user?.email && nuevoRol !== "admin") {
      const ok = confirm(
        "Estas por quitarte el rol admin a vos mismo. Perderas acceso al panel. Continuar?"
      )
      if (!ok) return
    }

    setUpdatingEmail(usuario.email)
    // Optimista
    const prev = usuarios
    setUsuarios((list) =>
      list.map((u) => (u.email === usuario.email ? { ...u, rol: nuevoRol } : u))
    )

    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: usuario.email,
          role: nuevoRol,
          authUserId: usuario.id,
          nombre: usuario.nombre,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUsuarios(prev) // rollback
        alert(data.error || "No se pudo cambiar el rol")
      }
    } catch {
      setUsuarios(prev) // rollback
      alert("Error de red al cambiar el rol")
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

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center px-4">
        <Card className="bg-zinc-900/80 border-zinc-800 max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h2 className="text-white font-bold text-lg mb-1">Acceso restringido</h2>
            <p className="text-zinc-400 text-sm">
              Solo los usuarios con rol <span className="text-yellow-400 font-semibold">admin</span> pueden
              gestionar roles.
            </p>
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
                {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} registrado
                {usuarios.length !== 1 ? "s" : ""} con Google
              </p>
            </div>
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Stats por rol */}
        <div className="grid grid-cols-3 gap-3 mb-6">
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
                {rol === "all" ? "Todos" : ROL_CONFIG[rol as Rol].label}
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
              const config = ROL_CONFIG[usuario.rol]
              const esYoMismo = usuario.email === user?.email
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
                          ROLES.map((rol) => {
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
                                <RolIcon className="w-3.5 h-3.5 sm:mr-1" />
                                <span className="hidden sm:inline">{ROL_CONFIG[rol].label}</span>
                              </Button>
                            )
                          })
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

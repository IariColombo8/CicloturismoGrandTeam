"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { useIsMobile } from "@/components/ui/use-mobile"
import { exportToCSV } from "@/lib/exportUtils"
import { emailService } from "@/lib/emailService"
import {
  Users,
  CheckCircle,
  Clock,
  X,
  DollarSign,
  Search,
  Filter,
  Eye,
  Download,
  RefreshCw,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FilterX,
  Mail,
  Phone,
  User,
  ClipboardList,
  Edit,
  XCircle as XCircleIcon,
  Loader2,
  AlertTriangle,
} from "lucide-react"

// Columnas que pedimos a Supabase (sin comprobante_base64, que es pesado).
// No se consulta `provincia` ni `talla_camiseta`: ambas dejaron de formar parte
// del esquema vigente de participantes.
const INSCRIPCIONES_COLUMNS =
  "id, estado, nombre, apellido, email, dni, pais, localidad, grupo_ciclistas, es_celiaco, " +
  "metodo_pago, numero_referencia, fecha_nacimiento, grupo_sanguineo, telefono, " +
  "tiene_alergias, alergias, tiene_problemas_salud, condicion_salud, comprobante_pago_url, " +
  "nota_estado, numero_inscripcion, fecha_inscripcion, token_qr"

// Respaldo temporal para bases que todavía tengan una vista, función o política
// desactualizada que falle al resolver la ubicación. Permite que el administrador
// siga cargando el listado mientras se corrige esa dependencia en Supabase.
const INSCRIPCIONES_COLUMNS_WITHOUT_LOCATION =
  "id, estado, nombre, apellido, email, dni, metodo_pago, numero_referencia, " +
  "fecha_nacimiento, grupo_sanguineo, telefono, tiene_alergias, alergias, " +
  "tiene_problemas_salud, condicion_salud, comprobante_pago_url, nota_estado, " +
  "numero_inscripcion, fecha_inscripcion, token_qr"

// "participantes" es historico (acumula todas las ediciones via anios[]).
// Esta pantalla es de la edicion actual: siempre filtramos por anio.
const EDICION_ACTUAL = 2026

interface Stats {
  total: number
  confirmadas: number
  pendientes: number
  rechazadas: number
}

export default function RegistroInscripciones() {
  const router = useRouter()
  const { user, session, userRole, loading: authLoading } = useSupabaseContext()
  const isMobile = useIsMobile()

  // Datos paginados
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  // Paginacion server-side
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Stats (consulta separada, ligera)
  const [stats, setStats] = useState<Stats>({ total: 0, confirmadas: 0, pendientes: 0, rechazadas: 0 })

  // Modal
  const [selectedInscripcion, setSelectedInscripcion] = useState<any>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [statusNote, setStatusNote] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [openingComprobante, setOpeningComprobante] = useState<string | null>(null)
  const [comprobanteModal, setComprobanteModal] = useState<{
    url: string
    source: string
    kind: "image" | "pdf" | "unknown"
  } | null>(null)

  // Debounce timer para busqueda
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const topRef = useRef(null)

  const isAuthorized = userRole === "admin" || userRole === "grandteam"

  // Redirigir si no autorizado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?returnUrl=/admin/registro-inscripciones")
    } else if (!authLoading && user && !isAuthorized) {
      router.push("/")
    }
  }, [authLoading, user, isAuthorized, router])

  // Ajustar items por pagina segun dispositivo (solo al montar)
  const hasAdjusted = useRef(false)
  useEffect(() => {
    if (hasAdjusted.current) return
    setItemsPerPage(isMobile ? 10 : 25)
    hasAdjusted.current = true
  }, [isMobile])

  // --- Fetch paginado server-side ---
  const fetchPage = useCallback(
    async (page: number, perPage: number, search: string, status: string) => {
      const from = (page - 1) * perPage
      const to = from + perPage - 1

      const buildQuery = (columns: string) => {
        let query = supabase
          .from("participantes")
          .select(columns, { count: "exact" })
          .contains("anios", [EDICION_ACTUAL])
          .order("fecha_inscripcion", { ascending: false })

        if (status !== "all") {
          query = query.eq("estado", status)
        }

        if (search.trim()) {
          const term = `%${search.trim()}%`
          query = query.or(
            `nombre.ilike.${term},apellido.ilike.${term},email.ilike.${term},dni.ilike.${term}`
          )
        }

        return query.range(from, to)
      }

      const primaryResult = await buildQuery(INSCRIPCIONES_COLUMNS)
      let data: any[] | null = primaryResult.data as any[] | null
      let count: number | null = primaryResult.count
      let fetchError = primaryResult.error

      // Algunas instalaciones antiguas pueden conservar una vista, función o
      // política que todavía referencia `participantes.provincia`. Este archivo
      // jamás solicita esa columna. Si Supabase devuelve ese error, reintentamos
      // sin los campos de ubicación para no bloquear toda la administración.
      if (
        fetchError &&
        /participantes\.provincia|column .*provincia.* does not exist/i.test(fetchError.message)
      ) {
        console.warn(
          "Supabase conserva una dependencia antigua sobre participantes.provincia; " +
            "se carga el listado sin ubicación como respaldo.",
          fetchError
        )

        const fallbackResult = await buildQuery(INSCRIPCIONES_COLUMNS_WITHOUT_LOCATION)
        data = fallbackResult.data as any[] | null
        count = fallbackResult.count
        fetchError = fallbackResult.error
      }

      if (fetchError) {
        console.error("Error al cargar inscripciones:", fetchError)
        setError(`Error al cargar datos: ${fetchError.message}`)
        setInscripciones([])
        setTotalCount(0)
        return
      }

      setError(null)
      setTotalCount(count ?? 0)
      setInscripciones(
        (data || []).map((d: any) => ({
          id: d.id,
          nombres: d.nombre,
          apellidos: d.apellido,
          email: d.email,
          dni: d.dni,
          pais: d.pais ?? "",
          localidad: d.localidad ?? "",
          ciudad: d.localidad ?? "",
          grupoCiclistas: d.grupo_ciclistas ?? "",
          esCeliaco: d.es_celiaco ?? null,
          estado: d.estado,
          metodoPago: d.metodo_pago,
          numeroReferencia: d.numero_referencia,
          fechaNacimiento: d.fecha_nacimiento,
          grupoSanguineo: d.grupo_sanguineo,
          tipoSangre: d.grupo_sanguineo,
          telefono: d.telefono,
          tieneAlergias: d.tiene_alergias,
          alergias: d.alergias,
          tieneProblemasSalud: d.tiene_problemas_salud,
          condicionSalud: d.condicion_salud,
          comprobantePagoUrl: d.comprobante_pago_url,
          nota: d.nota_estado,
          numeroInscripcion: d.numero_inscripcion,
          fechaInscripcion: d.fecha_inscripcion,
          tokenQR: d.token_qr,
        }))
      )
    },
    []
  )

  // --- Fetch stats (solo conteos, sin datos) ---
  const fetchStats = useCallback(async () => {
    // Para contar no usamos `select(*)`: pedir solo `id` evita expandir columnas
    // antiguas o pesadas y mantiene la consulta independiente de `provincia`.
    const base = () =>
      supabase
        .from("participantes")
        .select("id", { count: "exact", head: true })
        .contains("anios", [EDICION_ACTUAL])
    const [totalRes, confirmRes, pendRes, rechRes] = await Promise.all([
      base(),
      base().eq("estado", "confirmada"),
      base().eq("estado", "pendiente"),
      base().eq("estado", "rechazada"),
    ])

    setStats({
      total: totalRes.count ?? 0,
      confirmadas: confirmRes.count ?? 0,
      pendientes: pendRes.count ?? 0,
      rechazadas: rechRes.count ?? 0,
    })
  }, [])

  // Carga inicial
  useEffect(() => {
    if (!isAuthorized || !user) return

    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchPage(currentPage, itemsPerPage, searchTerm, statusFilter),
        fetchStats(),
      ])
      setLoading(false)
    }
    loadData()

    // Realtime: re-fetch pagina actual cuando cambia la tabla
    const channel = supabase
      .channel("registro-inscripciones")
      .on("postgres_changes", { event: "*", schema: "public", table: "participantes" }, () => {
        fetchPage(currentPage, itemsPerPage, searchTerm, statusFilter)
        fetchStats()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAuthorized, user, currentPage, itemsPerPage, statusFilter])
  // searchTerm se maneja via debounce, no como dependencia directa

  // Debounce de busqueda (400ms)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    searchTimerRef.current = setTimeout(() => {
      setCurrentPage(1)
      fetchPage(1, itemsPerPage, searchTerm, statusFilter)
    }, 400)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchTerm, fetchPage, itemsPerPage, statusFilter])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchPage(currentPage, itemsPerPage, searchTerm, statusFilter),
      fetchStats(),
    ])
    setRefreshing(false)
  }

  const scrollToTop = () => {
    if (typeof window === "undefined") return
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const indexOfFirst = (currentPage - 1) * itemsPerPage + 1
  const indexOfLast = Math.min(currentPage * itemsPerPage, totalCount)

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
      scrollToTop()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmada":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle className="w-3 h-3 inline mr-1" />
            Confirmada
          </span>
        )
      case "rechazada":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircleIcon className="w-3 h-3 inline mr-1" />
            Rechazada
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Clock className="w-3 h-3 inline mr-1" />
            Pendiente
          </span>
        )
    }
  }

  const openDetailsModal = (insc: any) => {
    setSelectedInscripcion(insc)
    setNewStatus(insc.estado || "pendiente")
    setStatusNote(insc.nota || "")
    setIsDetailsModalOpen(true)
  }

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false)
    setSelectedInscripcion(null)
  }

  const openComprobante = async (source?: string | null) => {
    if (!source) return

    setOpeningComprobante(source)
    try {
      if (!session?.access_token) {
        throw new Error("La sesión venció. Volvé a iniciar sesión.")
      }

      const response = await fetch("/api/admin/comprobante", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ source }),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.signedUrl) {
        throw new Error(body.error || "No se pudo abrir el comprobante")
      }

      const cleanSource = source.split("?")[0].toLowerCase()
      const kind = cleanSource.endsWith(".pdf")
        ? "pdf"
        : /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(cleanSource)
          ? "image"
          : "unknown"

      setComprobanteModal({
        url: body.signedUrl,
        source,
        kind,
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo abrir el comprobante")
    } finally {
      setOpeningComprobante(null)
    }
  }

  const closeComprobanteModal = () => {
    setComprobanteModal(null)
  }

  useEffect(() => {
    if (!comprobanteModal || typeof document === "undefined") return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeComprobanteModal()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [comprobanteModal])

  const updateStatus = async () => {
    if (!selectedInscripcion) return

    setUpdatingStatus(true)
    try {
      const { error: updateError } = await supabase
        .from("participantes")
        .update({
          estado: newStatus,
          nota_estado: statusNote,
        })
        .eq("id", selectedInscripcion.id)

      if (updateError) throw updateError

      // Enviar email de confirmacion con QR recien acá, al aprobar.
      // Evita reenviarlo si ya estaba confirmada (edicion de nota, etc).
      if (newStatus === "confirmada" && selectedInscripcion.estado !== "confirmada") {
        try {
          await emailService.sendConfirmationEmail({
            email: selectedInscripcion.email,
            nombreCompleto: `${selectedInscripcion.nombres} ${selectedInscripcion.apellidos}`,
            numeroInscripcion: String(selectedInscripcion.numeroInscripcion),
            tokenQR: selectedInscripcion.tokenQR,
            ubicacion: "Concepcion del Uruguay, Entre Rios",
          })
        } catch (emailError) {
          console.error("Error enviando email de confirmación:", emailError)
        }
      }

      // Actualizar optimistamente en la lista local
      setInscripciones((prev) =>
        prev.map((insc) =>
          insc.id === selectedInscripcion.id
            ? { ...insc, estado: newStatus, nota: statusNote }
            : insc
        )
      )
      fetchStats()
      closeDetailsModal()
    } catch (err: any) {
      console.error("Error updating registration:", err)
      alert("Error al actualizar el estado: " + (err?.message || ""))
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Exportar CSV: descarga TODAS las inscripciones filtradas (no solo la pagina actual)
  const exportarCSV = async () => {
    let query = supabase
      .from("participantes")
      .select(INSCRIPCIONES_COLUMNS)
      .contains("anios", [EDICION_ACTUAL])
      .order("fecha_inscripcion", { ascending: false })

    if (statusFilter !== "all") query = query.eq("estado", statusFilter)
    if (searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`
      query = query.or(
        `nombre.ilike.${term},apellido.ilike.${term},email.ilike.${term},dni.ilike.${term}`
      )
    }

    const { data } = await query
    const datos = (data || []).map((d: any) => ({
      "N Inscripcion": d.numero_inscripcion || "",
      Nombres: d.nombre || "",
      Apellidos: d.apellido || "",
      DNI: d.dni || "",
      Email: d.email || "",
      Telefono: d.telefono || "",
      Pais: d.pais || "",
      Localidad: d.localidad || "",
      "Grupo Ciclistas": d.grupo_ciclistas || "Sin grupo",
      "Es Celiaco": d.es_celiaco === true ? "Si" : d.es_celiaco === false ? "No" : "",
      "Grupo Sanguineo": (d.grupo_sanguineo || "").toUpperCase(),
      "Condicion de Salud": d.condicion_salud || "",
      "Metodo Pago": d.metodo_pago || "",
      "N Referencia": d.numero_referencia || "",
      Estado: d.estado || "pendiente",
      Nota: d.nota_estado || "",
      "Fecha Inscripcion": d.fecha_inscripcion
        ? new Date(d.fecha_inscripcion).toLocaleDateString("es-AR")
        : "",
    }))
    exportToCSV(datos, `inscripciones_${new Date().toISOString().slice(0, 10)}`)
  }

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
          <div className="text-yellow-400 text-lg">Cargando inscripciones...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div
          ref={topRef}
          className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-yellow-400/20 pb-4 gap-4 animate-fadeIn"
        >
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-4xl font-black text-yellow-400 tracking-tight">
              Registro de Inscripciones
            </h1>
            <p className="text-gray-400 mt-1 text-sm md:text-base">Gestiona todas las inscripciones del evento</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-yellow-400/20 text-yellow-400 hover:bg-zinc-700 transition-all text-sm ${refreshing ? "opacity-70" : ""}`}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{refreshing ? "Actualizando..." : "Actualizar"}</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-medium text-sm">Error al cargar datos</p>
              <p className="text-red-400/70 text-xs mt-1">{error}</p>
              <p className="text-gray-500 text-xs mt-2">
                Verifica que las tablas y politicas RLS esten configuradas en Supabase.
              </p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-6 animate-fadeIn">
          {[
            { title: "Total", value: stats.total, icon: Users, color: "blue" },
            { title: "Confirmadas", value: stats.confirmadas, icon: CheckCircle, color: "green" },
            { title: "Pendientes", value: stats.pendientes, icon: Clock, color: "yellow" },
            { title: "Rechazadas", value: stats.rechazadas, icon: XCircleIcon, color: "red" },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.title} className="bg-zinc-900 border border-yellow-400/20 rounded-lg p-4 hover:border-yellow-400/40 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs text-gray-400">{stat.title}</div>
                  <Icon className={`w-4 h-4 text-${stat.color}-400`} />
                </div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </div>
            )
          })}
        </div>

        {/* Main Content */}
        <div className="bg-black/60 border border-yellow-400/20 rounded-lg backdrop-blur-sm animate-fadeIn">
          <div className="p-4 border-b border-yellow-400/20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-yellow-400" />
                  Listado de Inscripciones
                </h2>
                {totalCount > 0 && (
                  <p className="text-sm text-gray-400 mt-1">
                    Mostrando {indexOfFirst}-{indexOfLast} de {totalCount}
                  </p>
                )}
              </div>
              <button
                onClick={exportarCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-yellow-400/20 text-yellow-400 hover:bg-zinc-700 transition-all text-sm"
                title={`Exportar inscripciones a CSV`}
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, apellido, DNI, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-yellow-400/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/40 text-sm"
              />
            </div>

            {/* Mobile Filters Toggle */}
            <div className="md:hidden mb-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full flex items-center justify-between px-4 py-2 bg-zinc-800 border border-yellow-400/20 rounded-lg text-white text-sm"
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros
                </div>
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Filters */}
            <div className={`${showFilters ? "block" : "hidden"} md:block`}>
              <div className="flex flex-col md:flex-row gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-4 py-2 bg-zinc-800 border border-yellow-400/20 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400/40"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="confirmada">Confirmadas</option>
                  <option value="rechazada">Rechazadas</option>
                </select>
                {(searchTerm || statusFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSearchTerm("")
                      setStatusFilter("all")
                      setCurrentPage(1)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-yellow-400/20 rounded-lg text-yellow-400 hover:bg-zinc-700 transition-all text-sm"
                  >
                    <FilterX className="w-4 h-4" />
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {inscripciones.length > 0 ? (
              <table className="w-full">
                <thead className="bg-zinc-800/50 border-b border-yellow-400/20">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 hidden md:table-cell">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 hidden md:table-cell">Ciudad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-yellow-400/10">
                  {inscripciones.map((insc, index) => (
                    <tr key={insc.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {insc.numeroInscripcion || (indexOfFirst + index)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-yellow-400 text-sm">
                          {insc.nombres} {insc.apellidos}
                        </div>
                        <div className="text-xs text-gray-500 md:hidden">{insc.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">{insc.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">{insc.ciudad}</td>
                      <td className="px-4 py-3">{getStatusBadge(insc.estado)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {insc.comprobantePagoUrl && (
                            <button
                              type="button"
                              onClick={() => openComprobante(insc.comprobantePagoUrl)}
                              disabled={openingComprobante === insc.comprobantePagoUrl}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 disabled:opacity-60 disabled:cursor-wait transition-all text-xs"
                              title="Ver comprobante de pago"
                            >
                              {openingComprobante === insc.comprobantePagoUrl ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                              <span className="hidden lg:inline">
                                {openingComprobante === insc.comprobantePagoUrl
                                  ? "Abriendo..."
                                  : "Comprobante"}
                              </span>
                            </button>
                          )}
                          <button
                            onClick={() => openDetailsModal(insc)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-800 border border-yellow-400/20 text-yellow-400 hover:bg-zinc-700 transition-all text-xs"
                          >
                            <Eye className="w-3 h-3" />
                            <span className="hidden sm:inline">Ver</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-gray-600 mb-3" />
                <p className="text-gray-400 text-center">
                  {searchTerm || statusFilter !== "all"
                    ? "No se encontraron inscripciones con los filtros aplicados"
                    : "No hay inscripciones registradas en la tabla 'inscripciones'"}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-yellow-400/20 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-xs text-gray-400">
                Pagina {currentPage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-zinc-800 border border-yellow-400/20 text-yellow-400 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => paginate(pageNum)}
                      className={`px-3 py-1 rounded-lg text-sm transition-all ${
                        currentPage === pageNum
                          ? "bg-yellow-400 text-black font-semibold"
                          : "bg-zinc-800 border border-yellow-400/20 text-yellow-400 hover:bg-zinc-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-zinc-800 border border-yellow-400/20 text-yellow-400 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-3 py-1 bg-zinc-800 border border-yellow-400/20 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400/40"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          )}
        </div>

        {/* Scroll to top */}
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Volver arriba"
          className="fixed right-4 z-40 p-3 rounded-full bg-yellow-400 text-black hover:bg-yellow-500 shadow-lg hover:shadow-xl transition-all bottom-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <ArrowUp className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Details Modal */}
        {isDetailsModalOpen && selectedInscripcion && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-yellow-400/20 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
              <div className="sticky top-0 bg-zinc-900 border-b border-yellow-400/20 p-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Detalles de Inscripcion
                </h2>
                <button onClick={closeDetailsModal} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Personal Info */}
                <div className="bg-zinc-800/50 border border-yellow-400/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-3">
                    <User className="w-4 h-4" />
                    Informacion Personal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-gray-400">Nombre Completo</div>
                      <div className="text-sm font-medium text-white">{selectedInscripcion.nombres} {selectedInscripcion.apellidos}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">DNI</div>
                      <div className="text-sm text-white">{selectedInscripcion.dni || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Fecha de Nacimiento</div>
                      <div className="text-sm text-white">{selectedInscripcion.fechaNacimiento || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="bg-zinc-800/50 border border-yellow-400/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-3">
                    <Mail className="w-4 h-4" />
                    Informacion de Contacto
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-400">Email</div>
                      <div className="text-sm text-white break-words">{selectedInscripcion.email}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Telefono</div>
                      <div className="text-sm text-white">{selectedInscripcion.telefono || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">País</div>
                      <div className="text-sm text-white">{selectedInscripcion.pais || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Ciudad/Localidad</div>
                      <div className="text-sm text-white">{selectedInscripcion.localidad || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* Event Info */}
                <div className="bg-zinc-800/50 border border-yellow-400/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-3">
                    <ClipboardList className="w-4 h-4" />
                    Informacion del Evento
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-gray-400">Grupo de ciclistas</div>
                      <div className="text-sm text-white">{selectedInscripcion.grupoCiclistas || "Sin grupo"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Grupo sanguíneo</div>
                      <div className="text-sm text-white uppercase">{selectedInscripcion.grupoSanguineo || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Celíaco/a</div>
                      <div className="text-sm text-white">
                        {selectedInscripcion.esCeliaco === true ? "Sí" : selectedInscripcion.esCeliaco === false ? "No" : "-"}
                      </div>
                    </div>
                  </div>
                  {(selectedInscripcion.condicionSalud || selectedInscripcion.alergias) && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedInscripcion.condicionSalud && (
                        <div>
                          <div className="text-xs text-gray-400">Condición de salud</div>
                          <div className="text-sm text-white whitespace-pre-wrap">{selectedInscripcion.condicionSalud}</div>
                        </div>
                      )}
                      {selectedInscripcion.alergias && (
                        <div>
                          <div className="text-xs text-gray-400">Alergias</div>
                          <div className="text-sm text-white whitespace-pre-wrap">{selectedInscripcion.alergias}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment Info */}
                <div className="bg-zinc-800/50 border border-yellow-400/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4" />
                    Informacion de Pago
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-400">Metodo de Pago</div>
                      <div className="text-sm text-white capitalize">{selectedInscripcion.metodoPago?.replace("_", " ") || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">N de Referencia</div>
                      <div className="text-sm text-white font-mono">{selectedInscripcion.numeroReferencia || "-"}</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    {selectedInscripcion.comprobantePagoUrl ? (
                      <button
                        type="button"
                        onClick={() => openComprobante(selectedInscripcion.comprobantePagoUrl)}
                        disabled={openingComprobante === selectedInscripcion.comprobantePagoUrl}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 disabled:opacity-60 disabled:cursor-wait transition-all text-sm font-semibold"
                      >
                        {openingComprobante === selectedInscripcion.comprobantePagoUrl ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        {openingComprobante === selectedInscripcion.comprobantePagoUrl
                          ? "Abriendo comprobante..."
                          : "Ver comprobante"}
                      </button>
                    ) : (
                      <p className="text-sm text-gray-500">No hay comprobante cargado.</p>
                    )}
                  </div>
                </div>

                {/* Status and Notes */}
                <div className="bg-zinc-800/50 border border-yellow-400/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-3">
                    <Edit className="w-4 h-4" />
                    Estado y Notas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Estado</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-yellow-400/20 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400/40"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="rechazada">Rechazada</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Nota</label>
                      <input
                        type="text"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-yellow-400/20 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400/40"
                        placeholder="Agregar nota..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-zinc-900 border-t border-yellow-400/20 p-4 flex justify-between items-center">
                <button
                  onClick={closeDetailsModal}
                  className="px-4 py-2 rounded-lg bg-zinc-800 border border-yellow-400/20 text-white hover:bg-zinc-700 transition-all text-sm"
                >
                  Cerrar
                </button>
                <button
                  onClick={updateStatus}
                  disabled={updatingStatus}
                  className="px-4 py-2 rounded-lg bg-yellow-400 text-black font-semibold hover:bg-yellow-500 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updatingStatus ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Actualizar Estado
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comprobante Modal */}
        {comprobanteModal && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3 sm:p-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="comprobante-modal-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeComprobanteModal()
            }}
          >
            <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-yellow-400/30 bg-zinc-950 shadow-2xl">
              <div className="flex items-center justify-between gap-4 border-b border-yellow-400/20 bg-zinc-900 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <h2
                    id="comprobante-modal-title"
                    className="flex items-center gap-2 text-base font-bold text-yellow-400 sm:text-lg"
                  >
                    <Eye className="h-5 w-5 flex-shrink-0" />
                    Comprobante de pago
                  </h2>
                  <p className="mt-1 truncate text-xs text-gray-400">
                    {selectedInscripcion
                      ? `${selectedInscripcion.nombres} ${selectedInscripcion.apellidos}`
                      : "Vista previa del comprobante"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeComprobanteModal}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-zinc-800 hover:text-white"
                  aria-label="Cerrar comprobante"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black p-2 sm:p-4">
                {comprobanteModal.kind === "image" ? (
                  <img
                    src={comprobanteModal.url}
                    alt="Comprobante de pago"
                    className="max-h-full max-w-full rounded-lg object-contain"
                  />
                ) : (
                  <iframe
                    src={comprobanteModal.url}
                    title="Comprobante de pago"
                    className="h-full min-h-[65vh] w-full rounded-lg border-0 bg-white"
                  />
                )}
              </div>

              <div className="flex items-center justify-end border-t border-yellow-400/20 bg-zinc-900 px-4 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={closeComprobanteModal}
                  className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-yellow-500"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

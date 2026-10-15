"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { useIsMobile } from "@/components/ui/use-mobile"
import { exportToCSV } from "@/lib/exportUtils"
import { emailService } from "@/lib/emailService"
import { SIN_NUMERO } from "@/lib/numeroInscripcion"
import { reproducirAviso } from "@/lib/sonidoAviso"
import NotificacionesPush from "@/components/admin/NotificacionesPush"
import NotasCaja from "@/components/admin/NotasCaja"
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
  Gift,
  MailX,
  StickyNote,
  FileText,
  type LucideIcon,
} from "lucide-react"

// Columnas que pedimos a Supabase (sin comprobante_base64, que es pesado).
// No se consulta `provincia` ni `talla_camiseta`: ambas dejaron de formar parte
// del esquema vigente de participantes.
const INSCRIPCIONES_COLUMNS =
  "id, estado, nombre, apellido, email, dni, pais, localidad, grupo_ciclistas, es_celiaco, " +
  "metodo_pago, numero_referencia, fecha_nacimiento, grupo_sanguineo, telefono, " +
  "tiene_alergias, alergias, tiene_problemas_salud, condicion_salud, comprobante_pago_url, " +
  "comprobante_nota, " +
  "nota_estado, numero_inscripcion, fecha_inscripcion, token_qr, pago_estado, monto_pagado, pago_nota"

// Respaldo temporal para bases que todavía tengan una vista, función o política
// desactualizada que falle al resolver la ubicación. Permite que el administrador
// siga cargando el listado mientras se corrige esa dependencia en Supabase.
const INSCRIPCIONES_COLUMNS_WITHOUT_LOCATION =
  "id, estado, nombre, apellido, email, dni, metodo_pago, numero_referencia, " +
  "fecha_nacimiento, grupo_sanguineo, telefono, tiene_alergias, alergias, " +
  "tiene_problemas_salud, condicion_salud, comprobante_pago_url, nota_estado, " +
  "numero_inscripcion, fecha_inscripcion, token_qr, pago_estado, monto_pagado, pago_nota"

// "participantes" es historico (acumula todas las ediciones via anios[]).
// Esta pantalla es de la edicion actual: siempre filtramos por anio.
const EDICION_ACTUAL = 2026

// Precio de lista si todavia no cargaron event_settings.
const PRECIO_FALLBACK = 25000

/**
 * Opciones de pago que ofrece el modal al confirmar una inscripcion.
 * Se traducen a las columnas pago_estado + monto_pagado de participantes.
 */
// "otra-forma": pago de una manera que no entro a la caja (otra moneda, le
// transfirio a alguien del equipo). Queda registrado con una nota y NO suma
// plata hasta que se lo pase a "pagado" o "otro monto".
type OpcionPago = "pagado" | "falta" | "otro" | "gratis" | "otra-forma"

/** Filtros que viajan a la query de Supabase junto con estado y busqueda. */
interface FiltrosAvanzados {
  pais: string
  ciudad: string
  grupo: string
  sangre: string
  /** all | sin-pagar | otro-precio | gratis | pagado | otra-forma */
  pago: string
  /** all | problemas | alergias | celiaco */
  salud: string
  conNota: boolean
  /** Precio de lista, para resolver "pago otro precio". */
  precioLista: number
}

const FILTROS_VACIOS: FiltrosAvanzados = {
  pais: "all",
  ciudad: "all",
  grupo: "all",
  sangre: "all",
  pago: "all",
  salud: "all",
  conNota: false,
  precioLista: PRECIO_FALLBACK,
}

/** Formatea un monto en pesos, sin decimales. */
const formatearMonto = (monto: number): string =>
  monto.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })

interface Stats {
  total: number
  confirmadas: number
  pendientes: number
  rechazadas: number
}

/** Una inscripcion confirmada que pago un monto distinto al precio de lista. */
interface PagoDistinto {
  id: string
  nombre: string
  dni: string
  pagado: number
  /** Positivo si pago de menos, negativo si pago de mas. */
  diferencia: number
}

/** Cuantas tarjetas de resumen se ven de una vez (el resto, con las flechas). */
const TARJETAS_POR_PAGINA = 4

/** Una tarjeta del resumen de arriba. */
interface TarjetaResumen {
  id: string
  titulo: string
  valor: number | string
  icono: LucideIcon
  /** Clase de color del icono, completa (Tailwind no arma clases en runtime). */
  color: string
  /** Texto chico debajo del numero. */
  pie?: string
  colorPie?: string
  /** Abre la lista de quienes componen el numero. */
  onVer?: () => void
  /** Aplica el filtro correspondiente al listado. */
  onFiltrar?: () => void
}

/** Una inscripcion para mostrar en una lista simple (modal de "ver"). */
interface InscriptoSimple {
  id: string
  nombre: string
  dni: string
  /** Aclaracion opcional, por ejemplo la nota del pago. */
  nota?: string | null
}

/**
 * Resumen de la plata de las inscripciones confirmadas. Se calcula sobre las
 * columnas `pago_estado` / `monto_pagado`, no sobre `confirmadas * precio`:
 * una confirmada impaga o gratis no aporta nada.
 */
interface ResumenPagos {
  /** Confirmadas que efectivamente pagaron algo. */
  pagaron: number
  /** Suma real de lo cobrado por esas inscripciones. */
  cobrado: number
  /** Confirmadas marcadas como pendientes de pago. */
  noPagaron: number
  /** Lo que falta entrar por esas inscripciones (al precio de lista). */
  faltaCobrar: number
  /** Quienes no pagaron, para el modal de "ver". */
  sinPagar: InscriptoSimple[]
  /** Confirmadas marcadas como gratis. */
  gratis: number
  /** Quienes pagaron un monto distinto al de lista, para que quede registrado. */
  distintos: PagoDistinto[]
  /** Pagaron de una forma que no entro a la caja (con su nota). */
  otraForma: InscriptoSimple[]
}

const RESUMEN_PAGOS_VACIO: ResumenPagos = {
  pagaron: 0,
  cobrado: 0,
  noPagaron: 0,
  faltaCobrar: 0,
  sinPagar: [],
  gratis: 0,
  distintos: [],
  otraForma: [],
}

export default function RegistroInscripciones() {
  const router = useRouter()
  const { user, session, userRole, loading: authLoading, eventSettings } = useSupabaseContext()
  // Precio de lista de la inscripcion (event_settings.precio), con fallback
  // por si todavia no cargo el contexto.
  const precioInscripcion = Number(eventSettings?.precio) || PRECIO_FALLBACK
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

  // Filtros avanzados. Se aplican en la query (no en el cliente) porque el
  // listado esta paginado server-side: filtrar la hoja actual daria resultados
  // incompletos.
  const [filtroPais, setFiltroPais] = useState("all")
  const [filtroCiudad, setFiltroCiudad] = useState("all")
  const [filtroGrupo, setFiltroGrupo] = useState("all")
  const [filtroSangre, setFiltroSangre] = useState("all")
  const [filtroPago, setFiltroPago] = useState("all")
  const [filtroSalud, setFiltroSalud] = useState("all")
  const [soloConNota, setSoloConNota] = useState(false)

  // Aviso flotante de inscripcion nueva (realtime).
  const [avisoInscripcion, setAvisoInscripcion] = useState<{
    nombre: string
    localidad: string
  } | null>(null)

  // Valores disponibles para los selects, derivados de las inscripciones reales.
  const [opcionesFiltro, setOpcionesFiltro] = useState<{
    paises: string[]
    ciudades: string[]
    grupos: string[]
    sangres: string[]
  }>({ paises: [], ciudades: [], grupos: [], sangres: [] })

  // Paginacion server-side
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Stats (consulta separada, ligera)
  const [stats, setStats] = useState<Stats>({ total: 0, confirmadas: 0, pendientes: 0, rechazadas: 0 })
  // Resumen de pagos de las confirmadas (quien pago, quien no, quien pago otro monto).
  const [resumenPagos, setResumenPagos] = useState<ResumenPagos>(RESUMEN_PAGOS_VACIO)
  const [verPagosDistintos, setVerPagosDistintos] = useState(false)
  // Pagina del carrusel de tarjetas de resumen (se ven 4 por vez).
  const [paginaTarjetas, setPaginaTarjetas] = useState(0)
  // Modal generico de "ver la lista": las tarjetas muestran solo el numero.
  const [listaModal, setListaModal] = useState<{
    titulo: string
    descripcion?: string
    items: InscriptoSimple[]
  } | null>(null)

  // Modal
  const [selectedInscripcion, setSelectedInscripcion] = useState<any>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [statusNote, setStatusNote] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)
  // Cual de los dos botones de guardado se apreto, solo para mostrar el spinner
  // en el que corresponde.
  const [guardandoSinEmail, setGuardandoSinEmail] = useState(false)
  const [numeroEditValue, setNumeroEditValue] = useState("")
  const [savingNumero, setSavingNumero] = useState(false)
  // Reenvio del mail de confirmacion, con correccion del email si hace falta.
  const [emailEditValue, setEmailEditValue] = useState("")
  const [reenviandoEmail, setReenviandoEmail] = useState(false)
  const [resultadoReenvio, setResultadoReenvio] = useState<{ ok: boolean; texto: string } | null>(null)
  // Pago de la inscripcion: se elige al confirmar.
  const [pagoOpcion, setPagoOpcion] = useState<OpcionPago>("pagado")
  const [montoOtro, setMontoOtro] = useState("")
  // Aclaracion del pago cuando no es un monto en pesos ("Pago 700 uruguayos,
  // Lore nos transfiere esa plata").
  const [pagoNota, setPagoNota] = useState("")
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
    async (
      page: number,
      perPage: number,
      search: string,
      status: string,
      filtros: FiltrosAvanzados = FILTROS_VACIOS
    ) => {
      const from = (page - 1) * perPage
      const to = from + perPage - 1

      const buildQuery = (columns: string, conOrdenEstado = true) => {
        // Orden: pendientes arriba, despues las confirmadas del numero mas
        // grande al 1 (el #1 queda ultimo, incluso con varias paginas) y las
        // rechazadas al final. Se ordena en el servidor porque la lista esta
        // paginada: ordenar en el cliente ordenaria cada hoja por separado.
        let query = supabase
          .from("participantes")
          .select(columns, { count: "exact" })
          .contains("anios", [EDICION_ACTUAL])

        if (conOrdenEstado) {
          query = query.order("orden_estado", { ascending: true })
        }

        query = query
          .order("numero_inscripcion", { ascending: false, nullsFirst: false })
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

        // --- Filtros avanzados ---
        if (filtros.pais !== "all") query = query.eq("pais", filtros.pais)
        if (filtros.ciudad !== "all") query = query.eq("localidad", filtros.ciudad)
        if (filtros.grupo !== "all") query = query.eq("grupo_ciclistas", filtros.grupo)
        // El grupo sanguineo se cargo con distinta grafia ("a+", "A+"), por eso ilike.
        if (filtros.sangre !== "all") query = query.ilike("grupo_sanguineo", filtros.sangre)

        if (filtros.conNota) {
          query = query.not("nota_estado", "is", null).neq("nota_estado", "")
        }

        switch (filtros.pago) {
          case "sin-pagar":
            // Confirmados que todavia deben la inscripcion.
            query = query.eq("estado", "confirmada").eq("pago_estado", "pendiente")
            break
          case "otro-precio":
            query = query
              .eq("pago_estado", "pagado")
              .not("monto_pagado", "is", null)
              .neq("monto_pagado", filtros.precioLista)
            break
          case "gratis":
            query = query.eq("pago_estado", "gratis")
            break
          case "pagado":
            query = query.eq("pago_estado", "pagado")
            break
          case "otra-forma":
            query = query.eq("pago_estado", "otro")
            break
        }

        switch (filtros.salud) {
          // Los datos migrados traen "si"/"no" y algun "true"/"false" suelto.
          case "problemas":
            query = query.in("tiene_problemas_salud", ["si", "true"])
            break
          case "alergias":
            query = query.in("tiene_alergias", ["si", "true"])
            break
          case "celiaco":
            query = query.eq("es_celiaco", true)
            break
        }

        return query.range(from, to)
      }

      const primaryResult = await buildQuery(INSCRIPCIONES_COLUMNS)
      let data: any[] | null = primaryResult.data as any[] | null
      let count: number | null = primaryResult.count
      let fetchError = primaryResult.error

      // `orden_estado` es una columna generada que agrega la migración
      // 20260818c. Si todavía no se ejecutó, se carga el listado sin agrupar
      // por estado en vez de dejar el panel inutilizable.
      if (fetchError && /orden_estado/i.test(fetchError.message)) {
        console.warn(
          "Falta la columna participantes.orden_estado (migración 20260818c). " +
            "Se carga el listado sin agrupar por estado.",
          fetchError
        )

        const sinOrden = await buildQuery(INSCRIPCIONES_COLUMNS, false)
        data = sinOrden.data as any[] | null
        count = sinOrden.count
        fetchError = sinOrden.error
      }

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
          comprobanteNota: d.comprobante_nota ?? "",
          nota: d.nota_estado,
          numeroInscripcion: d.numero_inscripcion,
          fechaInscripcion: d.fecha_inscripcion,
          tokenQR: d.token_qr,
          pagoEstado: d.pago_estado ?? "pendiente",
          montoPagado: d.monto_pagado != null ? Number(d.monto_pagado) : null,
          pagoNota: d.pago_nota ?? null,
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

    // Resumen de pagos: hace falta traer las filas confirmadas porque los montos
    // son por inscripcion (no alcanza con contar). Son pocas columnas y solo las
    // confirmadas, asi que la consulta sigue siendo liviana.
    const { data: pagosData, error: pagosError } = await supabase
      .from("participantes")
      .select("id, nombre, apellido, dni, pago_estado, monto_pagado, pago_nota")
      .contains("anios", [EDICION_ACTUAL])
      .eq("estado", "confirmada")

    if (pagosError || !pagosData) {
      if (pagosError) console.error("Error cargando resumen de pagos:", pagosError)
      return
    }

    const resumen: ResumenPagos = {
      pagaron: 0,
      cobrado: 0,
      noPagaron: 0,
      faltaCobrar: 0,
      sinPagar: [],
      gratis: 0,
      distintos: [],
      otraForma: [],
    }

    for (const p of pagosData as any[]) {
      const nombreCompleto = `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim()

      if (p.pago_estado === "gratis") {
        resumen.gratis += 1
        continue
      }
      // Pago que no entro a la caja: cuenta como "falta cobrar" pero se
      // distingue de los que no pagaron nada, porque el inscripto ya pago.
      if (p.pago_estado === "otro") {
        resumen.otraForma.push({
          id: p.id,
          nombre: nombreCompleto,
          dni: p.dni ?? "",
          nota: p.pago_nota ?? null,
        })
        continue
      }
      if (p.pago_estado === "pendiente") {
        resumen.noPagaron += 1
        resumen.faltaCobrar += precioInscripcion
        resumen.sinPagar.push({ id: p.id, nombre: nombreCompleto, dni: p.dni ?? "" })
        continue
      }

      // Pagado: si no hay monto registrado se asume el precio de lista (asi
      // quedaron las inscripciones viejas, de antes de la columna monto_pagado).
      const pagado = p.monto_pagado != null ? Number(p.monto_pagado) : precioInscripcion
      resumen.pagaron += 1
      resumen.cobrado += pagado

      if (pagado !== precioInscripcion) {
        resumen.distintos.push({
          id: p.id,
          nombre: nombreCompleto,
          dni: p.dni ?? "",
          pagado,
          diferencia: precioInscripcion - pagado,
        })
      }
    }

    // Primero los que mas plata deben.
    resumen.distintos.sort((a, b) => b.diferencia - a.diferencia)
    resumen.sinPagar.sort((a, b) => a.nombre.localeCompare(b.nombre))
    resumen.otraForma.sort((a, b) => a.nombre.localeCompare(b.nombre))
    setResumenPagos(resumen)
  }, [precioInscripcion])

  // Objeto estable con los filtros avanzados: alimenta la query y es la
  // dependencia de los efectos que recargan el listado.
  const filtrosAvanzados = useMemo<FiltrosAvanzados>(
    () => ({
      pais: filtroPais,
      ciudad: filtroCiudad,
      grupo: filtroGrupo,
      sangre: filtroSangre,
      pago: filtroPago,
      salud: filtroSalud,
      conNota: soloConNota,
      precioLista: precioInscripcion,
    }),
    [
      filtroPais,
      filtroCiudad,
      filtroGrupo,
      filtroSangre,
      filtroPago,
      filtroSalud,
      soloConNota,
      precioInscripcion,
    ]
  )

  const filtrosActivos =
    (statusFilter !== "all" ? 1 : 0) +
    (filtroPais !== "all" ? 1 : 0) +
    (filtroCiudad !== "all" ? 1 : 0) +
    (filtroGrupo !== "all" ? 1 : 0) +
    (filtroSangre !== "all" ? 1 : 0) +
    (filtroPago !== "all" ? 1 : 0) +
    (filtroSalud !== "all" ? 1 : 0) +
    (soloConNota ? 1 : 0)

  const limpiarFiltros = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setFiltroPais("all")
    setFiltroCiudad("all")
    setFiltroGrupo("all")
    setFiltroSangre("all")
    setFiltroPago("all")
    setFiltroSalud("all")
    setSoloConNota(false)
    setCurrentPage(1)
  }

  // Opciones de los selects: una sola consulta liviana con los campos que se
  // filtran, de la que se derivan los valores unicos.
  useEffect(() => {
    if (!isAuthorized || !user) return

    const cargarOpciones = async () => {
      const { data, error: errOpciones } = await supabase
        .from("participantes")
        .select("pais, localidad, grupo_ciclistas, grupo_sanguineo")
        .contains("anios", [EDICION_ACTUAL])

      if (errOpciones || !data) return

      const unicos = (valores: (string | null)[]) =>
        Array.from(new Set(valores.map((v) => (v || "").trim()).filter(Boolean))).sort((a, b) =>
          a.localeCompare(b, "es")
        )

      setOpcionesFiltro({
        paises: unicos(data.map((d: any) => d.pais)),
        ciudades: unicos(data.map((d: any) => d.localidad)),
        grupos: unicos(data.map((d: any) => d.grupo_ciclistas)),
        // El grupo sanguineo se normaliza a mayusculas para no repetir "a+"/"A+".
        sangres: unicos(data.map((d: any) => (d.grupo_sanguineo || "").toUpperCase())),
      })
    }

    cargarOpciones()
  }, [isAuthorized, user])

  // Carga inicial
  useEffect(() => {
    if (!isAuthorized || !user) return

    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchPage(currentPage, itemsPerPage, searchTerm, statusFilter, filtrosAvanzados),
        fetchStats(),
      ])
      setLoading(false)
    }
    loadData()

    // Realtime: re-fetch pagina actual cuando cambia la tabla
    const channel = supabase
      .channel("registro-inscripciones")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participantes" },
        (payload) => {
          // Alta nueva: ademas de refrescar, se avisa en pantalla. El push al
          // celular lo manda el servidor desde /api/inscripcion/submit.
          if (payload.eventType === "INSERT") {
            const nuevo = payload.new as { nombre?: string; apellido?: string; localidad?: string }
            const nombre = `${nuevo.nombre ?? ""} ${nuevo.apellido ?? ""}`.trim() || "Alguien"

            setAvisoInscripcion({ nombre, localidad: nuevo.localidad || "" })
            reproducirAviso()

            // Notificacion del sistema si el admin dio permiso y no esta
            // mirando la pestaña.
            if (
              typeof Notification !== "undefined" &&
              Notification.permission === "granted" &&
              document.visibilityState !== "visible"
            ) {
              try {
                new Notification("Nueva inscripcion", {
                  body: nombre,
                  icon: "/email/logo.png",
                  tag: "inscripcion-nueva",
                })
              } catch {
                // Algunos navegadores solo permiten notificaciones desde el
                // service worker; ahi ya llega el push.
              }
            }
          }

          fetchPage(currentPage, itemsPerPage, searchTerm, statusFilter, filtrosAvanzados)
          fetchStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAuthorized, user, currentPage, itemsPerPage, statusFilter, filtrosAvanzados])
  // searchTerm se maneja via debounce, no como dependencia directa

  // Debounce de busqueda (400ms)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    searchTimerRef.current = setTimeout(() => {
      setCurrentPage(1)
      fetchPage(1, itemsPerPage, searchTerm, statusFilter, filtrosAvanzados)
    }, 400)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchTerm, fetchPage, itemsPerPage, statusFilter, filtrosAvanzados])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchPage(currentPage, itemsPerPage, searchTerm, statusFilter, filtrosAvanzados),
      fetchStats(),
    ])
    setRefreshing(false)
  }

  const scrollToTop = () => {
    if (typeof window === "undefined") return
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // El aviso de inscripcion nueva se va solo a los 12 segundos.
  useEffect(() => {
    if (!avisoInscripcion) return
    const id = window.setTimeout(() => setAvisoInscripcion(null), 12000)
    return () => window.clearTimeout(id)
  }, [avisoInscripcion])

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const indexOfFirst = (currentPage - 1) * itemsPerPage + 1
  const indexOfLast = Math.min(currentPage * itemsPerPage, totalCount)

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
      scrollToTop()
    }
  }

  /**
   * Marca el estado de pago de una inscripcion confirmada. Solo se muestra
   * cuando aporta algo: si pago el precio de lista no se dibuja nada, para no
   * llenar la grilla de etiquetas.
   */
  const getPagoBadge = (insc: any) => {
    // Mismo criterio que el badge de estado: en celular solo el icono.
    const clases =
      "inline-flex items-center gap-1 rounded-full text-[10px] font-semibold px-1.5 py-0.5 sm:px-2 border"

    if (insc.pagoEstado === "gratis") {
      return (
        <span
          title="Inscripcion gratis"
          className={`${clases} bg-blue-500/15 text-blue-300 border-blue-500/30`}
        >
          <Gift className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Gratis</span>
          <span className="sr-only">Inscripcion gratis</span>
        </span>
      )
    }

    // Pago que no entro a la caja: ya pago, pero esa plata no esta. Se muestra
    // distinto de "falta pagar" y con la nota en el title.
    if (insc.pagoEstado === "otro") {
      return (
        <span
          title={insc.pagoNota || "Pago de otra forma"}
          className={`${clases} bg-purple-500/15 text-purple-300 border-purple-500/30`}
        >
          <StickyNote className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Otra forma</span>
          <span className="sr-only">{insc.pagoNota || "Pago de otra forma"}</span>
        </span>
      )
    }

    if (insc.pagoEstado !== "pagado") {
      return (
        <span
          title="Falta pagar"
          className={`${clases} bg-orange-500/20 text-orange-300 border-orange-500/40`}
        >
          <AlertTriangle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Falta pagar</span>
          <span className="sr-only">Falta pagar</span>
        </span>
      )
    }

    const monto = insc.montoPagado != null ? Number(insc.montoPagado) : null
    if (monto != null && monto !== precioInscripcion) {
      return (
        <span
          title={`Pago ${formatearMonto(monto)}`}
          className={`${clases} bg-zinc-700/60 text-gray-300 border-zinc-600`}
        >
          {formatearMonto(monto)}
        </span>
      )
    }

    return null
  }

  // En celular el badge se reduce al icono y su color: el texto hacia que la
  // celda ocupara dos renglones. El title mantiene la info a mano.
  const CLASES_BADGE =
    "inline-flex items-center gap-1 rounded-full text-xs font-semibold px-1.5 py-1 sm:px-3 border"

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmada":
        return (
          <span
            title="Confirmada"
            className={`${CLASES_BADGE} bg-green-500/20 text-green-400 border-green-500/30`}
          >
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Confirmada</span>
            <span className="sr-only">Confirmada</span>
          </span>
        )
      case "rechazada":
        return (
          <span
            title="Rechazada"
            className={`${CLASES_BADGE} bg-red-500/20 text-red-400 border-red-500/30`}
          >
            <XCircleIcon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Rechazada</span>
            <span className="sr-only">Rechazada</span>
          </span>
        )
      default:
        return (
          <span
            title="Pendiente"
            className={`${CLASES_BADGE} bg-yellow-500/20 text-yellow-400 border-yellow-500/30`}
          >
            <Clock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Pendiente</span>
            <span className="sr-only">Pendiente</span>
          </span>
        )
    }
  }

  const openDetailsModal = (insc: any) => {
    setSelectedInscripcion(insc)
    setNewStatus(insc.estado || "pendiente")
    setStatusNote(insc.nota || "")
    setNumeroEditValue(insc.numeroInscripcion != null ? String(insc.numeroInscripcion) : "")
    setEmailEditValue(insc.email || "")
    setResultadoReenvio(null)

    // Deriva la opcion de pago desde lo guardado, para que el modal abra
    // mostrando lo que realmente paso y no un default enganoso.
    const monto = insc.montoPagado != null ? Number(insc.montoPagado) : null
    setPagoNota(insc.pagoNota || "")
    if (insc.pagoEstado === "gratis") {
      setPagoOpcion("gratis")
      setMontoOtro("")
    } else if (insc.pagoEstado === "otro") {
      setPagoOpcion("otra-forma")
      setMontoOtro("")
    } else if (insc.pagoEstado === "pagado") {
      const esPrecioDeLista = monto == null || monto === precioInscripcion
      setPagoOpcion(esPrecioDeLista ? "pagado" : "otro")
      setMontoOtro(esPrecioDeLista ? "" : String(monto))
    } else {
      // Pendiente de pago: si la inscripcion es nueva se asume que al
      // confirmarla pago el precio de lista, que es el caso habitual.
      setPagoOpcion(insc.estado === "confirmada" ? "falta" : "pagado")
      setMontoOtro("")
    }

    setIsDetailsModalOpen(true)
  }

  /** Traduce la opcion elegida a las columnas que guarda la base. */
  const resolverPago = ():
    | { pago_estado: string; monto_pagado: number; pago_nota: string | null }
    | null => {
    if (pagoOpcion === "falta")
      return { pago_estado: "pendiente", monto_pagado: 0, pago_nota: null }
    if (pagoOpcion === "gratis") return { pago_estado: "gratis", monto_pagado: 0, pago_nota: null }
    if (pagoOpcion === "pagado")
      return { pago_estado: "pagado", monto_pagado: precioInscripcion, pago_nota: null }

    // Pago que no entro a la caja: no suma plata, pero queda anotado como pago.
    if (pagoOpcion === "otra-forma") {
      const nota = pagoNota.trim()
      if (!nota) return null
      return { pago_estado: "otro", monto_pagado: 0, pago_nota: nota }
    }

    const monto = Number(montoOtro.replace(/[^\d.,]/g, "").replace(",", "."))
    if (!Number.isFinite(monto) || monto < 0) return null
    return { pago_estado: "pagado", monto_pagado: monto, pago_nota: null }
  }

  /**
   * Reenvia el mail de confirmacion al participante.
   * Si el admin corrigio el email en el modal, primero lo guarda en
   * `participantes` y recien despues envia, asi la base y el mail no quedan
   * diciendo cosas distintas.
   */
  const reenviarConfirmacion = async () => {
    if (!selectedInscripcion || reenviandoEmail) return

    const emailNuevo = emailEditValue.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNuevo)) {
      setResultadoReenvio({ ok: false, texto: "El email no tiene un formato valido." })
      return
    }

    const emailCambio = emailNuevo.toLowerCase() !== (selectedInscripcion.email || "").toLowerCase()

    setReenviandoEmail(true)
    setResultadoReenvio(null)
    try {
      if (emailCambio) {
        const { error: updateError } = await supabase
          .from("participantes")
          .update({ email: emailNuevo })
          .eq("id", selectedInscripcion.id)

        if (updateError) throw updateError

        setInscripciones((prev) =>
          prev.map((insc) =>
            insc.id === selectedInscripcion.id ? { ...insc, email: emailNuevo } : insc
          )
        )
        setSelectedInscripcion((prev: any) => (prev ? { ...prev, email: emailNuevo } : prev))
      }

      const resultado = await emailService.sendConfirmationEmail({
        email: emailNuevo,
        nombreCompleto: `${selectedInscripcion.nombres} ${selectedInscripcion.apellidos}`,
        numeroInscripcion:
          selectedInscripcion.numeroInscripcion != null
            ? String(selectedInscripcion.numeroInscripcion)
            : undefined,
        tokenQR: selectedInscripcion.tokenQR,
        ubicacion: "Concepcion del Uruguay, Entre Rios",
        dni: selectedInscripcion.dni,
      })

      if (!resultado.success) {
        setResultadoReenvio({ ok: false, texto: resultado.error || "No se pudo enviar el email." })
        return
      }

      setResultadoReenvio({
        ok: true,
        texto: emailCambio
          ? `Email corregido y confirmacion enviada a ${emailNuevo}`
          : `Confirmacion reenviada a ${emailNuevo}`,
      })
    } catch (err: any) {
      console.error("Error reenviando confirmacion:", err)
      setResultadoReenvio({ ok: false, texto: err?.message || "Error al reenviar el email." })
    } finally {
      setReenviandoEmail(false)
    }
  }

  // Correccion manual del numero de inscripcion, para arreglar casos puntuales
  // (por ejemplo numeros que quedaron desparejos por altas y bajas de confirmacion).
  // No usa las RPC de asignacion: es una edicion directa, pensada solo para el admin.
  const guardarNumeroInscripcion = async () => {
    if (!selectedInscripcion) return

    const valorLimpio = numeroEditValue.trim()
    const nuevoNumero = valorLimpio === "" ? null : Number(valorLimpio)

    if (valorLimpio !== "" && (!Number.isInteger(nuevoNumero) || (nuevoNumero as number) < 1)) {
      alert("El numero de inscripcion debe ser un entero positivo.")
      return
    }

    setSavingNumero(true)
    try {
      if (nuevoNumero != null) {
        const { data: duplicado, error: dupError } = await supabase
          .from("participantes")
          .select("id, nombre, apellido")
          .contains("anios", [EDICION_ACTUAL])
          .eq("numero_inscripcion", nuevoNumero)
          .neq("id", selectedInscripcion.id)
          .maybeSingle()

        if (dupError) throw dupError
        if (duplicado) {
          alert(`Ese numero ya lo tiene ${duplicado.nombre} ${duplicado.apellido}. Elegi otro.`)
          return
        }
      }

      const { error: updateError } = await supabase
        .from("participantes")
        .update({ numero_inscripcion: nuevoNumero })
        .eq("id", selectedInscripcion.id)

      if (updateError) throw updateError

      setInscripciones((prev) =>
        prev.map((insc) =>
          insc.id === selectedInscripcion.id ? { ...insc, numeroInscripcion: nuevoNumero } : insc
        )
      )
      setSelectedInscripcion((prev: any) => (prev ? { ...prev, numeroInscripcion: nuevoNumero } : prev))
    } catch (err: any) {
      console.error("Error actualizando numero de inscripcion:", err)
      alert("Error al guardar el numero: " + (err?.message || ""))
    } finally {
      setSavingNumero(false)
    }
  }

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false)
    setSelectedInscripcion(null)
  }

  // El mail de confirmacion solo sale cuando la inscripcion pasa a confirmada
  // desde otro estado. Si ya estaba confirmada, guardar no manda nada.
  const enviaraEmailAlGuardar =
    newStatus === "confirmada" && selectedInscripcion?.estado !== "confirmada"

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

  /**
   * Guarda el estado, la nota y el pago de la inscripcion.
   *
   * `enviarEmail` en false confirma igual (numero de inscripcion incluido) pero
   * no manda el mail de confirmacion. Sirve para los casos en que el mail ya se
   * aviso por otra via, el email esta mal o simplemente no se quiere notificar.
   * Despues se puede mandar a mano con "Reenviar confirmacion".
   */
  const updateStatus = async ({ enviarEmail = true }: { enviarEmail?: boolean } = {}) => {
    if (!selectedInscripcion) return

    // El pago solo se define al confirmar: en pendiente o rechazada no hay
    // nada que cobrar, asi que el bloque ni se muestra.
    const confirmandoAhora = newStatus === "confirmada"
    const pago = confirmandoAhora ? resolverPago() : null

    if (confirmandoAhora && !pago) {
      alert(
        pagoOpcion === "otra-forma"
          ? "Escribí la nota del pago (cómo pagó)."
          : "Escribí un monto válido para el pago."
      )
      return
    }

    setGuardandoSinEmail(!enviarEmail)
    setUpdatingStatus(true)
    try {
      const { error: updateError } = await supabase
        .from("participantes")
        .update({
          estado: newStatus,
          nota_estado: statusNote,
          ...(pago ?? {}),
        })
        .eq("id", selectedInscripcion.id)

      if (updateError) throw updateError

      // El numero de inscripcion se otorga recien al confirmar, para que la
      // numeracion quede correlativa (1, 2, 3...) entre los confirmados.
      // Si la inscripcion deja de estar confirmada, el numero se libera y
      // queda disponible para el proximo que se confirme.
      // Ambas RPC son idempotentes.
      const confirmada = newStatus === "confirmada"
      const { data: numeroAsignado, error: numeroError } = await supabase.rpc(
        confirmada ? "assign_inscription_number" : "release_inscription_number",
        { p_dni: selectedInscripcion.dni, p_year: String(EDICION_ACTUAL) }
      )

      if (numeroError) throw numeroError
      // `release` devuelve el numero que libero; la fila queda sin numero.
      const numeroInscripcion = confirmada ? numeroAsignado : null

      // Enviar email de confirmacion con QR recien acá, al aprobar.
      // Evita reenviarlo si ya estaba confirmada (edicion de nota, etc) y lo
      // omite por completo si se confirmo con "Confirmar sin enviar email".
      if (enviarEmail && newStatus === "confirmada" && selectedInscripcion.estado !== "confirmada") {
        try {
          await emailService.sendConfirmationEmail({
            email: selectedInscripcion.email,
            nombreCompleto: `${selectedInscripcion.nombres} ${selectedInscripcion.apellidos}`,
            numeroInscripcion: String(numeroInscripcion),
            tokenQR: selectedInscripcion.tokenQR,
            ubicacion: "Concepcion del Uruguay, Entre Rios",
            // Con el DNI el servidor resuelve el bloque de remera del mail.
            dni: selectedInscripcion.dni,
          })
        } catch (emailError) {
          console.error("Error enviando email de confirmación:", emailError)
        }
      }

      // Actualizar optimistamente en la lista local
      setInscripciones((prev) =>
        prev.map((insc) =>
          insc.id === selectedInscripcion.id
            ? {
                ...insc,
                estado: newStatus,
                nota: statusNote,
                numeroInscripcion,
                ...(pago
                  ? {
                      pagoEstado: pago.pago_estado,
                      montoPagado: pago.monto_pagado,
                      pagoNota: pago.pago_nota,
                    }
                  : {}),
              }
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
      setGuardandoSinEmail(false)
    }
  }

  // Exportar CSV: descarga TODAS las inscripciones filtradas (no solo la pagina actual)
  const exportarCSV = async () => {
    // Mismo orden que la grilla, para que el CSV se lea igual que la pantalla.
    let query = supabase
      .from("participantes")
      .select(INSCRIPCIONES_COLUMNS)
      .contains("anios", [EDICION_ACTUAL])
      .order("orden_estado", { ascending: true })
      .order("numero_inscripcion", { ascending: false, nullsFirst: false })
      .order("fecha_inscripcion", { ascending: false })

    if (statusFilter !== "all") query = query.eq("estado", statusFilter)
    if (searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`
      query = query.or(
        `nombre.ilike.${term},apellido.ilike.${term},email.ilike.${term},dni.ilike.${term}`
      )
    }

    // El CSV respeta los mismos filtros que la grilla: exportar algo distinto
    // de lo que esta viendo el admin seria confuso.
    const f = filtrosAvanzados
    if (f.pais !== "all") query = query.eq("pais", f.pais)
    if (f.ciudad !== "all") query = query.eq("localidad", f.ciudad)
    if (f.grupo !== "all") query = query.eq("grupo_ciclistas", f.grupo)
    if (f.sangre !== "all") query = query.ilike("grupo_sanguineo", f.sangre)
    if (f.conNota) query = query.not("nota_estado", "is", null).neq("nota_estado", "")

    if (f.pago === "sin-pagar") {
      query = query.eq("estado", "confirmada").eq("pago_estado", "pendiente")
    } else if (f.pago === "otro-precio") {
      query = query
        .eq("pago_estado", "pagado")
        .not("monto_pagado", "is", null)
        .neq("monto_pagado", f.precioLista)
    } else if (f.pago === "gratis") {
      query = query.eq("pago_estado", "gratis")
    } else if (f.pago === "pagado") {
      query = query.eq("pago_estado", "pagado")
    } else if (f.pago === "otra-forma") {
      query = query.eq("pago_estado", "otro")
    }

    if (f.salud === "problemas") query = query.in("tiene_problemas_salud", ["si", "true"])
    else if (f.salud === "alergias") query = query.in("tiene_alergias", ["si", "true"])
    else if (f.salud === "celiaco") query = query.eq("es_celiaco", true)

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
      Pago:
        d.pago_estado === "gratis"
          ? "Gratis"
          : d.pago_estado === "pagado"
            ? "Pagado"
            : d.pago_estado === "otro"
              ? "Pago de otra forma"
              : "Falta pagar",
      "Monto Pagado": d.monto_pagado != null ? Number(d.monto_pagado) : "",
      "Nota del Pago": d.pago_nota || "",
      Nota: d.nota_estado || "",
      "Fecha Inscripcion": d.fecha_inscripcion
        ? new Date(d.fecha_inscripcion).toLocaleDateString("es-AR")
        : "",
    }))
    exportToCSV(datos, `inscripciones_${new Date().toISOString().slice(0, 10)}`)
  }

  // --- Tarjetas de resumen (carrusel de 4 en 4) ---
  // Son 9: las 4 de estado y las 5 de pago. Mostrarlas todas juntas ocupaba
  // media pantalla antes de llegar al listado.
  const tarjetas = useMemo<TarjetaResumen[]>(
    () => [
      // El color va completo y no interpolado: Tailwind no genera clases
      // armadas en runtime (text-${color}-400 quedaba sin estilo).
      { id: "total", titulo: "Total", valor: stats.total, icono: Users, color: "text-blue-400" },
      {
        id: "confirmadas",
        titulo: "Confirmadas",
        valor: stats.confirmadas,
        icono: CheckCircle,
        color: "text-green-400",
      },
      {
        id: "pendientes",
        titulo: "Pendientes",
        valor: stats.pendientes,
        icono: Clock,
        color: "text-yellow-400",
      },
      {
        id: "rechazadas",
        titulo: "Rechazadas",
        valor: stats.rechazadas,
        icono: XCircleIcon,
        color: "text-red-400",
      },
      {
        id: "pagaron",
        titulo: "Pagaron",
        valor: resumenPagos.pagaron,
        icono: DollarSign,
        color: "text-green-400",
        pie: `${formatearMonto(resumenPagos.cobrado)} cobrado`,
        colorPie: "text-green-400",
        onFiltrar: () => {
          setFiltroPago("pagado")
          setCurrentPage(1)
        },
      },
      {
        id: "no-pagaron",
        titulo: "No pagaron",
        valor: resumenPagos.noPagaron,
        icono: AlertTriangle,
        color: "text-orange-400",
        pie: `faltan ${formatearMonto(resumenPagos.faltaCobrar)}`,
        colorPie: "text-orange-400",
        onVer:
          resumenPagos.sinPagar.length > 0
            ? () =>
                setListaModal({
                  titulo: "Confirmados que todavía no pagaron",
                  descripcion: `${resumenPagos.noPagaron} inscriptos · faltan ${formatearMonto(
                    resumenPagos.faltaCobrar
                  )}`,
                  items: resumenPagos.sinPagar,
                })
            : undefined,
        onFiltrar: () => {
          setFiltroPago("sin-pagar")
          setCurrentPage(1)
        },
      },
      {
        id: "otro-monto",
        titulo: "Pagaron otro monto",
        valor: resumenPagos.distintos.length,
        icono: ClipboardList,
        color: "text-blue-400",
        onVer: resumenPagos.distintos.length > 0 ? () => setVerPagosDistintos(true) : undefined,
      },
      {
        // Pagaron de una forma que no entro a la caja (otra moneda, se lo
        // dieron a alguien del equipo). No suma plata, pero no son deudores.
        id: "otra-forma",
        titulo: "Pagó de otra forma",
        valor: resumenPagos.otraForma.length,
        icono: StickyNote,
        color: "text-purple-400",
        onVer:
          resumenPagos.otraForma.length > 0
            ? () =>
                setListaModal({
                  titulo: "Pagaron de otra forma",
                  descripcion: "Ya pagaron, pero esa plata todavía no entró a la caja",
                  items: resumenPagos.otraForma,
                })
            : undefined,
      },
      {
        id: "gratis",
        titulo: "Gratis",
        valor: resumenPagos.gratis,
        icono: Gift,
        color: "text-blue-400",
        pie: "sin cargo",
      },
    ],
    [stats, resumenPagos, precioInscripcion]
  )

  const totalPaginasTarjetas = Math.ceil(tarjetas.length / TARJETAS_POR_PAGINA)
  const tarjetasVisibles = tarjetas.slice(
    paginaTarjetas * TARJETAS_POR_PAGINA,
    paginaTarjetas * TARJETAS_POR_PAGINA + TARJETAS_POR_PAGINA
  )

  /** Avanza o retrocede de pagina, dando la vuelta en los extremos. */
  const moverTarjetas = (paso: number) =>
    setPaginaTarjetas((p) => (p + paso + totalPaginasTarjetas) % totalPaginasTarjetas)

  // Derivados del modal de detalle: si el admin toco el email y si la
  // inscripcion esta en un estado donde el mail de confirmacion tiene sentido.
  const emailCambiado =
    !!selectedInscripcion &&
    emailEditValue.trim().toLowerCase() !== (selectedInscripcion.email || "").toLowerCase()
  const puedeReenviarConfirmacion =
    !!selectedInscripcion &&
    (selectedInscripcion.estado === "confirmada" || selectedInscripcion.estado === "aprobado")

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
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <NotificacionesPush />
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

        {/* Aviso en vivo de inscripcion nueva */}
        {avisoInscripcion && (
          <div className="fixed bottom-20 right-4 left-4 sm:left-auto sm:w-80 z-50 animate-fadeIn">
            <div className="bg-zinc-900 border border-yellow-400/50 rounded-lg shadow-2xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-yellow-400/15 grid place-items-center flex-shrink-0">
                <Users className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-yellow-400">Nueva inscripcion</p>
                <p className="text-sm text-white truncate">{avisoInscripcion.nombre}</p>
                {avisoInscripcion.localidad && (
                  <p className="text-xs text-gray-400 truncate">{avisoInscripcion.localidad}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAvisoInscripcion(null)}
                aria-label="Cerrar aviso"
                className="p-1 rounded hover:bg-zinc-800 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        )}

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

        {/* Tarjetas de resumen: 9 en total, pero se muestran 4 por vez y el
            resto se ve con las flechas. Las 9 juntas se comian la pantalla. */}
        <div className="mb-6 animate-fadeIn">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              {/* Un punto por pagina, para saber donde estas y saltar directo. */}
              {Array.from({ length: totalPaginasTarjetas }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPaginaTarjetas(i)}
                  aria-label={`Ver tarjetas ${i + 1} de ${totalPaginasTarjetas}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === paginaTarjetas ? "w-5 bg-yellow-400" : "w-1.5 bg-zinc-700 hover:bg-zinc-600"
                  }`}
                />
              ))}
              <span className="text-[11px] text-gray-500 ml-1.5">
                {paginaTarjetas + 1}/{totalPaginasTarjetas}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moverTarjetas(-1)}
                aria-label="Tarjetas anteriores"
                className="p-1.5 rounded-lg bg-zinc-900 border border-yellow-400/20 text-yellow-400 hover:bg-zinc-800 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => moverTarjetas(1)}
                aria-label="Tarjetas siguientes"
                className="p-1.5 rounded-lg bg-zinc-900 border border-yellow-400/20 text-yellow-400 hover:bg-zinc-800 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-2 grid-cols-2 sm:gap-3 md:grid-cols-4">
            {tarjetasVisibles.map((tarjeta) => {
              const Icono = tarjeta.icono
              return (
                <div
                  key={tarjeta.id}
                  className="bg-zinc-900 border border-yellow-400/20 rounded-lg p-3 sm:p-4 hover:border-yellow-400/40 transition-all"
                >
                  <div className="flex justify-between items-start gap-1 mb-2">
                    <div className="text-[11px] sm:text-xs text-gray-400 leading-tight">
                      {tarjeta.titulo}
                    </div>
                    <Icono className={`w-4 h-4 flex-shrink-0 ${tarjeta.color}`} />
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xl sm:text-2xl font-bold text-white">{tarjeta.valor}</div>
                      {tarjeta.pie && (
                        <div className={`text-[11px] sm:text-xs mt-1 truncate ${tarjeta.colorPie ?? "text-gray-500"}`}>
                          {tarjeta.pie}
                        </div>
                      )}
                    </div>
                    {(tarjeta.onVer || tarjeta.onFiltrar) && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {tarjeta.onVer && (
                          <button
                            type="button"
                            onClick={tarjeta.onVer}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 border border-yellow-400/30 text-yellow-400 text-[11px] sm:text-xs hover:bg-zinc-700 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver
                          </button>
                        )}
                        {tarjeta.onFiltrar && (
                          <button
                            type="button"
                            onClick={tarjeta.onFiltrar}
                            title="Filtrar el listado"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-gray-400 text-[11px] sm:text-xs hover:text-white transition-all"
                          >
                            <Filter className="w-3.5 h-3.5" />
                            Filtrar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
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
              {/* Filtros y CSV juntos: en cualquier pantalla los filtros viven
                  detras del boton, para no comerse media pantalla con selects. */}
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm ${
                    filtrosActivos > 0
                      ? "bg-yellow-400/15 border-yellow-400/50 text-yellow-400"
                      : "bg-zinc-800 border-yellow-400/20 text-yellow-400 hover:bg-zinc-700"
                  }`}
                  title={showFilters ? "Ocultar los filtros" : "Mostrar los filtros"}
                >
                  <Filter className="w-4 h-4" />
                  Filtros
                  {filtrosActivos > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-yellow-400 text-black text-[10px] font-bold">
                      {filtrosActivos}
                    </span>
                  )}
                  {showFilters ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={exportarCSV}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-yellow-400/20 text-yellow-400 hover:bg-zinc-700 transition-all text-sm"
                  title={`Exportar inscripciones a CSV`}
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
              </div>
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

            {/* Filters: se abren con el boton "Filtros" del encabezado */}
            <div className={showFilters ? "block" : "hidden"}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {[
                  {
                    etiqueta: "Estado",
                    value: statusFilter,
                    set: setStatusFilter,
                    opciones: [
                      { v: "all", t: "Todos los estados" },
                      { v: "pendiente", t: "Pendientes" },
                      { v: "confirmada", t: "Confirmadas" },
                      { v: "rechazada", t: "Rechazadas" },
                    ],
                  },
                  {
                    etiqueta: "Pago",
                    value: filtroPago,
                    set: setFiltroPago,
                    opciones: [
                      { v: "all", t: "Cualquier pago" },
                      { v: "sin-pagar", t: "Confirmados sin pagar" },
                      { v: "otro-precio", t: "Pagaron otro precio" },
                      { v: "otra-forma", t: "Pagaron de otra forma" },
                      { v: "gratis", t: "Inscripcion gratis" },
                      { v: "pagado", t: "Pagados" },
                    ],
                  },
                  {
                    etiqueta: "Salud",
                    value: filtroSalud,
                    set: setFiltroSalud,
                    opciones: [
                      { v: "all", t: "Sin filtro de salud" },
                      { v: "problemas", t: "Con problemas de salud" },
                      { v: "alergias", t: "Con alergias" },
                      { v: "celiaco", t: "Celiacos" },
                    ],
                  },
                  {
                    etiqueta: "Grupo sanguineo",
                    value: filtroSangre,
                    set: setFiltroSangre,
                    opciones: [
                      { v: "all", t: "Todos los grupos sanguineos" },
                      ...opcionesFiltro.sangres.map((s) => ({ v: s, t: s })),
                    ],
                  },
                  {
                    etiqueta: "Pais",
                    value: filtroPais,
                    set: setFiltroPais,
                    opciones: [
                      { v: "all", t: "Todos los paises" },
                      ...opcionesFiltro.paises.map((p) => ({ v: p, t: p })),
                    ],
                  },
                  {
                    etiqueta: "Ciudad",
                    value: filtroCiudad,
                    set: setFiltroCiudad,
                    opciones: [
                      { v: "all", t: "Todas las ciudades" },
                      ...opcionesFiltro.ciudades.map((c) => ({ v: c, t: c })),
                    ],
                  },
                  {
                    etiqueta: "Grupo de ciclistas",
                    value: filtroGrupo,
                    set: setFiltroGrupo,
                    opciones: [
                      { v: "all", t: "Todos los grupos" },
                      ...opcionesFiltro.grupos.map((g) => ({ v: g, t: g })),
                    ],
                  },
                ].map((filtro) => (
                  <select
                    key={filtro.etiqueta}
                    aria-label={filtro.etiqueta}
                    title={filtro.etiqueta}
                    value={filtro.value}
                    onChange={(e) => {
                      filtro.set(e.target.value)
                      setCurrentPage(1)
                    }}
                    className={`w-full px-3 py-2 bg-zinc-800 border rounded-lg text-sm focus:outline-none focus:border-yellow-400/40 ${
                      filtro.value !== "all"
                        ? "border-yellow-400/50 text-yellow-400"
                        : "border-yellow-400/20 text-white"
                    }`}
                  >
                    {filtro.opciones.map((opcion) => (
                      <option key={opcion.v} value={opcion.v}>
                        {opcion.t}
                      </option>
                    ))}
                  </select>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setSoloConNota((v) => !v)
                    setCurrentPage(1)
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                    soloConNota
                      ? "bg-yellow-400/15 border-yellow-400/50 text-yellow-400 font-semibold"
                      : "bg-zinc-800 border-yellow-400/20 text-white hover:bg-zinc-700"
                  }`}
                >
                  <Edit className="w-4 h-4 flex-shrink-0" />
                  Solo con nota
                </button>
              </div>
            </div>

            {/* Queda afuera del panel colapsable: con los filtros cerrados hay
                que poder ver que estan aplicados y limpiarlos de una. */}
            {(searchTerm || filtrosActivos > 0) && (
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                <button
                  onClick={limpiarFiltros}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 border border-yellow-400/20 rounded-lg text-yellow-400 hover:bg-zinc-700 transition-all text-sm whitespace-nowrap"
                >
                  <FilterX className="w-4 h-4" />
                  Limpiar filtros
                </button>
                <span className="text-xs text-gray-400 text-center sm:text-left">
                  {filtrosActivos > 0
                    ? `${filtrosActivos} filtro${filtrosActivos !== 1 ? "s" : ""} activo${
                        filtrosActivos !== 1 ? "s" : ""
                      } · ${totalCount} resultado${totalCount !== 1 ? "s" : ""}`
                    : `${totalCount} resultado${totalCount !== 1 ? "s" : ""}`}
                </span>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {inscripciones.length > 0 ? (
              <table className="w-full">
                <thead className="bg-zinc-800/50 border-b border-yellow-400/20">
                  <tr>
                    <th className="px-2 py-3 sm:px-4 text-left text-xs font-semibold text-gray-400 w-10">#</th>
                    <th className="px-2 py-3 sm:px-4 text-left text-xs font-semibold text-gray-400">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 hidden md:table-cell">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 hidden md:table-cell">Ciudad</th>
                    <th className="px-2 py-3 sm:px-4 text-left text-xs font-semibold text-gray-400">Estado</th>
                    <th className="px-2 py-3 sm:px-4 text-right text-xs font-semibold text-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-yellow-400/10">
                  {inscripciones.map((insc) => (
                    <tr key={insc.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-2 py-3 sm:px-4 text-sm text-gray-400">
                        {/* Solo los confirmados tienen numero. Los pendientes
                            y rechazados muestran un guion. */}
                        {insc.numeroInscripcion == null ? (
                          <span className="text-gray-600" title="Se asigna al confirmar">
                            {SIN_NUMERO}
                          </span>
                        ) : (
                          insc.numeroInscripcion
                        )}
                      </td>
                      {/* En celular el nombre y el email se recortan: sin esto un
                          email largo estira la tabla y aparece scroll horizontal. */}
                      <td className="px-2 py-3 sm:px-4 max-w-[40vw] md:max-w-none">
                        <div className="font-semibold text-yellow-400 text-sm truncate md:whitespace-normal">
                          {insc.nombres} {insc.apellidos}
                        </div>
                        <div className="text-xs text-gray-500 md:hidden truncate">{insc.email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">{insc.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">{insc.ciudad}</td>
                      <td className="px-2 py-3 sm:px-4">
                        {/* En celular los dos badges van en linea (solo iconos);
                            en desktop se apilan con su texto. */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-start gap-1">
                          {getStatusBadge(insc.estado)}
                          {insc.estado === "confirmada" && getPagoBadge(insc)}
                        </div>
                      </td>
                      <td className="px-2 py-3 sm:px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 sm:gap-2">
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
                          {!insc.comprobantePagoUrl && insc.comprobanteNota && (
                            <span
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-300"
                              title={insc.comprobanteNota}
                            >
                              <FileText className="h-3 w-3" aria-hidden="true" />
                              <span className="hidden lg:inline">Falta comprobante</span>
                            </span>
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
            <div className="p-3 sm:p-4 border-t border-yellow-400/20 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-xs text-gray-400">
                Pagina {currentPage} de {totalPages}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
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

        {/* Notas de caja, al final: observaciones generales de plata. Lo que es
            de una inscripción puntual va en la nota del pago, en su modal. */}
        <div className="mt-6 animate-fadeIn">
          <NotasCaja />
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-zinc-900 border border-yellow-400/20 rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-fadeIn">
              <div className="sticky top-0 bg-zinc-900 border-b border-yellow-400/20 p-3 sm:p-4 flex justify-between items-center gap-2 z-10">
                <h2 className="text-base sm:text-xl font-bold text-yellow-400 flex items-center gap-2 min-w-0">
                  <Users className="w-5 h-5 flex-shrink-0" />
                  Detalles de Inscripcion
                </h2>
                <button
                  onClick={closeDetailsModal}
                  aria-label="Cerrar"
                  className="p-2 rounded-lg hover:bg-zinc-800 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-3 sm:p-6 space-y-4">
                {/* Personal Info */}
                <div className="bg-zinc-800/50 border border-yellow-400/20 rounded-lg p-3 sm:p-4">
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
                <div className="bg-zinc-800/50 border border-yellow-400/20 rounded-lg p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-3">
                    <Mail className="w-4 h-4" />
                    Informacion de Contacto
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-400 block mb-1">
                        Email {emailCambiado && <span className="text-yellow-400">(modificado, sin guardar)</span>}
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="email"
                          value={emailEditValue}
                          onChange={(e) => {
                            setEmailEditValue(e.target.value)
                            setResultadoReenvio(null)
                          }}
                          className="w-full px-3 py-2 bg-zinc-900 border border-yellow-400/20 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400/40"
                          placeholder="email@ejemplo.com"
                        />
                        <button
                          type="button"
                          onClick={reenviarConfirmacion}
                          disabled={reenviandoEmail || !puedeReenviarConfirmacion}
                          title={
                            puedeReenviarConfirmacion
                              ? "Reenvia el mail de confirmacion con el QR"
                              : "Solo se puede reenviar si la inscripcion esta confirmada"
                          }
                          className="px-4 py-2 rounded-lg bg-zinc-800 border border-yellow-400/30 text-yellow-400 hover:bg-zinc-700 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2"
                        >
                          {reenviandoEmail ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              {emailCambiado ? "Corregir y reenviar" : "Reenviar confirmacion"}
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {puedeReenviarConfirmacion
                          ? emailCambiado
                            ? "Se guarda el email corregido en la inscripcion y se le manda la confirmacion con el QR."
                            : "Vuelve a enviar el mail de confirmacion con el QR de acreditacion."
                          : "El mail de confirmacion solo se puede enviar si la inscripcion esta confirmada."}
                      </p>
                      {resultadoReenvio && (
                        <p
                          className={`text-xs mt-1.5 ${
                            resultadoReenvio.ok ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {resultadoReenvio.texto}
                        </p>
                      )}
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
                <div className="bg-zinc-800/50 border border-yellow-400/20 rounded-lg p-3 sm:p-4">
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
                <div className="bg-zinc-800/50 border border-yellow-400/20 rounded-lg p-3 sm:p-4">
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
                    ) : selectedInscripcion.comprobanteNota ? (
                      // La inscripcion entro igual aunque el archivo no se
                      // pudiera subir (PDF enorme, foto que no se pudo
                      // procesar, Storage caido). Acá queda el motivo.
                      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                        <p className="text-sm font-semibold text-amber-300">Llegó sin comprobante</p>
                        <p className="mt-1 text-sm text-amber-200/90">{selectedInscripcion.comprobanteNota}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No hay comprobante cargado.</p>
                    )}
                  </div>
                </div>

                {/* Status and Notes */}
                <div className="bg-zinc-800/50 border border-yellow-400/20 rounded-lg p-3 sm:p-4">
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
                      {enviaraEmailAlGuardar && (
                        <p className="text-xs text-gray-500 mt-1">
                          Al confirmar se le manda el mail con el QR. Si no querés que le llegue,
                          usá «Confirmar sin enviar email».
                        </p>
                      )}
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
                    {/* Pago: solo tiene sentido al confirmar la inscripcion */}
                    {newStatus === "confirmada" && (
                      <div className="md:col-span-2 bg-zinc-900/70 border border-yellow-400/20 rounded-lg p-3">
                        <label className="text-xs text-gray-400 block mb-2">Pago</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(
                            [
                              { id: "pagado", label: `Pagó ${formatearMonto(precioInscripcion)}` },
                              { id: "falta", label: "Falta pagar" },
                              { id: "otro", label: "Pagó otro monto" },
                              { id: "gratis", label: "Inscripción gratis" },
                              { id: "otra-forma", label: "Pagó de otra forma (con nota)" },
                            ] as { id: OpcionPago; label: string }[]
                          ).map((opcion) => (
                            <button
                              key={opcion.id}
                              type="button"
                              onClick={() => setPagoOpcion(opcion.id)}
                              className={`px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                                pagoOpcion === opcion.id
                                  ? "bg-yellow-400/15 border-yellow-400/50 text-yellow-400 font-semibold"
                                  : "bg-zinc-900 border-zinc-700 text-gray-300 hover:border-yellow-400/30"
                              }`}
                            >
                              {opcion.label}
                            </button>
                          ))}
                        </div>

                        {pagoOpcion === "otro" && (
                          <div className="mt-2">
                            <input
                              type="number"
                              min={0}
                              step={100}
                              value={montoOtro}
                              onChange={(e) => setMontoOtro(e.target.value)}
                              autoFocus
                              className="w-full px-3 py-2 bg-zinc-900 border border-yellow-400/20 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400/40"
                              placeholder={`Monto que pagó (ej: ${precioInscripcion})`}
                            />
                          </div>
                        )}

                        {/* Pago que no entró a la caja: se anota como fue y no
                            suma plata hasta que se lo pase a pagado. */}
                        {pagoOpcion === "otra-forma" && (
                          <div className="mt-2">
                            <input
                              type="text"
                              value={pagoNota}
                              onChange={(e) => setPagoNota(e.target.value)}
                              autoFocus
                              maxLength={200}
                              className="w-full px-3 py-2 bg-zinc-900 border border-yellow-400/20 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400/40"
                              placeholder="Ej: Pagó 700 uruguayos, Lore nos transfiere esa plata"
                            />
                          </div>
                        )}

                        <p className="text-xs text-gray-500 mt-2">
                          {pagoOpcion === "falta"
                            ? "Queda confirmado pero marcado como pendiente de pago."
                            : pagoOpcion === "gratis"
                              ? "No se le cobra la inscripción. Suma $0 a los ingresos."
                              : pagoOpcion === "otro"
                                ? "Se registra el monto que indiques en vez del precio de lista."
                                : pagoOpcion === "otra-forma"
                                  ? "Queda registrado que pagó, con tu nota, pero no suma plata a la caja hasta que lo pases a «Pagó $…» u «otro monto»."
                                  : "Precio de lista actual del evento."}
                        </p>
                      </div>
                    )}

                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-400 block mb-1">
                        N° de inscripción (editable por si quedó desparejo)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          value={numeroEditValue}
                          onChange={(e) => setNumeroEditValue(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-900 border border-yellow-400/20 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400/40"
                          placeholder="Sin número"
                        />
                        <button
                          type="button"
                          onClick={guardarNumeroInscripcion}
                          disabled={savingNumero}
                          className="px-4 py-2 rounded-lg bg-zinc-800 border border-yellow-400/30 text-yellow-400 hover:bg-zinc-700 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {savingNumero ? "Guardando..." : "Guardar N°"}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Dejalo vacío para quitarle el número. Ojo: si ya se envió el mail de confirmación con
                        el número anterior, cambiarlo acá no reenvía el mail.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-zinc-900 border-t border-yellow-400/20 p-3 sm:p-4 flex flex-wrap justify-between items-center gap-2">
                <button
                  onClick={closeDetailsModal}
                  className="px-4 py-2 rounded-lg bg-zinc-800 border border-yellow-400/20 text-white hover:bg-zinc-700 transition-all text-sm flex-shrink-0"
                >
                  Cerrar
                </button>
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  {/* Solo aparece cuando el guardado mandaria el mail: si ya estaba
                      confirmada no se envia nada y el boton no tendria sentido. */}
                  {enviaraEmailAlGuardar && (
                    <button
                      onClick={() => updateStatus({ enviarEmail: false })}
                      disabled={updatingStatus}
                      title="Confirma la inscripción y le asigna número, pero no le manda el mail"
                      className="px-4 py-2 rounded-lg bg-zinc-800 border border-yellow-400/30 text-yellow-400 font-semibold hover:bg-zinc-700 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-0"
                    >
                      {updatingStatus && guardandoSinEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Confirmando...
                        </>
                      ) : (
                        <>
                          <MailX className="w-4 h-4" />
                          Confirmar sin enviar email
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus()}
                    disabled={updatingStatus}
                    className="px-4 py-2 rounded-lg bg-yellow-400 text-black font-semibold hover:bg-yellow-500 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-0"
                  >
                    {updatingStatus && !guardandoSinEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {enviaraEmailAlGuardar ? "Confirmar y enviar email" : "Actualizar Estado"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista simple de inscriptos (se abre desde el "Ver" de las tarjetas).
            Las tarjetas muestran solo el numero: la lista entera no cabe. */}
        {listaModal && (
          <div
            className="fixed inset-0 z-[65] flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setListaModal(null)
            }}
          >
            <div className="bg-zinc-900 border border-yellow-400/20 rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
              <div className="flex items-start justify-between gap-2 p-3 sm:p-4 border-b border-yellow-400/20">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-white">{listaModal.titulo}</h3>
                  {listaModal.descripcion && (
                    <p className="text-xs text-gray-400 mt-0.5">{listaModal.descripcion}</p>
                  )}
                </div>
                <button
                  onClick={() => setListaModal(null)}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-gray-400 hover:text-white transition-all flex-shrink-0"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ol className="overflow-y-auto p-3 sm:p-4 space-y-1.5">
                {listaModal.items.map((item, i) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 bg-zinc-800/50 border border-yellow-400/10 rounded-lg px-3 py-2"
                  >
                    <span className="text-xs text-gray-500 w-5 flex-shrink-0 pt-0.5">{i + 1}.</span>
                    <div className="min-w-0">
                      <p className="text-sm text-white break-words">{item.nombre}</p>
                      <p className="text-xs text-gray-500">DNI {item.dni || "-"}</p>
                      {item.nota && (
                        <p className="text-xs text-purple-300 mt-0.5 break-words">{item.nota}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* Detalle de los que pagaron un monto distinto al de lista. Queda
            registrado quien pago de menos (o de mas) y cuanto. */}
        {verPagosDistintos && (
          <div
            className="fixed inset-0 z-[65] flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setVerPagosDistintos(false)
            }}
          >
            <div className="bg-zinc-900 border border-yellow-400/20 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between gap-2 p-3 sm:p-4 border-b border-yellow-400/20">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-400" />
                    Pagaron otro monto
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Precio de lista: {formatearMonto(precioInscripcion)}
                  </p>
                </div>
                <button
                  onClick={() => setVerPagosDistintos(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-gray-400 hover:text-white transition-all"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-3 sm:p-4 space-y-2">
                {resumenPagos.distintos.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 bg-zinc-800/50 border border-yellow-400/10 rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{p.nombre}</p>
                      <p className="text-xs text-gray-500">DNI {p.dni}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-white font-semibold">{formatearMonto(p.pagado)}</p>
                      <p
                        className={`text-xs ${p.diferencia > 0 ? "text-orange-400" : "text-green-400"}`}
                      >
                        {p.diferencia > 0
                          ? `faltan ${formatearMonto(p.diferencia)}`
                          : `pagó ${formatearMonto(-p.diferencia)} de más`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-yellow-400/20 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-400">
                  Falta cobrar de este grupo:{" "}
                  <span className="text-orange-400 font-semibold">
                    {formatearMonto(
                      resumenPagos.distintos.reduce((s, p) => s + Math.max(p.diferencia, 0), 0)
                    )}
                  </span>
                </p>
                <button
                  onClick={() => {
                    setFiltroPago("otro-precio")
                    setCurrentPage(1)
                    setVerPagosDistintos(false)
                  }}
                  className="px-4 py-2 rounded-lg bg-zinc-800 border border-yellow-400/30 text-yellow-400 text-sm hover:bg-zinc-700 transition-all"
                >
                  Filtrar el listado
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

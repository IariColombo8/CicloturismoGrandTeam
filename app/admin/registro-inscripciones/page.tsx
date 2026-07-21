"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { collection, query, onSnapshot, orderBy, getDocs, where, doc, updateDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { motion } from "framer-motion"
import {
  Users,
  LogOut,
  CheckCircle,
  Clock,
  X,
  DollarSign,
  Search,
  Filter,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FilterX,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  User,
  Stethoscope,
  XCircleIcon,
  Loader2,
} from "lucide-react"
import { sendConfirmationEmail, EmailJSProvider } from "@/components/admin/EmailJS"
import { AdminRegistrationsExcel } from "@/components/admin/admin-registrations-excel"
import { AdminRegistrationsPdf } from "@/components/admin/admin-registrations-pdf"

export default function RegistroInscripciones() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [inscripciones, setInscripciones] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [selectedInscripcion, setSelectedInscripcion] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [showFilters, setShowFilters] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [statusNote, setStatusNote] = useState("")
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [comprobanteLoading, setComprobanteLoading] = useState(false)
  const [comprobanteUrl, setComprobanteUrl] = useState(null)
  const [isGrandTeam, setIsGrandTeam] = useState("no")
  const topRef = useRef(null)

  // Verificación de autenticación
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login?returnUrl=/admin/registro-inscripciones")
      } else {
        try {
          const adminRef = collection(db, "administrador")
          const adminQuery = query(adminRef, where("email", "==", user.email))
          const adminSnapshot = await getDocs(adminQuery)

          if (!adminSnapshot.empty) {
            const adminData = adminSnapshot.docs[0].data()
            if (adminData.role === "admin" || adminData.role === "grandteam") {
              setIsAuthorized(true)
              setUser(user)
            } else {
              router.push("/")
            }
          } else {
            router.push("/")
          }
        } catch (error) {
          console.error("Error verificando permisos:", error)
          router.push("/")
        }
      }
    })
    return () => unsubscribe()
  }, [router])

  // Cargar inscripciones de Firebase - SIN COMPROBANTES
  useEffect(() => {
    if (!user) return

    const q = query(collection(db, "inscripciones"), orderBy("fechaInscripcion", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data()
        return {
          id: doc.id,
          nombres: docData.nombres,
          apellidos: docData.apellidos,
          email: docData.email,
          telefono: docData.telefono,
          dni: docData.dni,
          ciudad: docData.ciudad,
          estado: docData.estado,
          fechaInscripcion: docData.fechaInscripcion,
          precio: docData.precio,
          grupoCiclistas: docData.grupoCiclistas,
          esCeliaco: docData.esCeliaco,
          grupoSanguineo: docData.grupoSanguineo,
          condicionSalud: docData.condicionSalud,
          alergias: docData.alergias,
          telefonoEmergencia: docData.telefonoEmergencia,
          metodoPago: docData.metodoPago,
          numeroReferencia: docData.numeroReferencia,
          fechaNacimiento: docData.fechaNacimiento,
          genero: docData.genero,
          localidad: docData.localidad,
          categoria: docData.categoria,
          recorrido: docData.recorrido,
          tipoSangre: docData.tipoSangre,
          nota: docData.nota,
          comprobante: docData.comprobante,
          comprobantePagoUrl: docData.comprobantePagoUrl,
          comprobanteUrl: docData.comprobanteUrl,
          comprobanteBase64: docData.comprobanteBase64, // Added this field
          aprobadoPorAdmin: docData.aprobadoPorAdmin, // Added this field
        }
      })
      setInscripciones(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/")
  }

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const pendientes = inscripciones.filter((i) => i.estado === "pendiente" || !i.estado)
  const confirmadas = inscripciones.filter((i) => i.estado === "confirmada")
  const rechazadas = inscripciones.filter((i) => i.estado === "rechazada")

  const ingresos = confirmadas.reduce((sum, insc) => {
    const precio = insc.precio || "0"
    const numero = typeof precio === "string" ? Number.parseFloat(precio.replace(/[^0-9.]/g, "")) || 0 : precio
    return sum + numero
  }, 0)

  const filteredInscripciones = inscripciones.filter((insc) => {
    const matchesSearch =
      insc.nombres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insc.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insc.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insc.dni?.includes(searchTerm)

    const matchesStatus = statusFilter === "all" || insc.estado === statusFilter

    return matchesSearch && matchesStatus
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredInscripciones.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredInscripciones.length / itemsPerPage)

  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "confirmada":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle className="w-3 h-3 inline mr-1" />
            Confirmada
          </span>
        )
      case "pendiente":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Clock className="w-3 h-3 inline mr-1" />
            Pendiente
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

  const openDetailsModal = (inscripcion: (typeof inscripciones)[0]) => {
    setSelectedInscripcion(inscripcion)
    setNewStatus(inscripcion.estado || "pendiente")
    setStatusNote(inscripcion.nota || "")
    if (inscripcion.grupoCiclistas === "Grand Team Bike CdelU") {
      setIsGrandTeam("si")
    } else {
      setIsGrandTeam("no")
    }
    setIsDetailsModalOpen(true)
    setComprobanteUrl(null) // Reset until loaded
  }

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false)
    setSelectedInscripcion(null)
    setComprobanteUrl(null)
    setComprobanteLoading(false)
  }

  const loadComprobante = async () => {
    if (!selectedInscripcion) return

    setComprobanteLoading(true)
    try {
      if (selectedInscripcion.comprobanteBase64) {
        setComprobanteUrl(selectedInscripcion.comprobanteBase64)
      } else {
        // Fallback to existing URLs if base64 is not available
        const url =
          selectedInscripcion.comprobanteUrl ||
          selectedInscripcion.comprobantePagoUrl ||
          selectedInscripcion.comprobante
        setComprobanteUrl(url)
      }
    } catch (error) {
      console.error("Error loading comprobante:", error)
    } finally {
      setComprobanteLoading(false)
    }
  }

  const updateStatus = async () => {
    if (!selectedInscripcion) return

    setUpdatingStatus(true)

    try {
      const wasConfirmed = selectedInscripcion.estado !== "confirmada" && newStatus === "confirmada"
      const wasRejected = selectedInscripcion.estado !== "rechazada" && newStatus === "rechazada"

      // Update firestore
      await updateDoc(doc(db, "inscripciones", selectedInscripcion.id), {
        estado: newStatus,
        nota: statusNote,
        aprobadoPorAdmin: newStatus === "confirmada",
      })

      // Send email if changed to confirmed or rejected
      if (wasConfirmed) {
        sendConfirmationEmail(selectedInscripcion.email, selectedInscripcion.nombres, "confirmed")
      } else if (wasRejected) {
        sendConfirmationEmail(selectedInscripcion.email, selectedInscripcion.nombres, "rejected")
      }

      // If marked as Grand Team, redirect to grandteam page
      if (isGrandTeam === "si") {
        setTimeout(() => {
          router.push("/admin/grandteam")
        }, 500)
      }

      setInscripciones((prev) =>
        prev.map((insc) =>
          insc.id === selectedInscripcion.id
            ? {
                ...insc,
                estado: newStatus,
                nota: statusNote,
                aprobadoPorAdmin: newStatus === "confirmada",
              }
            : insc,
        ),
      )

      closeDetailsModal()
    } catch (error) {
      console.error("Error updating status:", error)
      alert("Error al actualizar el estado")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const exportApprovedToPDF = () => {
    const approvedRegistrations = inscripciones.filter((reg) => reg.estado === "confirmada")
    console.log("Exportando", approvedRegistrations.length, "inscripciones confirmadas")
    alert(`Exportando ${approvedRegistrations.length} inscripciones confirmadas`)
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
      <EmailJSProvider />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          ref={topRef}
          className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-yellow-400/20 pb-4 gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
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
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition-all text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {[
            { title: "Total", value: inscripciones.length, icon: Users, color: "blue" },
            { title: "Confirmadas", value: confirmadas.length, icon: CheckCircle, color: "green" },
            { title: "Pendientes", value: pendientes.length, icon: Clock, color: "yellow" },
            { title: "Ingresos", value: `$${ingresos.toLocaleString("es-AR")}`, icon: DollarSign, color: "purple" },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.title}
                className="bg-zinc-900 border border-yellow-400/20 rounded-lg p-4 hover:border-yellow-400/40 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs text-gray-400">{stat.title}</div>
                  <Icon className={`w-4 h-4 text-${stat.color}-400`} />
                </div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stat.title === "Ingresos"
                    ? "Total recaudado"
                    : stat.title === "Total"
                      ? "Inscripciones"
                      : stat.title === "Confirmadas"
                        ? "Aprobadas"
                        : "En revisión"}
                </div>
              </div>
            )
          })}
        </motion.div>

        {/* Main Content */}
        <motion.div
          className="bg-black/60 border border-yellow-400/20 rounded-lg backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="p-4 border-b border-yellow-400/20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-yellow-400" />
                  Listado de Inscripciones
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredInscripciones.length)} de{" "}
                  {filteredInscripciones.length}
                </p>
              </div>
              <div className="flex gap-2">
                <AdminRegistrationsExcel registrations={inscripciones} />
                <AdminRegistrationsPdf registrations={inscripciones} />
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
                  onChange={(e) => setStatusFilter(e.target.value)}
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
            {filteredInscripciones.length > 0 ? (
              <table className="w-full">
                <thead className="bg-zinc-800/50 border-b border-yellow-400/20">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 hidden md:table-cell">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 hidden md:table-cell">
                      Ciudad
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-yellow-400/10">
                  {currentItems.map((insc, index) => (
                    <tr key={insc.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-400">{indexOfFirstItem + index + 1}</td>
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
                        <button
                          onClick={() => openDetailsModal(insc)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-800 border border-yellow-400/20 text-yellow-400 hover:bg-zinc-700 transition-all text-xs"
                        >
                          <Eye className="w-3 h-3" />
                          <span className="hidden sm:inline">Ver</span>
                        </button>
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
                    : "No hay inscripciones registradas"}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredInscripciones.length > itemsPerPage && (
            <div className="p-4 border-t border-yellow-400/20 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-xs text-gray-400">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-zinc-800 border border-yellow-400/20 text-yellow-400 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 3) {
                    pageNum = i + 1
                  } else if (currentPage <= 2) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 1) {
                    pageNum = totalPages - 2 + i
                  } else {
                    pageNum = currentPage - 1 + i
                  }

                  return (
                    <button
                      key={i}
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
            </div>
          )}
        </motion.div>
      </div>

      {/* Detail Modal */}
      {isDetailsModalOpen && selectedInscripcion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            className="bg-black border border-yellow-400/20 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* Modal Header */}
            <div className="sticky top-0 border-b border-yellow-400/20 bg-black/90 backdrop-blur-sm p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-yellow-400">Detalles de Inscripción</h2>
              <button onClick={closeDetailsModal} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Estado */}
              <div className="bg-zinc-900 border border-yellow-400/20 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Estado actual</span>
                  {getStatusBadge(selectedInscripcion.estado)}
                </div>
              </div>

              {/* Información Personal */}
              <div className="bg-zinc-900/50 border border-yellow-400/10 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Información Personal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Nombre Completo</label>
                    <p className="text-sm text-white mt-1">
                      {selectedInscripcion.nombres} {selectedInscripcion.apellidos}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">DNI/Cédula</label>
                    <p className="text-sm text-white mt-1">{selectedInscripcion.dni || "-"}</p>
                  </div>
                  {selectedInscripcion.fechaNacimiento && (
                    <div>
                      <label className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fecha de Nacimiento
                      </label>
                      <p className="text-sm text-white mt-1">{selectedInscripcion.fechaNacimiento}</p>
                    </div>
                  )}
                  {selectedInscripcion.genero && (
                    <div>
                      <label className="text-xs text-gray-500">Género</label>
                      <p className="text-sm text-white mt-1 capitalize">{selectedInscripcion.genero}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="bg-zinc-900/50 border border-yellow-400/10 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Información de Contacto
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">Email</label>
                    <p className="text-sm text-white mt-1 break-words">{selectedInscripcion.email}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Teléfono
                    </label>
                    <p className="text-sm text-white mt-1">{selectedInscripcion.telefono}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Localidad
                    </label>
                    <p className="text-sm text-white mt-1">
                      {selectedInscripcion.localidad || selectedInscripcion.ciudad || "-"}
                    </p>
                  </div>
                  {selectedInscripcion.telefonoEmergencia && (
                    <div>
                      <label className="text-xs text-gray-500">Tel. Emergencia</label>
                      <p className="text-sm text-white mt-1">{selectedInscripcion.telefonoEmergencia}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información del Evento */}
              <div className="bg-zinc-900/50 border border-yellow-400/10 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Información del Evento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedInscripcion.categoria && (
                    <div>
                      <label className="text-xs text-gray-500">Categoría</label>
                      <p className="text-sm text-white mt-1 capitalize">{selectedInscripcion.categoria}</p>
                    </div>
                  )}
                  {selectedInscripcion.grupoCiclistas && (
                    <div>
                      <label className="text-xs text-gray-500">Grupo de Ciclistas</label>
                      <p className="text-sm text-white mt-1">{selectedInscripcion.grupoCiclistas}</p>
                    </div>
                  )}
                  {selectedInscripcion.recorrido && (
                    <div>
                      <label className="text-xs text-gray-500">Recorrido</label>
                      <p className="text-sm text-white mt-1">{selectedInscripcion.recorrido}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de Salud */}
              <div className="bg-zinc-900/50 border border-yellow-400/10 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  Información de Salud
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedInscripcion.grupoSanguineo && (
                    <div>
                      <label className="text-xs text-gray-500">Grupo Sanguíneo</label>
                      <p className="text-sm text-white mt-1 font-medium">{selectedInscripcion.grupoSanguineo}</p>
                    </div>
                  )}
                  {selectedInscripcion.tipoSangre && (
                    <div>
                      <label className="text-xs text-gray-500">Tipo de Sangre</label>
                      <p className="text-sm text-white mt-1 font-medium">{selectedInscripcion.tipoSangre}</p>
                    </div>
                  )}
                  {selectedInscripcion.esCeliaco && (
                    <div>
                      <label className="text-xs text-gray-500">¿Es Celíaco?</label>
                      <p className="text-sm text-white mt-1 font-medium capitalize">{selectedInscripcion.esCeliaco}</p>
                    </div>
                  )}
                  {selectedInscripcion.condicionSalud && (
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500">Condiciones de Salud</label>
                      <p className="text-sm text-white mt-1 bg-zinc-800 p-3 rounded border border-yellow-400/10">
                        {selectedInscripcion.condicionSalud}
                      </p>
                    </div>
                  )}
                  {selectedInscripcion.alergias && (
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500">Alergias</label>
                      <p className="text-sm text-white mt-1 bg-yellow-500/10 p-3 rounded border border-yellow-400/20">
                        {selectedInscripcion.alergias}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información de Pago */}
              <div className="bg-zinc-900/50 border border-yellow-400/10 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Información de Pago
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedInscripcion.metodoPago && (
                    <div>
                      <label className="text-xs text-gray-500">Método de Pago</label>
                      <p className="text-sm text-white mt-1 capitalize">
                        {selectedInscripcion.metodoPago.replace("_", " ")}
                      </p>
                    </div>
                  )}
                  {selectedInscripcion.numeroReferencia && (
                    <div>
                      <label className="text-xs text-gray-500">Nº de Referencia</label>
                      <p className="text-sm text-white mt-1 font-mono">{selectedInscripcion.numeroReferencia}</p>
                    </div>
                  )}
                  {selectedInscripcion.precio && (
                    <div>
                      <label className="text-xs text-gray-500">Precio</label>
                      <p className="text-sm text-white mt-1 font-semibold">{selectedInscripcion.precio}</p>
                    </div>
                  )}
                </div>

                {(selectedInscripcion.comprobanteUrl ||
                  selectedInscripcion.comprobantePagoUrl ||
                  selectedInscripcion.comprobanteBase64 ||
                  selectedInscripcion.comprobante) && (
                  <div className="mt-4">
                    <label className="text-xs font-medium text-gray-400 flex items-center gap-1 mb-2">
                      <FileText className="h-3 w-3" />
                      Comprobante de Pago
                    </label>
                    {comprobanteUrl ? (
                      <div className="bg-zinc-800 rounded-lg p-4 border border-yellow-400/10 max-h-96 overflow-auto">
                        <img
                          src={comprobanteUrl || "/placeholder.svg"}
                          alt="Comprobante"
                          className="max-h-96 mx-auto rounded shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => window.open(comprobanteUrl, "_blank")}
                        />
                        <p className="text-xs text-center text-gray-500 mt-2">Click para ver en tamaño completo</p>
                      </div>
                    ) : (
                      <button
                        onClick={loadComprobante}
                        disabled={comprobanteLoading}
                        className="w-full px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {comprobanteLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Cargando comprobante...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            Ver Comprobante
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-zinc-900/50 border border-yellow-400/10 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-400 mb-3">¿Es Grand Team?</h3>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isGrandTeam"
                      value="si"
                      checked={isGrandTeam === "si"}
                      onChange={(e) => setIsGrandTeam(e.target.value)}
                      className="accent-yellow-400"
                    />
                    <span className="text-sm text-white">Sí</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isGrandTeam"
                      value="no"
                      checked={isGrandTeam === "no"}
                      onChange={(e) => setIsGrandTeam(e.target.value)}
                      className="accent-yellow-400"
                    />
                    <span className="text-sm text-white">No</span>
                  </label>
                </div>
              </div>

              {/* Notas adicionales */}
              {selectedInscripcion.nota && (
                <div className="bg-yellow-500/10 border border-yellow-400/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-yellow-400 mb-2">Notas Administrativas</h3>
                  <p className="text-sm text-gray-300">{selectedInscripcion.nota}</p>
                </div>
              )}

              {/* Status Update Section */}
              <div className="bg-zinc-900/50 border border-yellow-400/10 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-400 mb-3">Cambiar Estado</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Nuevo Estado</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-yellow-400/20 rounded text-white text-sm focus:outline-none focus:border-yellow-400/40"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="rechazada">Rechazada</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Nota</label>
                    <textarea
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-yellow-400/20 rounded text-white text-sm focus:outline-none focus:border-yellow-400/40 resize-none"
                      rows={3}
                      placeholder="Agregar nota (opcional)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-yellow-400/20 bg-black/90 backdrop-blur-sm p-4 flex justify-end gap-2">
              <button
                onClick={closeDetailsModal}
                className="px-4 py-2 bg-zinc-800 border border-yellow-400/20 text-gray-400 rounded-lg hover:bg-zinc-700 transition-all text-sm"
              >
                Cerrar
              </button>
              <button
                onClick={updateStatus}
                disabled={updatingStatus}
                className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-50 text-sm flex items-center gap-2"
              >
                {updatingStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

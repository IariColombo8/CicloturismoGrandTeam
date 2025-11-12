"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { collection, query, onSnapshot, orderBy, getDocs, where, doc, updateDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { motion } from "framer-motion"
import Navbar from "@/components/Navbar"
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
  MapPin,
  Calendar,
  FileText,
  Edit,
  User,
  Stethoscope,
  ClipboardList,
  XCircle as XCircleIcon,
  Loader2
} from "lucide-react"

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

  // Cargar inscripciones de Firebase
  useEffect(() => {
    if (!user) return
    
    const q = query(collection(db, "inscripciones"), orderBy("fechaInscripcion", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      console.log("📦 Datos Firestore:", data)
      setInscripciones(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleRefresh = async () => {
    setRefreshing(true)
    // Los datos se actualizarán automáticamente por onSnapshot
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
    const numero = typeof precio === "string" 
      ? parseFloat(precio.replace(/[^0-9.]/g, "")) || 0 
      : precio
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

  const openDetailsModal = (insc) => {
    setSelectedInscripcion(insc)
    setNewStatus(insc.estado || "pendiente")
    setStatusNote(insc.nota || "")
    setIsDetailsModalOpen(true)
  }

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false)
    setSelectedInscripcion(null)
  }

  const updateStatus = async () => {
    if (!selectedInscripcion) return
    
    setUpdatingStatus(true)
    try {
      const registrationRef = doc(db, "inscripciones", selectedInscripcion.id)
      await updateDoc(registrationRef, {
        estado: newStatus,
        nota: statusNote,
        fechaActualizacion: new Date(),
      })

      setInscripciones((prev) =>
        prev.map((insc) =>
          insc.id === selectedInscripcion.id
            ? { ...insc, estado: newStatus, nota: statusNote }
            : insc
        )
      )
      
      closeDetailsModal()
    } catch (error) {
      console.error("Error updating registration:", error)
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-yellow-400/20 text-yellow-400 hover:bg-zinc-700 transition-all text-sm ${refreshing ? 'opacity-70' : ''}`}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
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
            { title: "Ingresos", value: `$${ingresos.toLocaleString("es-AR")}`, icon: DollarSign, color: "purple" }
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.title} className="bg-zinc-900 border border-yellow-400/20 rounded-lg p-4 hover:border-yellow-400/40 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs text-gray-400">{stat.title}</div>
                  <Icon className={`w-4 h-4 text-${stat.color}-400`} />
                </div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {stat.title === "Ingresos" ? "Total recaudado" : 
                   stat.title === "Total" ? "Inscripciones" : 
                   stat.title === "Confirmadas" ? "Aprobadas" : "En revisión"}
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
                  Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredInscripciones.length)} de {filteredInscripciones.length}
                </p>
              </div>
              <button
                onClick={exportApprovedToPDF}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-yellow-400/20 text-yellow-400 hover:bg-zinc-700 transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                Exportar PDF
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
            <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 hidden md:table-cell">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 hidden md:table-cell">Ciudad</th>
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
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-3 py-1 bg-zinc-800 border border-yellow-400/20 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400/40"
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="150">150</option>
              </select>
            </div>
          )}
        </motion.div>

        {/* Scroll to top button */}
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-full bg-yellow-400 text-black hover:bg-yellow-500 shadow-lg hover:shadow-xl transition-all z-50"
        >
          <ArrowUp className="w-5 h-5" />
        </button>

        {/* Details Modal */}
        {isDetailsModalOpen && selectedInscripcion && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-zinc-900 border border-yellow-400/20 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="sticky top-0 bg-zinc-900 border-b border-yellow-400/20 p-4 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Detalles de Inscripción
                </h2>
                <button
                  onClick={closeDetailsModal}
                  className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Personal Info */}
                <div className="bg-zinc-800/50 border border-yellow-400/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-3">
                    <User className="w-4 h-4" />
                    Información Personal
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
                    Información de Contacto
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-400">Email</div>
                      <div className="text-sm text-white break-words">{selectedInscripcion.email}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Teléfono</div>
                      <div className="text-sm text-white">{selectedInscripcion.telefono || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Ciudad</div>
                      <div className="text-sm text-white">{selectedInscripcion.ciudad || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* Event Info */}
                <div className="bg-zinc-800/50 border border-yellow-400/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-3">
                    <ClipboardList className="w-4 h-4" />
                    Información del Evento
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-gray-400">Talle de Remera</div>
                      <div className="text-sm text-white uppercase">{selectedInscripcion.talleRemera || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Grupo Sanguíneo</div>
                      <div className="text-sm text-white">{selectedInscripcion.grupoSanguineo || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Grupo de Ciclistas</div>
                      <div className="text-sm text-white">{selectedInscripcion.grupoCiclistas || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="bg-zinc-800/50 border border-yellow-400/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4" />
                    Información de Pago
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs text-gray-400">Método de Pago</div>
                      <div className="text-sm text-white capitalize">{selectedInscripcion.metodoPago?.replace("_", " ") || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Precio</div>
                      <div className="text-sm font-semibold text-green-400">{selectedInscripcion.precio || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">N° de Referencia</div>
                      <div className="text-sm text-white font-mono">{selectedInscripcion.numeroReferencia || "-"}</div>
                    </div>
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
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
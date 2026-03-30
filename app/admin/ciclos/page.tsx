"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useFirebaseContext } from "@/components/providers/FirebaseProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Bike,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  MapPin,
  Calendar,
  Clock,
  Mountain,
  Star,
  X,
  Save,
} from "lucide-react"

interface Ciclo {
  id: string
  nombre: string
  descripcion: string
  localidad: string
  distancia: string
  duracion: string
  dificultad: string
  fecha: string
  puntoSalida: string
  linkInscripcion: string
  latitud: string
  longitud: string
  publicado: boolean
  destacado: boolean
  creadoEn: string
}

const DIFICULTADES = [
  { value: "facil", label: "Fácil" },
  { value: "media", label: "Media" },
  { value: "dificil", label: "Difícil" },
  { value: "extrema", label: "Extrema" },
]

// Coordenadas de localidades de Entre Ríos para autocompletar
const LOCALIDADES_ER: Record<string, { lat: string; lng: string }> = {
  "Aldea San Antonio": { lat: "-32.6381", lng: "-58.7089" },
  "Basavilbaso": { lat: "-32.3719", lng: "-58.8822" },
  "Bovril": { lat: "-31.3438", lng: "-59.4456" },
  "Caseros": { lat: "-32.4607", lng: "-58.4748" },
  "Cerrito": { lat: "-31.5795", lng: "-60.0697" },
  "Chajarí": { lat: "-30.7522", lng: "-57.9835" },
  "Colón": { lat: "-32.2234", lng: "-58.1410" },
  "Concepción del Uruguay": { lat: "-32.4846", lng: "-58.2326" },
  "Concordia": { lat: "-31.3929", lng: "-58.0209" },
  "Crespo": { lat: "-32.0290", lng: "-60.3066" },
  "Diamante": { lat: "-32.0665", lng: "-60.6434" },
  "El Pingo": { lat: "-32.6333", lng: "-58.4833" },
  "Federal": { lat: "-30.9547", lng: "-58.7842" },
  "Federación": { lat: "-30.9858", lng: "-57.9202" },
  "General Ramírez": { lat: "-32.1778", lng: "-60.2000" },
  "Gualeguay": { lat: "-33.1425", lng: "-59.3099" },
  "Gualeguaychú": { lat: "-33.0094", lng: "-58.5172" },
  "Hasenkamp": { lat: "-31.5138", lng: "-59.8318" },
  "Hernandarias": { lat: "-31.2344", lng: "-60.0695" },
  "Hernández": { lat: "-32.3452", lng: "-60.0191" },
  "La Paz": { lat: "-30.7444", lng: "-59.6434" },
  "Larroque": { lat: "-33.0343", lng: "-59.0002" },
  "Lucas González": { lat: "-32.3827", lng: "-59.5308" },
  "Maciá": { lat: "-32.1714", lng: "-59.3991" },
  "María Grande": { lat: "-31.6114", lng: "-59.8959" },
  "Nogoyá": { lat: "-32.3934", lng: "-59.7907" },
  "Oro Verde": { lat: "-31.8271", lng: "-60.5178" },
  "Paraná": { lat: "-31.7413", lng: "-60.5115" },
  "Pueblo General Belgrano": { lat: "-32.0847", lng: "-58.4903" },
  "Rosario del Tala": { lat: "-32.3003", lng: "-59.1452" },
  "San Benito": { lat: "-31.7809", lng: "-60.4409" },
  "San José": { lat: "-32.1960", lng: "-58.2164" },
  "San José de Feliciano": { lat: "-30.3846", lng: "-58.7520" },
  "San Salvador": { lat: "-31.6254", lng: "-58.5009" },
  "Santa Ana": { lat: "-30.9014", lng: "-58.0617" },
  "Santa Elena": { lat: "-30.9492", lng: "-59.7867" },
  "Sauce de Luna": { lat: "-31.2369", lng: "-59.2125" },
  "Seguí": { lat: "-31.9534", lng: "-60.1233" },
  "Urdinarrain": { lat: "-32.6845", lng: "-58.8890" },
  "Viale": { lat: "-31.8681", lng: "-60.0064" },
  "Victoria": { lat: "-32.6189", lng: "-60.1546" },
  "Villa Elisa": { lat: "-32.1628", lng: "-58.4009" },
  "Villa Paranacito": { lat: "-33.7173", lng: "-58.6574" },
  "Villaguay": { lat: "-31.8667", lng: "-59.0261" },
}

const cicloVacio = {
  nombre: "",
  descripcion: "",
  localidad: "",
  distancia: "",
  duracion: "",
  dificultad: "media",
  fecha: "",
  puntoSalida: "",
  linkInscripcion: "",
  latitud: "",
  longitud: "",
  publicado: true,
  destacado: false,
}

export default function AdminCiclos() {
  const router = useRouter()
  const { user, userRole, loading: authLoading } = useFirebaseContext()
  const [ciclos, setCiclos] = useState<Ciclo[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [formulario, setFormulario] = useState(cicloVacio)
  const [guardando, setGuardando] = useState(false)

  const isAuthorized = userRole === "admin" || userRole === "grandteam"

  // Redirigir si no autorizado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?returnUrl=/admin/ciclos")
    } else if (!authLoading && user && !isAuthorized) {
      router.push("/")
    }
  }, [authLoading, user, isAuthorized, router])

  // Load ciclos
  useEffect(() => {
    if (!isAuthorized || !user) return
    const q = query(collection(db, "ciclos"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .sort((a, b) => {
          const dateA = a.creadoEn || ""
          const dateB = b.creadoEn || ""
          return dateB.localeCompare(dateA)
        }) as Ciclo[]
      setCiclos(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [isAuthorized])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormulario((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
      }
      // Autocompletar coordenadas al seleccionar localidad conocida
      if (name === "localidad" && LOCALIDADES_ER[value]) {
        updated.latitud = LOCALIDADES_ER[value].lat
        updated.longitud = LOCALIDADES_ER[value].lng
      }
      return updated
    })
  }

  const handleGuardar = async () => {
    if (!formulario.nombre.trim()) return
    setGuardando(true)
    try {
      if (editandoId) {
        await updateDoc(doc(db, "ciclos", editandoId), {
          ...formulario,
          actualizadoEn: new Date().toISOString(),
        })
      } else {
        await addDoc(collection(db, "ciclos"), {
          ...formulario,
          creadoEn: new Date().toISOString(),
        })
      }
      setFormulario(cicloVacio)
      setMostrarFormulario(false)
      setEditandoId(null)
    } catch (error) {
      console.error("Error guardando ciclo:", error)
    }
    setGuardando(false)
  }

  const handleEditar = (ciclo: Ciclo) => {
    setFormulario({
      nombre: ciclo.nombre || "",
      descripcion: ciclo.descripcion || "",
      localidad: ciclo.localidad || "",
      distancia: ciclo.distancia || "",
      duracion: ciclo.duracion || "",
      dificultad: ciclo.dificultad || "media",
      fecha: ciclo.fecha || "",
      puntoSalida: ciclo.puntoSalida || "",
      linkInscripcion: ciclo.linkInscripcion || "",
      latitud: ciclo.latitud || "",
      longitud: ciclo.longitud || "",
      publicado: ciclo.publicado ?? true,
      destacado: ciclo.destacado ?? false,
    })
    setEditandoId(ciclo.id)
    setMostrarFormulario(true)
  }

  const handleEliminar = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este ciclo?")) return
    try {
      await deleteDoc(doc(db, "ciclos", id))
    } catch (error) {
      console.error("Error eliminando ciclo:", error)
    }
  }

  const togglePublicado = async (ciclo: Ciclo) => {
    try {
      await updateDoc(doc(db, "ciclos", ciclo.id), {
        publicado: !ciclo.publicado,
      })
    } catch (error) {
      console.error("Error actualizando ciclo:", error)
    }
  }

  const toggleDestacado = async (ciclo: Ciclo) => {
    try {
      await updateDoc(doc(db, "ciclos", ciclo.id), {
        destacado: !ciclo.destacado,
      })
    } catch (error) {
      console.error("Error actualizando ciclo:", error)
    }
  }

  if (authLoading || (!userRole && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-yellow-400 text-lg animate-pulse">Cargando...</div>
      </div>
    )
  }

  if (!isAuthorized) return null

  const dificultadColor: Record<string, string> = {
    facil: "text-green-400",
    media: "text-yellow-400",
    dificil: "text-orange-400",
    extrema: "text-red-400",
  }

  return (
    <div className="min-h-screen pt-20">
      {/* Header */}
      <div className="border-b border-yellow-400/20 bg-black/50 backdrop-blur-sm sticky top-20 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-white">
                <span className="gradient-text">Ciclos</span> de la Provincia
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Gestionar los ciclos y rutas ciclísticas publicados
              </p>
            </div>
            <Button
              onClick={() => {
                setFormulario(cicloVacio)
                setEditandoId(null)
                setMostrarFormulario(true)
              }}
              className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black font-bold hover:scale-105 transition-transform"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Ciclo
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modal/Formulario */}
        {mostrarFormulario && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-yellow-400/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                <h2 className="text-xl font-bold text-white">
                  {editandoId ? "Editar Ciclo" : "Nuevo Ciclo"}
                </h2>
                <button
                  onClick={() => {
                    setMostrarFormulario(false)
                    setEditandoId(null)
                  }}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nombre del ciclo *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formulario.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Gran Fondo Entre Ríos"
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 transition-colors"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    name="descripcion"
                    value={formulario.descripcion}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Descripción del ciclo, recorrido, etc."
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 transition-colors resize-none"
                  />
                </div>

                {/* Localidad (select) y Punto de salida */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Localidad
                    </label>
                    <select
                      name="localidad"
                      value={formulario.localidad}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400/50 transition-colors"
                    >
                      <option value="">Seleccionar localidad...</option>
                      {Object.keys(LOCALIDADES_ER).map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    {formulario.latitud && formulario.longitud && (
                      <p className="text-xs text-green-400 mt-1">
                        Coordenadas: {formulario.latitud}, {formulario.longitud}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Punto de salida
                    </label>
                    <input
                      type="text"
                      name="puntoSalida"
                      value={formulario.puntoSalida}
                      onChange={handleChange}
                      placeholder="Ej: Plaza principal"
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Coordenadas (se autocompletan o se ingresan manual) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Latitud <span className="text-gray-500 text-xs">(auto o manual)</span>
                    </label>
                    <input
                      type="text"
                      name="latitud"
                      value={formulario.latitud}
                      onChange={handleChange}
                      placeholder="Ej: -31.7413"
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Longitud <span className="text-gray-500 text-xs">(auto o manual)</span>
                    </label>
                    <input
                      type="text"
                      name="longitud"
                      value={formulario.longitud}
                      onChange={handleChange}
                      placeholder="Ej: -60.5115"
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Distancia, Duración, Dificultad */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Distancia (km)
                    </label>
                    <input
                      type="text"
                      name="distancia"
                      value={formulario.distancia}
                      onChange={handleChange}
                      placeholder="Ej: 50"
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Duración
                    </label>
                    <input
                      type="text"
                      name="duracion"
                      value={formulario.duracion}
                      onChange={handleChange}
                      placeholder="Ej: 3-4 hrs"
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Dificultad
                    </label>
                    <select
                      name="dificultad"
                      value={formulario.dificultad}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400/50 transition-colors"
                    >
                      {DIFICULTADES.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Fecha del evento
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={formulario.fecha}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-yellow-400/50 transition-colors"
                  />
                </div>

                {/* Link inscripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Link de inscripción (opcional)
                  </label>
                  <input
                    type="url"
                    name="linkInscripcion"
                    value={formulario.linkInscripcion}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50 transition-colors"
                  />
                </div>

                {/* Checkboxes */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="publicado"
                      checked={formulario.publicado}
                      onChange={handleChange}
                      className="w-4 h-4 accent-yellow-400"
                    />
                    <span className="text-sm text-gray-300">Publicado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="destacado"
                      checked={formulario.destacado}
                      onChange={handleChange}
                      className="w-4 h-4 accent-yellow-400"
                    />
                    <span className="text-sm text-gray-300">Destacado</span>
                  </label>
                </div>
              </div>

              {/* Footer del modal */}
              <div className="flex justify-end gap-3 p-6 border-t border-zinc-800">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMostrarFormulario(false)
                    setEditandoId(null)
                  }}
                  className="border-zinc-700 text-gray-300 hover:bg-zinc-800"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleGuardar}
                  disabled={guardando || !formulario.nombre.trim()}
                  className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {guardando ? "Guardando..." : editandoId ? "Actualizar" : "Crear Ciclo"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-black/50 border-yellow-400/20">
            <CardContent className="pt-4 sm:pt-6 pb-4 text-center">
              <p className="text-2xl sm:text-3xl font-black text-white">{ciclos.length}</p>
              <p className="text-xs text-gray-400 mt-1">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-black/50 border-green-400/20">
            <CardContent className="pt-4 sm:pt-6 pb-4 text-center">
              <p className="text-2xl sm:text-3xl font-black text-green-400">
                {ciclos.filter((c) => c.publicado).length}
              </p>
              <p className="text-xs text-gray-400 mt-1">Publicados</p>
            </CardContent>
          </Card>
          <Card className="bg-black/50 border-gray-400/20">
            <CardContent className="pt-4 sm:pt-6 pb-4 text-center">
              <p className="text-2xl sm:text-3xl font-black text-gray-400">
                {ciclos.filter((c) => !c.publicado).length}
              </p>
              <p className="text-xs text-gray-400 mt-1">Borradores</p>
            </CardContent>
          </Card>
          <Card className="bg-black/50 border-yellow-400/20">
            <CardContent className="pt-4 sm:pt-6 pb-4 text-center">
              <p className="text-2xl sm:text-3xl font-black text-yellow-400">
                {ciclos.filter((c) => c.destacado).length}
              </p>
              <p className="text-xs text-gray-400 mt-1">Destacados</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de ciclos */}
        {ciclos.length === 0 ? (
          <div className="text-center py-20">
            <Bike className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-4">No hay ciclos creados aún</p>
            <Button
              onClick={() => {
                setFormulario(cicloVacio)
                setEditandoId(null)
                setMostrarFormulario(true)
              }}
              className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black font-bold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Crear el primero
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {ciclos.map((ciclo) => (
              <Card
                key={ciclo.id}
                className={`bg-black/50 backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] ${
                  ciclo.publicado
                    ? "border-yellow-400/20 hover:border-yellow-400/40"
                    : "border-zinc-800 opacity-60 hover:opacity-100"
                }`}
              >
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm sm:text-lg font-bold text-white truncate">
                          {ciclo.nombre}
                        </h3>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                            dificultadColor[ciclo.dificultad] || "text-gray-400"
                          }`}
                        >
                          {ciclo.dificultad}
                        </span>
                        {!ciclo.publicado && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-zinc-700 text-gray-400">
                            Borrador
                          </span>
                        )}
                        {ciclo.destacado && (
                          <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-yellow-400" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400 flex-wrap">
                        {ciclo.localidad && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {ciclo.localidad}
                          </span>
                        )}
                        {ciclo.distancia && (
                          <span className="hidden sm:flex items-center gap-1">
                            <Mountain className="w-3 h-3" />
                            {ciclo.distancia} km
                          </span>
                        )}
                        {ciclo.fecha && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(ciclo.fecha).toLocaleDateString("es-AR")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleDestacado(ciclo)}
                        className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                          ciclo.destacado
                            ? "text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20"
                            : "text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10"
                        }`}
                        title={ciclo.destacado ? "Quitar destacado" : "Destacar"}
                      >
                        <Star className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${ciclo.destacado ? "fill-yellow-400" : ""}`} />
                      </button>
                      <button
                        onClick={() => togglePublicado(ciclo)}
                        className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                          ciclo.publicado
                            ? "text-green-400 bg-green-400/10 hover:bg-green-400/20"
                            : "text-gray-500 hover:text-green-400 hover:bg-green-400/10"
                        }`}
                        title={ciclo.publicado ? "Despublicar" : "Publicar"}
                      >
                        {ciclo.publicado ? <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      </button>
                      <button
                        onClick={() => handleEditar(ciclo)}
                        className="p-1.5 sm:p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        onClick={() => handleEliminar(ciclo.id)}
                        className="p-1.5 sm:p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

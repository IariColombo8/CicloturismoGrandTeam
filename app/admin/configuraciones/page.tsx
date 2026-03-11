"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Settings, Save, AlertTriangle, Plus, Calendar, Loader2 } from "lucide-react"

const CURRENT_YEAR = new Date().getFullYear()

export default function ConfiguracionesPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<any>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR))

  const [nombreEvento, setNombreEvento] = useState("")
  const [fechaEvento, setFechaEvento] = useState("")
  const [ubicacion, setUbicacion] = useState("")
  const [recorrido, setRecorrido] = useState("")
  const [categoria, setCategoria] = useState("")
  const [costoInscripcion, setCostoInscripcion] = useState("")
  const [cupoMaximo, setCupoMaximo] = useState("")
  const [queIncluye, setQueIncluye] = useState("")
  const [horaLargada, setHoraLargada] = useState("")
  const [puntoEncuentro, setPuntoEncuentro] = useState("")
  const [aliasTransferencia, setAliasTransferencia] = useState("")
  const [instagram, setInstagram] = useState("")
  const [facebook, setFacebook] = useState("")
  const [telefonoContacto, setTelefonoContacto] = useState("")
  const [emailContacto, setEmailContacto] = useState("")
  const [datosTransferencia, setDatosTransferencia] = useState("")
  const [inscripcionesAbiertas, setInscripcionesAbiertas] = useState(true)

  // Autenticación directa (más robusta que el contexto)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.push("/login?returnUrl=/admin/configuraciones")
        return
      }

      try {
        const adminRef = collection(db, "administrador")
        const adminQuery = query(adminRef, where("email", "==", currentUser.email))
        const adminSnapshot = await getDocs(adminQuery)

        if (!adminSnapshot.empty) {
          const adminData = adminSnapshot.docs[0].data()
          if (adminData.role === "admin") {
            setIsAuthorized(true)
            setUser(currentUser)
          } else {
            router.push("/")
          }
        } else {
          router.push("/")
        }
      } catch (error) {
        console.error("Error verificando permisos:", error)
        router.push("/")
      } finally {
        setLoadingAuth(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  // Cargar años disponibles y config cuando el usuario está autorizado
  useEffect(() => {
    if (!isAuthorized) return

    const loadYearsAndConfig = async () => {
      setLoadingConfig(true)
      try {
        const eventosSnapshot = await getDocs(collection(db, "eventos"))
        const years = eventosSnapshot.docs.map((d) => d.id).sort()

        if (years.length === 0) {
          years.push(String(CURRENT_YEAR))
        }

        setAvailableYears(years)

        // Seleccionar el año actual si existe, sino el último
        const yearToLoad = years.includes(String(CURRENT_YEAR))
          ? String(CURRENT_YEAR)
          : years[years.length - 1]

        setSelectedYear(yearToLoad)
        await loadConfigForYear(yearToLoad)
      } catch (error) {
        console.error("Error cargando años:", error)
        setAvailableYears([String(CURRENT_YEAR)])
        setLoadingConfig(false)
      }
    }

    loadYearsAndConfig()
  }, [isAuthorized])

  const loadConfigForYear = async (year: string) => {
    setLoadingConfig(true)
    try {
      const docRef = doc(db, "eventos", year)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        setNombreEvento(data.nombre || "")
        setFechaEvento(data.fecha || "")
        setUbicacion(data.ubicacion || "")
        setRecorrido(data.recorrido || "")
        setCategoria(data.categoria || "")
        setCostoInscripcion(data.costoInscripcion?.toString() || "")
        setCupoMaximo(data.cupoMaximo?.toString() || "")
        setQueIncluye(data.incluye?.join(", ") || "")
        setHoraLargada(data.horaLargada || "")
        setPuntoEncuentro(data.puntoEncuentro || "")
        setAliasTransferencia(data.aliasTransferencia || "")
        setInstagram(data.redesSociales?.instagram || "")
        setFacebook(data.redesSociales?.facebook || "")
        setTelefonoContacto(data.telefonoContacto || "")
        setEmailContacto(data.emailContacto || "")
        setDatosTransferencia(data.datosTransferencia || "")
        setInscripcionesAbiertas(data.inscripcionesAbiertas === true)
      } else {
        setNombreEvento("")
        setFechaEvento("")
        setUbicacion("")
        setRecorrido("")
        setCategoria("")
        setCostoInscripcion("")
        setCupoMaximo("")
        setQueIncluye("")
        setHoraLargada("")
        setPuntoEncuentro("")
        setAliasTransferencia("")
        setInstagram("")
        setFacebook("")
        setTelefonoContacto("")
        setEmailContacto("")
        setDatosTransferencia("")
        setInscripcionesAbiertas(false)
      }
    } catch (error) {
      console.error("Error cargando configuración:", error)
    } finally {
      setLoadingConfig(false)
    }
  }

  // Cargar config cuando cambia el año seleccionado manualmente
  const handleYearChange = async (year: string) => {
    setSelectedYear(year)
    await loadConfigForYear(year)
  }

  // Toggle inscripciones con guardado inmediato en Firebase
  const handleToggleInscripciones = async (value: boolean) => {
    setInscripcionesAbiertas(value)
    try {
      await setDoc(doc(db, "eventos", selectedYear), { inscripcionesAbiertas: value }, { merge: true })
      toast({
        title: value ? "Inscripciones habilitadas" : "Inscripciones deshabilitadas",
        description: `Las inscripciones ${selectedYear} están ahora ${value ? "abiertas" : "cerradas"}`,
      })
    } catch (error) {
      console.error("Error actualizando inscripciones:", error)
      setInscripcionesAbiertas(!value)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de inscripciones",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    if (!nombreEvento || !fechaEvento || !ubicacion) {
      toast({
        title: "Error",
        description: "Por favor completa los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const eventData = {
        año: Number.parseInt(selectedYear),
        nombre: nombreEvento,
        fecha: fechaEvento,
        ubicacion,
        recorrido,
        categoria,
        costoInscripcion: Number.parseFloat(costoInscripcion) || 0,
        cupoMaximo: Number.parseInt(cupoMaximo) || 300,
        incluye: queIncluye
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        horaLargada,
        puntoEncuentro,
        aliasTransferencia,
        telefonoContacto,
        emailContacto,
        datosTransferencia,
        redesSociales: {
          instagram,
          facebook,
        },
        activo: true,
        inscripcionesAbiertas,
        updatedAt: serverTimestamp(),
      }

      await setDoc(doc(db, "eventos", selectedYear), eventData, { merge: true })

      toast({
        title: "Configuración guardada",
        description: `Los cambios para ${selectedYear} se han guardado exitosamente`,
      })
    } catch (error) {
      console.error("Error guardando configuración:", error)
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateNewYear = async () => {
    const nextYear = String(Math.max(...availableYears.map(Number)) + 1)

    if (!availableYears.includes(nextYear)) {
      setAvailableYears((prev) => [...prev, nextYear].sort())
    }
    setSelectedYear(nextYear)
    await loadConfigForYear(nextYear)
  }

  // Loading mientras Firebase verifica auth
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
          <div className="text-yellow-400 text-lg">Verificando acceso...</div>
        </div>
      </div>
    )
  }

  if (!isAuthorized) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-4 sm:p-6 pt-24 sm:pt-28">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400" />
            <h1 className="text-2xl sm:text-4xl font-bold text-yellow-400">Configuraciones</h1>
          </div>

          {/* Selector de año */}
          <div className="flex items-center gap-2">
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[120px] sm:w-[140px] bg-zinc-800 border-yellow-400/30 text-white">
                <Calendar className="w-4 h-4 mr-2 text-yellow-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-yellow-400/30">
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={handleCreateNewYear}
              className="border-yellow-400/30 text-yellow-400 hover:bg-yellow-400 hover:text-black"
              title="Crear nueva edición"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loadingConfig ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
          </div>
        ) : (
          <Card className="bg-gray-800/50 border-yellow-400/20">
            <CardHeader>
              <CardTitle className="text-yellow-400">Configuración del Evento {selectedYear}</CardTitle>
              <CardDescription className="text-gray-400">
                Administra los detalles del evento cicloturístico {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Toggle Inscripciones - Arriba de todo, bien visible */}
              <div className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border gap-3 ${inscripcionesAbiertas ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {!inscripcionesAbiertas && <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                  <div>
                    <p className="text-white font-medium">
                      {inscripcionesAbiertas ? `Inscripciones ${selectedYear} Abiertas` : `Inscripciones ${selectedYear} Cerradas`}
                    </p>
                    <p className="text-sm text-gray-400">
                      {inscripcionesAbiertas
                        ? "Los participantes pueden inscribirse al evento"
                        : "El formulario de inscripción está deshabilitado"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={inscripcionesAbiertas}
                  onCheckedChange={handleToggleInscripciones}
                />
              </div>

              {/* Información Básica */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Información Básica</h3>

                <div>
                  <Label className="text-gray-300">Nombre del Evento *</Label>
                  <Input
                    value={nombreEvento}
                    onChange={(e) => setNombreEvento(e.target.value)}
                    placeholder={`Cicloturismo Grand Team Bike ${selectedYear}`}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Fecha del Evento *</Label>
                    <Input
                      type="date"
                      value={fechaEvento}
                      onChange={(e) => setFechaEvento(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Hora de Largada</Label>
                    <Input
                      value={horaLargada}
                      onChange={(e) => setHoraLargada(e.target.value)}
                      placeholder="08:00 AM"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Ubicación *</Label>
                  <Input
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    placeholder="Concepción del Uruguay, Entre Ríos"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Punto de Encuentro</Label>
                  <Textarea
                    value={puntoEncuentro}
                    onChange={(e) => setPuntoEncuentro(e.target.value)}
                    placeholder="Plaza Ramírez, frente a la municipalidad"
                    className="bg-gray-700 border-gray-600 text-white"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Recorrido</Label>
                    <Input
                      value={recorrido}
                      onChange={(e) => setRecorrido(e.target.value)}
                      placeholder="50 km"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Categoría</Label>
                    <Input
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      placeholder="Medio/Avanzado"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Inscripción */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Inscripción</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Costo Inscripción (ARS)</Label>
                    <Input
                      type="number"
                      value={costoInscripcion}
                      onChange={(e) => setCostoInscripcion(e.target.value)}
                      placeholder="40000"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Cupo Máximo</Label>
                    <Input
                      type="number"
                      value={cupoMaximo}
                      onChange={(e) => setCupoMaximo(e.target.value)}
                      placeholder="300"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Qué Incluye (separado por comas)</Label>
                  <Input
                    value={queIncluye}
                    onChange={(e) => setQueIncluye(e.target.value)}
                    placeholder="Hidratación, Frutas, Medalla de finisher"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Alias para Transferencias</Label>
                  <Input
                    value={aliasTransferencia}
                    onChange={(e) => setAliasTransferencia(e.target.value)}
                    placeholder="grandteam.bike"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Contacto</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Teléfono de Contacto</Label>
                    <Input
                      value={telefonoContacto}
                      onChange={(e) => setTelefonoContacto(e.target.value)}
                      placeholder="+54 9 3442 123456"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Email de Contacto</Label>
                    <Input
                      value={emailContacto}
                      onChange={(e) => setEmailContacto(e.target.value)}
                      placeholder="contacto@grandteambike.com"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Datos de Transferencia</h3>

                <div>
                  <Label className="text-gray-300">Información Completa de Transferencia</Label>
                  <Textarea
                    value={datosTransferencia}
                    onChange={(e) => setDatosTransferencia(e.target.value)}
                    placeholder="Banco, titular, CBU, alias, etc."
                    className="bg-gray-700 border-gray-600 text-white"
                    rows={4}
                  />
                </div>
              </div>

              {/* Redes Sociales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Redes Sociales</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Instagram</Label>
                    <Input
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@grandteambike"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Facebook</Label>
                    <Input
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                      placeholder="GrandTeamBikeCdelU"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios {selectedYear}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

//configuraciones

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useFirebaseContext } from "@/components/providers/FirebaseProvider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Settings, Save } from "lucide-react"

export default function ConfiguracionesPage() {
  const router = useRouter()
  const { user, userRole, loading } = useFirebaseContext()
  const { toast } = useToast()

  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)

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

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
      } else if (userRole !== "admin") {
        router.push("/")
      } else {
        setChecking(false)
        loadConfig()
      }
    }
  }, [user, userRole, loading, router])

  const loadConfig = async () => {
    try {
      const docRef = doc(db, "eventos", "2026")
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
      }
    } catch (error) {
      console.error("[v0] Error cargando configuración:", error)
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
        año: 2026,
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
        updatedAt: serverTimestamp(),
      }

      await setDoc(doc(db, "eventos", "2026"), eventData, { merge: true })

      toast({
        title: "Configuración guardada",
        description: "Los cambios se han guardado exitosamente",
      })
    } catch (error) {
      console.error("[v0] Error guardando configuración:", error)
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-yellow-400 text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 p-6 pt-28">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-10 h-10 text-yellow-400" />
          <h1 className="text-4xl font-bold text-yellow-400">Configuraciones</h1>
        </div>

        <Card className="bg-gray-800/50 border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-yellow-400">Configuración del Evento</CardTitle>
            <CardDescription className="text-gray-400">
              Administra los detalles del evento cicloturístico 2026
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Información Básica</h3>

              <div>
                <Label className="text-gray-300">Nombre del Evento *</Label>
                <Input
                  value={nombreEvento}
                  onChange={(e) => setNombreEvento(e.target.value)}
                  placeholder="Cicloturismo Grand Team Bike 2026"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                  placeholder="Hidratación, Frutas, Medallade finisher"
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

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
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
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

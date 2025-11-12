"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, onSnapshot, orderBy, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CheckCircle, LogOut, Download, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { signOut } from "firebase/auth"
import ParticipantsList from "@/components/grand-team/ParticipantsList"
import EventSummary from "@/components/grand-team/EventSummary"
import CategoryBreakdown from "@/components/grand-team/CategoryBreakdown"

export default function GrandTeamDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/grand-team")
      } else {
        setUser(user)
      }
    })
    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    if (!user) return

    // Get only approved inscriptions
    const q = query(
      collection(db, "inscripciones"),
      where("estado", "==", "aprobado"),
      orderBy("fechaInscripcion", "desc"),
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setInscripciones(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/grand-team")
  }

  const handleExport = () => {
    // Export participants list to CSV
    const headers = ["Nombre", "Cédula", "Email", "Teléfono", "Categoría", "Talla", "Tipo Sangre"]
    const csvData = inscripciones.map((i) => [
      `${i.nombres} ${i.apellidos}`,
      i.cedula,
      i.email,
      i.telefono,
      i.categoria,
      //i.tallaCamiseta,
      i.tipoSangre,
    ])

    const csv = [headers, ...csvData].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `participantes-grand-team-${Date.now()}.csv`
    a.click()
  }

  const filteredInscripciones = inscripciones.filter((i) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      i.nombres?.toLowerCase().includes(searchLower) ||
      i.apellidos?.toLowerCase().includes(searchLower) ||
      i.email?.toLowerCase().includes(searchLower) ||
      i.cedula?.toLowerCase().includes(searchLower)
    )
  })

  const categoryCounts = {
    libre: inscripciones.filter((i) => i.categoria === "libre").length,
    competitivo: inscripciones.filter((i) => i.categoria === "competitivo").length,
    familiar: inscripciones.filter((i) => i.categoria === "familiar").length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center">
        <div className="text-yellow-400 text-lg">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      {/* Header */}
      <div className="border-b border-yellow-400/20 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white">
                Panel <span className="gradient-text">Grand Team</span>
              </h1>
              <p className="text-sm text-gray-400">Gestión del evento cicloturístico</p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white bg-transparent"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-zinc-900 to-black border-yellow-400/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Participantes Confirmados</CardTitle>
              <Users className="w-4 h-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-white">{inscripciones.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 to-black border-yellow-400/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Categoría Libre</CardTitle>
              <CheckCircle className="w-4 h-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-blue-400">{categoryCounts.libre}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 to-black border-yellow-400/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Competitivo</CardTitle>
              <CheckCircle className="w-4 h-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-red-400">{categoryCounts.competitivo}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 to-black border-yellow-400/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Familiar</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-green-400">{categoryCounts.familiar}</div>
            </CardContent>
          </Card>
        </div>

        {/* Event Info */}
        <EventSummary />

        {/* Main Content */}
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm mt-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-white">Lista de Participantes</CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Buscar participante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-zinc-900 border-yellow-400/30 text-white pl-10"
                  />
                </div>
                <Button
                  onClick={handleExport}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:scale-105 transition-transform"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ParticipantsList participants={filteredInscripciones} />
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <CategoryBreakdown categoryCounts={categoryCounts} totalParticipants={inscripciones.length} />
      </div>
    </div>
  )
}

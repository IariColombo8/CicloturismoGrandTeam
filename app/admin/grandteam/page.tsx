"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useFirebaseContext } from "@/components/providers/FirebaseProvider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Users, Cake, Heart, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GrandTeamPage() {
  const router = useRouter()
  const { user, userRole, loading } = useFirebaseContext()
  const [checking, setChecking] = useState(true)
  const [miembros, setMiembros] = useState<any[]>([])
  const [cumpleañeros, setCumpleañeros] = useState<any[]>([])

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
      } else if (userRole !== "admin" && userRole !== "grandteam") {
        router.push("/")
      } else {
        setChecking(false)
        loadMiembros()
      }
    }
  }, [user, userRole, loading, router])

  const loadMiembros = async () => {
    try {
      // Cargar miembros de Grand Team
      const q = query(collection(db, "administrador"), where("role", "in", ["admin", "grandteam"]))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setMiembros(data)

      // Filtrar cumpleañeros del mes actual
      const mesActual = new Date().getMonth() + 1
      const cumples = data.filter((m: any) => {
        if (m.fechaNacimiento) {
          const fecha = new Date(m.fechaNacimiento)
          return fecha.getMonth() + 1 === mesActual
        }
        return false
      })
      setCumpleañeros(cumples)
    } catch (error) {
      console.error("[v0] Error cargando miembros:", error)
    }
  }

  const exportarDatosSalud = () => {
    const csvContent = [
      ["Nombre", "Email", "Grupo Sanguíneo", "Alergias", "Medicamentos", "Observaciones"],
      ...miembros
        .filter((m) => m.datosSalud)
        .map((m) => [
          m.nombreCompleto || m.email,
          m.email,
          m.grupoSanguineo || "N/A",
          m.datosSalud?.alergias || "Ninguna",
          m.datosSalud?.medicamentos || "Ninguno",
          m.datosSalud?.condicionesCronicas || "Ninguna",
        ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "datos_salud_grandteam.csv"
    link.click()
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-10 h-10 text-yellow-400" />
          <h1 className="text-4xl font-bold text-yellow-400">Panel Grand Team</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800/50 border-yellow-400/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Miembros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{miembros.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-pink-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Cake className="w-4 h-4" />
                Cumpleaños Este Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-pink-500">{cumpleañeros.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-red-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Con Datos de Salud
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{miembros.filter((m) => m.datosSalud).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card className="bg-gray-800/50 border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-yellow-400">Información de Miembros</CardTitle>
            <CardDescription className="text-gray-400">Datos exclusivos del equipo Grand Team</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="cumpleanos">
              <TabsList className="bg-gray-700">
                <TabsTrigger value="cumpleanos">Cumpleaños ({cumpleañeros.length})</TabsTrigger>
                <TabsTrigger value="salud">Datos de Salud</TabsTrigger>
                <TabsTrigger value="miembros">Todos los Miembros ({miembros.length})</TabsTrigger>
              </TabsList>

              {/* Cumpleaños */}
              <TabsContent value="cumpleanos" className="mt-6">
                {cumpleañeros.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Cake className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay cumpleaños este mes</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cumpleañeros.map((miembro) => (
                      <Card
                        key={miembro.id}
                        className="bg-gradient-to-br from-pink-900/20 to-purple-900/20 border-pink-500/30"
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center">
                              <Cake className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white">{miembro.nombreCompleto || miembro.email}</h3>
                              <p className="text-sm text-gray-400">
                                {miembro.fechaNacimiento &&
                                  new Date(miembro.fechaNacimiento).toLocaleDateString("es-AR", {
                                    day: "numeric",
                                    month: "long",
                                  })}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Datos de Salud */}
              <TabsContent value="salud" className="mt-6">
                <div className="flex justify-end mb-4">
                  <Button
                    onClick={exportarDatosSalud}
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                </div>

                <div className="rounded-lg border border-gray-700 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-700">
                      <TableRow>
                        <TableHead className="text-yellow-400">Nombre</TableHead>
                        <TableHead className="text-yellow-400">Grupo Sanguíneo</TableHead>
                        <TableHead className="text-yellow-400">Alergias</TableHead>
                        <TableHead className="text-yellow-400">Medicamentos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {miembros
                        .filter((m) => m.datosSalud || m.grupoSanguineo)
                        .map((miembro) => (
                          <TableRow key={miembro.id} className="border-gray-700">
                            <TableCell className="text-white font-medium">
                              {miembro.nombreCompleto || miembro.email}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-red-500/20 text-red-400">{miembro.grupoSanguineo || "N/A"}</Badge>
                            </TableCell>
                            <TableCell className="text-gray-400 text-sm">
                              {miembro.datosSalud?.alergias || "Ninguna"}
                            </TableCell>
                            <TableCell className="text-gray-400 text-sm">
                              {miembro.datosSalud?.medicamentos || "Ninguno"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Todos los Miembros */}
              <TabsContent value="miembros" className="mt-6">
                <div className="rounded-lg border border-gray-700 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-700">
                      <TableRow>
                        <TableHead className="text-yellow-400">Nombre</TableHead>
                        <TableHead className="text-yellow-400">Email</TableHead>
                        <TableHead className="text-yellow-400">Teléfono</TableHead>
                        <TableHead className="text-yellow-400">Localidad</TableHead>
                        <TableHead className="text-yellow-400">Rol</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {miembros.map((miembro) => (
                        <TableRow key={miembro.id} className="border-gray-700">
                          <TableCell className="text-white font-medium">
                            {miembro.nombreCompleto || miembro.email.split("@")[0]}
                          </TableCell>
                          <TableCell className="text-gray-400">{miembro.email}</TableCell>
                          <TableCell className="text-gray-400">{miembro.telefono || "N/A"}</TableCell>
                          <TableCell className="text-gray-400">{miembro.localidad || "N/A"}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                miembro.role === "admin"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-blue-500/20 text-blue-400"
                              }
                            >
                              {miembro.role}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

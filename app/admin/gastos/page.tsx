"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { useFirebaseContext } from "@/components/providers/FirebaseProvider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { DollarSign, Plus, CheckCircle, XCircle, Eye, Trash2, TrendingDown } from "lucide-react"

export default function GastosPage() {
  const router = useRouter()
  const { user, userRole, loading } = useFirebaseContext()
  const { toast } = useToast()

  const [gastos, setGastos] = useState<any[]>([])
  const [checking, setChecking] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedGasto, setSelectedGasto] = useState<any>(null)

  // Form state
  const [descripcion, setDescripcion] = useState("")
  const [monto, setMonto] = useState("")
  const [categoria, setCategoria] = useState("equipamiento")
  const [comprobante, setComprobante] = useState<File | null>(null)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login")
      } else if (userRole !== "admin" && userRole !== "grandteam") {
        router.push("/")
      } else {
        setChecking(false)
      }
    }
  }, [user, userRole, loading, router])

  useEffect(() => {
    if (!user || checking) return

    const q = query(collection(db, "gastos_2026"), orderBy("fecha", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setGastos(data)
    })

    return () => unsubscribe()
  }, [user, checking])

  const handleCreateGasto = async () => {
    if (!descripcion || !monto) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    try {
      let comprobanteUrl = null

      // Subir comprobante si existe
      if (comprobante) {
        const storageRef = ref(storage, `comprobantes/gastos/${Date.now()}_${comprobante.name}`)
        await uploadBytes(storageRef, comprobante)
        comprobanteUrl = await getDownloadURL(storageRef)
      }

      const gastoData = {
        eventoId: "2026",
        descripcion,
        monto: Number.parseFloat(monto),
        categoria,
        fecha: serverTimestamp(),
        comprobante: comprobanteUrl,
        estado: userRole === "admin" ? "aprobado" : "pendiente",
        creadoPor: user?.email || "",
        rolCreador: userRole,
        aprobadoPor: userRole === "admin" ? user?.email : null,
        fechaAprobacion: userRole === "admin" ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await addDoc(collection(db, "gastos_2026"), gastoData)

      toast({
        title: userRole === "admin" ? "Gasto creado" : "Propuesta enviada",
        description:
          userRole === "admin"
            ? "El gasto ha sido creado y aprobado automáticamente"
            : "Tu propuesta será revisada por un administrador",
      })

      // Reset form
      setDescripcion("")
      setMonto("")
      setCategoria("equipamiento")
      setComprobante(null)
      setIsModalOpen(false)
    } catch (error) {
      console.error("[v0] Error creando gasto:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el gasto",
        variant: "destructive",
      })
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, "gastos_2026", id), {
        estado: "aprobado",
        aprobadoPor: user?.email,
        fechaAprobacion: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast({
        title: "Gasto aprobado",
        description: "El gasto ha sido aprobado exitosamente",
      })
      setIsDetailModalOpen(false)
    } catch (error) {
      console.error("[v0] Error aprobando gasto:", error)
      toast({
        title: "Error",
        description: "No se pudo aprobar el gasto",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (id: string, motivo: string) => {
    try {
      await updateDoc(doc(db, "gastos_2026", id), {
        estado: "rechazado",
        motivoRechazo: motivo,
        aprobadoPor: user?.email,
        fechaAprobacion: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast({
        title: "Gasto rechazado",
        description: "El gasto ha sido rechazado",
      })
      setIsDetailModalOpen(false)
    } catch (error) {
      console.error("[v0] Error rechazando gasto:", error)
      toast({
        title: "Error",
        description: "No se pudo rechazar el gasto",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este gasto?")) return

    try {
      await deleteDoc(doc(db, "gastos_2026", id))
      toast({
        title: "Gasto eliminado",
        description: "El gasto ha sido eliminado exitosamente",
      })
      setIsDetailModalOpen(false)
    } catch (error) {
      console.error("[v0] Error eliminando gasto:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el gasto",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return <Badge className="bg-yellow-400/20 text-yellow-400">Pendiente</Badge>
      case "aprobado":
        return <Badge className="bg-green-500/20 text-green-500">Aprobado</Badge>
      case "rechazado":
        return <Badge className="bg-red-500/20 text-red-500">Rechazado</Badge>
      default:
        return <Badge>{estado}</Badge>
    }
  }

  const pendientes = gastos.filter((g) => g.estado === "pendiente")
  const aprobados = gastos.filter((g) => g.estado === "aprobado")
  const rechazados = gastos.filter((g) => g.estado === "rechazado")

  const totalAprobados = aprobados.reduce((sum, g) => sum + (g.monto || 0), 0)

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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <DollarSign className="w-10 h-10 text-yellow-400" />
            <h1 className="text-4xl font-bold text-yellow-400">Gastos</h1>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {userRole === "admin" ? "Agregar Gasto" : "Proponer Gasto"}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800/50 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Total Gastos Aprobados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">${totalAprobados.toLocaleString("es-AR")}</div>
              <p className="text-xs text-gray-500 mt-1">{aprobados.length} gastos</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-yellow-400/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-400">Pendientes de Aprobación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">{pendientes.length}</div>
              <p className="text-xs text-gray-500 mt-1">Requieren revisión</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-red-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-400">Rechazados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{rechazados.length}</div>
              <p className="text-xs text-gray-500 mt-1">No aprobados</p>
            </CardContent>
          </Card>
        </div>

        {/* Gastos Table */}
        <Card className="bg-gray-800/50 border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-yellow-400">Gestión de Gastos</CardTitle>
            <CardDescription className="text-gray-400">Administra los gastos del evento</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="todos">
              <TabsList className="bg-gray-700">
                <TabsTrigger value="todos">Todos ({gastos.length})</TabsTrigger>
                <TabsTrigger value="pendientes">Pendientes ({pendientes.length})</TabsTrigger>
                <TabsTrigger value="aprobados">Aprobados ({aprobados.length})</TabsTrigger>
                <TabsTrigger value="rechazados">Rechazados ({rechazados.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="todos">
                <GastosTable
                  gastos={gastos}
                  onView={(g) => {
                    setSelectedGasto(g)
                    setIsDetailModalOpen(true)
                  }}
                  getStatusBadge={getStatusBadge}
                />
              </TabsContent>
              <TabsContent value="pendientes">
                <GastosTable
                  gastos={pendientes}
                  onView={(g) => {
                    setSelectedGasto(g)
                    setIsDetailModalOpen(true)
                  }}
                  getStatusBadge={getStatusBadge}
                />
              </TabsContent>
              <TabsContent value="aprobados">
                <GastosTable
                  gastos={aprobados}
                  onView={(g) => {
                    setSelectedGasto(g)
                    setIsDetailModalOpen(true)
                  }}
                  getStatusBadge={getStatusBadge}
                />
              </TabsContent>
              <TabsContent value="rechazados">
                <GastosTable
                  gastos={rechazados}
                  onView={(g) => {
                    setSelectedGasto(g)
                    setIsDetailModalOpen(true)
                  }}
                  getStatusBadge={getStatusBadge}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Create/Propose Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-gray-800 border-yellow-400/20">
            <DialogHeader>
              <DialogTitle className="text-yellow-400">
                {userRole === "admin" ? "Agregar Nuevo Gasto" : "Proponer Gasto"}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {userRole === "admin"
                  ? "El gasto será aprobado automáticamente"
                  : "Tu propuesta será revisada por un administrador"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Descripción *</Label>
                <Input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Compra de hidratación"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Monto (ARS) *</Label>
                <Input
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="40000"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300">Categoría *</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="equipamiento">Equipamiento</SelectItem>
                    <SelectItem value="premios">Premios</SelectItem>
                    <SelectItem value="logística">Logística</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="alimentación">Alimentación</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Comprobante (opcional)</Label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setComprobante(e.target.files?.[0] || null)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateGasto} className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black">
                {userRole === "admin" ? "Crear Gasto" : "Enviar Propuesta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Modal */}
        {selectedGasto && (
          <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
            <DialogContent className="bg-gray-800 border-yellow-400/20 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-yellow-400">Detalle del Gasto</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Descripción</Label>
                    <p className="text-white font-medium">{selectedGasto.descripcion}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Monto</Label>
                    <p className="text-white font-bold text-xl">${selectedGasto.monto?.toLocaleString("es-AR")}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Categoría</Label>
                    <p className="text-white capitalize">{selectedGasto.categoria}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Estado</Label>
                    {getStatusBadge(selectedGasto.estado)}
                  </div>
                  <div>
                    <Label className="text-gray-400">Creado por</Label>
                    <p className="text-white text-sm">{selectedGasto.creadoPor}</p>
                    <p className="text-gray-500 text-xs capitalize">({selectedGasto.rolCreador})</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Fecha</Label>
                    <p className="text-white text-sm">
                      {selectedGasto.fecha?.seconds
                        ? new Date(selectedGasto.fecha.seconds * 1000).toLocaleDateString("es-AR")
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {selectedGasto.comprobante && (
                  <div>
                    <Label className="text-gray-400">Comprobante</Label>
                    <Button
                      variant="link"
                      className="text-yellow-400"
                      onClick={() => window.open(selectedGasto.comprobante, "_blank")}
                    >
                      Ver comprobante
                    </Button>
                  </div>
                )}

                {selectedGasto.estado === "rechazado" && selectedGasto.motivoRechazo && (
                  <div>
                    <Label className="text-gray-400">Motivo de Rechazo</Label>
                    <p className="text-red-400">{selectedGasto.motivoRechazo}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-2">
                {userRole === "admin" && selectedGasto.estado === "pendiente" && (
                  <>
                    <Button onClick={() => handleApprove(selectedGasto.id)} className="bg-green-500 hover:bg-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar
                    </Button>
                    <Button
                      onClick={() => {
                        const motivo = prompt("Motivo del rechazo (opcional):")
                        if (motivo !== null) handleReject(selectedGasto.id, motivo)
                      }}
                      variant="destructive"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rechazar
                    </Button>
                  </>
                )}

                {userRole === "admin" && (
                  <Button
                    onClick={() => handleDelete(selectedGasto.id)}
                    variant="outline"
                    className="border-red-500 text-red-500"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

function GastosTable({ gastos, onView, getStatusBadge }: any) {
  if (gastos.length === 0) {
    return <div className="text-center py-8 text-gray-400">No hay gastos en esta categoría</div>
  }

  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden mt-4">
      <Table>
        <TableHeader className="bg-gray-700">
          <TableRow>
            <TableHead className="text-yellow-400">Descripción</TableHead>
            <TableHead className="text-yellow-400">Categoría</TableHead>
            <TableHead className="text-yellow-400">Monto</TableHead>
            <TableHead className="text-yellow-400">Creado por</TableHead>
            <TableHead className="text-yellow-400">Estado</TableHead>
            <TableHead className="text-yellow-400 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gastos.map((gasto: any) => (
            <TableRow key={gasto.id} className="border-gray-700">
              <TableCell className="text-white font-medium">{gasto.descripcion}</TableCell>
              <TableCell className="text-gray-400 capitalize">{gasto.categoria}</TableCell>
              <TableCell className="text-white font-bold">${gasto.monto?.toLocaleString("es-AR")}</TableCell>
              <TableCell className="text-gray-400 text-sm">
                {gasto.creadoPor}
                <span className="block text-xs text-gray-500 capitalize">({gasto.rolCreador})</span>
              </TableCell>
              <TableCell>{getStatusBadge(gasto.estado)}</TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-500/50 text-blue-400 bg-transparent"
                  onClick={() => onView(gasto)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
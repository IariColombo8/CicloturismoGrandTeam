"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { DollarSign, Plus, TrendingDown, TrendingUp, Scale, Clock } from "lucide-react"

import { MovimientosTable } from "./MovimientosTable"
import { GastosTable } from "./GastosTable"
import { IngresosTable } from "./IngresosTable"
import { PagosTable } from "./PagosTable"
import { GastoFormModal } from "./GastoFormModal"
import { IngresoFormModal } from "./IngresoFormModal"
import { GastoDetalleModal } from "./GastoDetalleModal"
import { useFinanzas } from "./useFinanzas"
import { formatARS, mensajeError, type Gasto } from "./tipos"

export default function GastosPage() {
  const { user, userRole, eventSettings } = useSupabaseContext()
  const { toast } = useToast()

  const precioBase = eventSettings?.precio ?? 0
  const esAdmin = userRole === "admin"

  const { gastos, ingresos, inscripciones, cargando, error, recargar, resumen, movimientos } =
    useFinanzas(precioBase, Boolean(user))

  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false)
  const [isIngresoModalOpen, setIsIngresoModalOpen] = useState(false)
  const [selectedGasto, setSelectedGasto] = useState<Gasto | null>(null)

  const pendientes = gastos.filter((g) => g.estado === "pendiente")
  const aprobados = gastos.filter((g) => g.estado === "aprobado")
  const rechazados = gastos.filter((g) => g.estado === "rechazado")
  const confirmadas = inscripciones.filter((i) => i.estado === "confirmada")

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

  const handleEliminarIngreso = async (id: string) => {
    try {
      const { error: errorDelete } = await supabase.from("ingresos").delete().eq("id", id)
      if (errorDelete) throw errorDelete
      toast({ title: "Ingreso eliminado" })
      await recargar()
    } catch (err) {
      console.error("Error eliminando ingreso:", mensajeError(err), err)
      toast({ title: "Error", description: mensajeError(err), variant: "destructive" })
    }
  }

  const handleMarcarCobrado = async (id: string) => {
    try {
      const { error: errorUpdate } = await supabase
        .from("ingresos")
        .update({ estado: "cobrado" })
        .eq("id", id)
      if (errorUpdate) throw errorUpdate
      toast({ title: "Ingreso cobrado", description: "Se sumó al total de ingresos" })
      await recargar()
    } catch (err) {
      console.error("Error actualizando ingreso:", mensajeError(err), err)
      toast({ title: "Error", description: mensajeError(err), variant: "destructive" })
    }
  }

  const handleGuardarPago = async (id: string, montoPagado: number | null) => {
    try {
      const { error: errorUpdate } = await supabase
        .from("participantes")
        .update({ monto_pagado: montoPagado })
        .eq("id", id)
      if (errorUpdate) throw errorUpdate
      toast({
        title: "Pago actualizado",
        description:
          montoPagado === null ? "Se restableció al precio base del evento" : `Registrado ${formatARS(montoPagado)}`,
      })
      await recargar()
    } catch (err) {
      console.error("Error actualizando pago:", mensajeError(err), err)
      toast({ title: "Error", description: mensajeError(err), variant: "destructive" })
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-yellow-400 text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 px-3 py-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400" />
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-yellow-400">Finanzas</h1>
              <p className="text-xs text-gray-500">
                Precio base por inscripto: {formatARS(precioBase)} · {resumen.confirmados} confirmados de{" "}
                {resumen.inscriptosTotales} inscriptos
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setIsIngresoModalOpen(true)}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Registrar Ingreso
            </Button>
            <Button
              onClick={() => setIsGastoModalOpen(true)}
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {esAdmin ? "Agregar Gasto" : "Proponer Gasto"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gray-800/50 border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{formatARS(resumen.totalIngresos)}</div>
              <p className="text-xs text-gray-500 mt-1">
                Inscripciones {formatARS(resumen.ingresoInscripciones)} · Otros {formatARS(resumen.ingresosCobrados)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Proyectado: {formatARS(resumen.totalIngresosProyectado)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-red-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Gastos Aprobados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400">{formatARS(resumen.gastosAprobados)}</div>
              <p className="text-xs text-gray-500 mt-1">{aprobados.length} gastos · sobre confirmados</p>
              <p className="text-xs text-gray-600 mt-1">
                Con todos los inscriptos: {formatARS(resumen.gastosAprobadosProyectado)}
              </p>
            </CardContent>
          </Card>

          <Card
            className={`bg-gray-800/50 ${resumen.balance >= 0 ? "border-yellow-400/20" : "border-red-500/40"}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-3xl font-bold ${resumen.balance >= 0 ? "text-yellow-400" : "text-red-500"}`}
              >
                {resumen.balance < 0 && "-"}
                {formatARS(Math.abs(resumen.balance))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {resumen.balance >= 0 ? "A favor" : "En déficit"} · ingresos menos gastos
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Proyectado: {resumen.balanceProyectado < 0 ? "-" : ""}
                {formatARS(Math.abs(resumen.balanceProyectado))}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Sin cerrar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                +{formatARS(resumen.ingresosPorCobrar)}
              </div>
              <p className="text-xs text-gray-500">Por cobrar</p>
              <div className="text-2xl font-bold text-orange-400 mt-2">
                -{formatARS(resumen.gastosPendientes)}
              </div>
              <p className="text-xs text-gray-500">
                {pendientes.length} gastos esperando aprobación
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Contenido */}
        <Card className="bg-gray-800/50 border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-yellow-400">Movimientos del evento</CardTitle>
            <CardDescription className="text-gray-400">
              Gastos, ingresos y pagos de inscripción
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="todo">
              <TabsList className="bg-gray-700 w-full flex flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="todo" className="flex-1 min-w-0 text-xs sm:text-sm">
                  Todo ({movimientos.length})
                </TabsTrigger>
                <TabsTrigger value="gastos" className="flex-1 min-w-0 text-xs sm:text-sm">
                  Gastos ({gastos.length})
                </TabsTrigger>
                <TabsTrigger value="ingresos" className="flex-1 min-w-0 text-xs sm:text-sm">
                  Ingresos ({ingresos.length})
                </TabsTrigger>
                <TabsTrigger value="pagos" className="flex-1 min-w-0 text-xs sm:text-sm">
                  Pagos ({confirmadas.length})
                </TabsTrigger>
                <TabsTrigger value="rechazados" className="flex-1 min-w-0 text-xs sm:text-sm">
                  Rech. ({rechazados.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="todo">
                <MovimientosTable movimientos={movimientos} onVerGasto={setSelectedGasto} />
              </TabsContent>

              <TabsContent value="gastos">
                <GastosTable
                  gastos={gastos}
                  confirmados={resumen.confirmados}
                  onView={setSelectedGasto}
                  getStatusBadge={getStatusBadge}
                />
              </TabsContent>

              <TabsContent value="ingresos">
                <IngresosTable
                  ingresos={ingresos}
                  puedeEliminar={esAdmin}
                  onEliminar={handleEliminarIngreso}
                  onMarcarCobrado={handleMarcarCobrado}
                />
              </TabsContent>

              <TabsContent value="pagos">
                {resumen.pagosDiferentes.length > 0 && (
                  <div className="mt-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-300">
                    {resumen.pagosDiferentes.length} inscripto(s) pagaron distinto al precio base de{" "}
                    {formatARS(precioBase)}. Diferencia total: {resumen.diferenciaPagos < 0 ? "-" : "+"}
                    {formatARS(Math.abs(resumen.diferenciaPagos))}
                  </div>
                )}
                <PagosTable
                  inscripciones={confirmadas}
                  precioBase={precioBase}
                  puedeEditar={esAdmin}
                  onGuardar={handleGuardarPago}
                  mensajeVacio="Todavía no hay inscripciones confirmadas"
                />
              </TabsContent>

              <TabsContent value="rechazados">
                <GastosTable
                  gastos={rechazados}
                  confirmados={resumen.confirmados}
                  onView={setSelectedGasto}
                  getStatusBadge={getStatusBadge}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <GastoFormModal
          open={isGastoModalOpen}
          onOpenChange={setIsGastoModalOpen}
          esAdmin={esAdmin}
          confirmados={resumen.confirmados}
          userEmail={user?.email || ""}
          userRole={userRole || ""}
          onGuardado={recargar}
        />

        <IngresoFormModal
          open={isIngresoModalOpen}
          onOpenChange={setIsIngresoModalOpen}
          userEmail={user?.email || ""}
          userRole={userRole || ""}
          onGuardado={recargar}
        />

        <GastoDetalleModal
          gasto={selectedGasto}
          onClose={() => setSelectedGasto(null)}
          esAdmin={esAdmin}
          confirmados={resumen.confirmados}
          userEmail={user?.email || ""}
          getStatusBadge={getStatusBadge}
          onCambio={recargar}
        />
      </div>
    </div>
  )
}

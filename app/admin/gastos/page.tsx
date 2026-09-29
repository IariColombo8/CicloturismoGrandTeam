"use client"

import { useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { DollarSign, Plus, TrendingDown, TrendingUp, Scale, Clock, Landmark, Filter } from "lucide-react"

import { EstimadorInscriptos } from "./EstimadorInscriptos"
import { CalculadoraCaja } from "./CalculadoraCaja"
import { MovimientosTable, type FiltroEstado, type FiltroTipo } from "./MovimientosTable"
import { GastosTable } from "./GastosTable"
import { IngresosTable } from "./IngresosTable"
import { PagosTable } from "./PagosTable"
import { GastoFormModal } from "./GastoFormModal"
import { IngresoFormModal } from "./IngresoFormModal"
import { GastoDetalleModal } from "./GastoDetalleModal"
import { useFinanzas } from "./useFinanzas"
import { formatARS, mensajeError, type Gasto } from "./tipos"

type Vista = "todo" | "gastos" | "ingresos" | "pagos" | "rechazados"

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
  const [vista, setVista] = useState<Vista>("todo")
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos")
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos")

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((mov) => {
      const pasaTipo = filtroTipo === "todos" || mov.tipo === filtroTipo
      const pasaEstado = filtroEstado === "todos" || mov.estado === filtroEstado
      return pasaTipo && pasaEstado
    })
  }, [movimientos, filtroTipo, filtroEstado])

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

  const handleTogglePagado = async (gasto: Gasto) => {
    try {
      const nuevoPagado = !gasto.pagado
      const { error: errorUpdate } = await supabase
        .from("gastos")
        .update({ pagado: nuevoPagado })
        .eq("id", gasto.id)
      if (errorUpdate) throw errorUpdate
      toast({ title: nuevoPagado ? "Marcado como pagado" : "Marcado: aún no se pagó" })
      await recargar()
    } catch (err) {
      console.error("Error actualizando pago del gasto:", mensajeError(err), err)
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
        <div className="mb-6 sm:mb-8 space-y-2 sm:space-y-3">
          <div className="grid grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-6">
            <Card className="bg-gray-800/50 border-emerald-400/40 xl:col-span-1 py-2 sm:py-4 gap-1.5 sm:gap-2">
              <CardHeader className="pb-0 px-2.5 sm:px-4">
                <CardTitle className="text-[10px] sm:text-sm font-medium text-gray-400 flex items-center gap-1 sm:gap-2">
                  <Landmark className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">Plata en el BNA</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2.5 sm:px-4">
                <div
                  className={`text-sm sm:text-3xl font-bold truncate ${resumen.plataEnBanco >= 0 ? "text-emerald-400" : "text-red-500"}`}
                >
                  {resumen.plataEnBanco < 0 && "-"}
                  {formatARS(Math.abs(resumen.plataEnBanco))}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1 hidden sm:block">
                  Inscripciones + ingresos cobrados − gastos ya pagados
                </p>
                {resumen.gastosAprobadosSinPagar > 0 && (
                  <p className="text-[9px] sm:text-xs text-orange-400 mt-1 truncate">
                    <span className="hidden sm:inline">Todavía falta pagar </span>
                    {formatARS(resumen.gastosAprobadosSinPagar)}
                    <span className="hidden sm:inline"> de gastos aprobados</span>
                    <span className="sm:hidden"> sin pagar</span>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-green-500/20 xl:col-span-1 py-2 sm:py-4 gap-1.5 sm:gap-2">
              <CardHeader className="pb-0 px-2.5 sm:px-4">
                <CardTitle className="text-[10px] sm:text-sm font-medium text-gray-400 flex items-center gap-1 sm:gap-2">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">Ingresos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2.5 sm:px-4">
                <div className="text-sm sm:text-3xl font-bold text-green-500 truncate">
                  {formatARS(resumen.totalIngresos)}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1 hidden sm:block">
                  Inscripciones {formatARS(resumen.ingresoInscripciones)} · Otros {formatARS(resumen.ingresosCobrados)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-600 mt-1 hidden sm:block">
                  Proyectado: {formatARS(resumen.totalIngresosProyectado)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-blue-500/20 xl:col-span-1 py-2 sm:py-4 gap-1.5 sm:gap-2">
              <CardHeader className="pb-0 px-2.5 sm:px-4">
                <CardTitle className="text-[10px] sm:text-sm font-medium text-gray-400 flex items-center gap-1 sm:gap-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">Sin cerrar</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2.5 sm:px-4">
                <div className="text-xs sm:text-2xl font-bold text-blue-400 truncate">
                  +{formatARS(resumen.ingresosPorCobrar)}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Por cobrar</p>
                <div className="text-xs sm:text-2xl font-bold text-orange-400 mt-1 sm:mt-2 truncate">
                  -{formatARS(resumen.gastosPendientes)}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                  {pendientes.length} gastos esperando aprobación
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-red-500/20 hidden xl:block py-4 gap-2">
              <CardHeader className="pb-0 px-4">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 shrink-0" />
                  <span className="truncate">Gastos Aprobados</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <div className="text-3xl font-bold text-red-400">{formatARS(resumen.gastosAprobados)}</div>
                <p className="text-xs text-gray-500 mt-1">{aprobados.length} gastos · sobre confirmados</p>
                <p className="text-xs text-gray-600 mt-1">
                  Con todos los inscriptos: {formatARS(resumen.gastosAprobadosProyectado)}
                </p>
              </CardContent>
            </Card>

            <Card
              className={`bg-gray-800/50 hidden xl:block py-4 gap-2 ${resumen.balance >= 0 ? "border-yellow-400/20" : "border-red-500/40"}`}
            >
              <CardHeader className="pb-0 px-4">
                <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Scale className="w-4 h-4 shrink-0" />
                  <span className="truncate">Balance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4">
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
          </div>

          {/* Gastos Aprobados y Balance: 50/50 en pantallas chicas y medianas */}
          <div className="grid grid-cols-2 gap-2 sm:gap-6 xl:hidden">
            <Card className="bg-gray-800/50 border-red-500/20 py-2 sm:py-4 gap-1.5 sm:gap-2">
              <CardHeader className="pb-0 px-2.5 sm:px-4">
                <CardTitle className="text-[10px] sm:text-sm font-medium text-gray-400 flex items-center gap-1 sm:gap-2">
                  <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">Gastos Aprobados</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2.5 sm:px-4">
                <div className="text-sm sm:text-3xl font-bold text-red-400 truncate">
                  {formatARS(resumen.gastosAprobados)}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  {aprobados.length} gastos · sobre confirmados
                </p>
                <p className="text-[10px] sm:text-xs text-gray-600 mt-1 hidden sm:block">
                  Con todos los inscriptos: {formatARS(resumen.gastosAprobadosProyectado)}
                </p>
              </CardContent>
            </Card>

            <Card
              className={`bg-gray-800/50 py-2 sm:py-4 gap-1.5 sm:gap-2 ${resumen.balance >= 0 ? "border-yellow-400/20" : "border-red-500/40"}`}
            >
              <CardHeader className="pb-0 px-2.5 sm:px-4">
                <CardTitle className="text-[10px] sm:text-sm font-medium text-gray-400 flex items-center gap-1 sm:gap-2">
                  <Scale className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                  <span className="truncate">Balance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2.5 sm:px-4">
                <div
                  className={`text-sm sm:text-3xl font-bold truncate ${resumen.balance >= 0 ? "text-yellow-400" : "text-red-500"}`}
                >
                  {resumen.balance < 0 && "-"}
                  {formatARS(Math.abs(resumen.balance))}
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  {resumen.balance >= 0 ? "A favor" : "En déficit"} · ingresos menos gastos
                </p>
                <p className="text-[10px] sm:text-xs text-gray-600 mt-1 hidden sm:block">
                  Proyectado: {resumen.balanceProyectado < 0 ? "-" : ""}
                  {formatARS(Math.abs(resumen.balanceProyectado))}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contenido */}
        <Card className="bg-gray-800/50 border-yellow-400/20 py-3 sm:py-6 gap-3 sm:gap-4">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-3 sm:px-6">
            <div className="min-w-0 flex items-center gap-1.5 overflow-hidden">
              <CardTitle className="text-yellow-400 text-xs sm:text-base whitespace-nowrap shrink-0">
                Movimientos
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs sm:text-sm truncate hidden md:inline">
                · Gastos, ingresos y pagos de inscripción
              </CardDescription>
              {vista === "todo" && (
                <span className="text-[10px] sm:text-xs text-gray-500 truncate">
                  · {movimientosFiltrados.length} de {movimientos.length}
                </span>
              )}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-200 bg-gray-700/60 hover:bg-gray-700 shrink-0 h-7 px-2 sm:h-8 sm:px-3"
                >
                  <Filter className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Filtros</span>
                  {(filtroTipo !== "todos" || filtroEstado !== "todos") && (
                    <Badge className="ml-1 sm:ml-1.5 bg-yellow-400/20 text-yellow-400 px-1 text-[10px]">
                      {(filtroTipo !== "todos" ? 1 : 0) + (filtroEstado !== "todos" ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 bg-gray-800 border-gray-700 space-y-4" align="end">
                <div>
                  <Label className="text-gray-300 text-xs mb-1.5 block">Vista</Label>
                  <Select value={vista} onValueChange={(v) => setVista(v as Vista)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="todo">Todo ({movimientos.length})</SelectItem>
                      <SelectItem value="gastos">Gastos ({gastos.length})</SelectItem>
                      <SelectItem value="ingresos">Ingresos ({ingresos.length})</SelectItem>
                      <SelectItem value="pagos">Pagos ({confirmadas.length})</SelectItem>
                      <SelectItem value="rechazados">Rechazados ({rechazados.length})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {vista === "todo" && (
                  <>
                    <div>
                      <Label className="text-gray-300 text-xs mb-1.5 block">Tipo</Label>
                      <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as FiltroTipo)}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="todos">Todos los tipos</SelectItem>
                          <SelectItem value="ingreso">Solo ingresos</SelectItem>
                          <SelectItem value="gasto">Solo gastos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300 text-xs mb-1.5 block">Estado</Label>
                      <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as FiltroEstado)}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="todos">Todos los estados</SelectItem>
                          <SelectItem value="aprobado">Aprobado</SelectItem>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="rechazado">Rechazado</SelectItem>
                          <SelectItem value="cobrado">Cobrado</SelectItem>
                          <SelectItem value="por_cobrar">Por cobrar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(filtroTipo !== "todos" || filtroEstado !== "todos") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-gray-600 text-gray-300"
                        onClick={() => {
                          setFiltroTipo("todos")
                          setFiltroEstado("todos")
                        }}
                      >
                        Limpiar filtros
                      </Button>
                    )}
                  </>
                )}
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {vista === "todo" && (
              <MovimientosTable
                movimientos={movimientos}
                onVerGasto={setSelectedGasto}
                filtroTipo={filtroTipo}
                filtroEstado={filtroEstado}
              />
            )}

            {vista === "gastos" && (
              <GastosTable
                gastos={gastos}
                confirmados={resumen.confirmados}
                onView={setSelectedGasto}
                getStatusBadge={getStatusBadge}
                onTogglePagado={esAdmin ? handleTogglePagado : undefined}
              />
            )}

            {vista === "ingresos" && (
              <IngresosTable
                ingresos={ingresos}
                puedeEliminar={esAdmin}
                onEliminar={handleEliminarIngreso}
                onMarcarCobrado={handleMarcarCobrado}
              />
            )}

            {vista === "pagos" && (
              <>
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
              </>
            )}

            {vista === "rechazados" && (
              <GastosTable
                gastos={rechazados}
                confirmados={resumen.confirmados}
                onView={setSelectedGasto}
                getStatusBadge={getStatusBadge}
              />
            )}
          </CardContent>
        </Card>

        {/* Calculadora de caja y estimador: al final, colapsados */}
        <div className="mt-6 sm:mt-8 space-y-4">
          <CalculadoraCaja
            gastos={gastos}
            ingresos={ingresos}
            confirmados={resumen.confirmados}
            ingresoInscripciones={resumen.ingresoInscripciones}
            ingresoInscripcionesProyectado={resumen.ingresoInscripcionesProyectado}
          />
          <EstimadorInscriptos
            gastos={gastos}
            precioBase={precioBase}
            ingresosCobrados={resumen.ingresosCobrados}
            ingresosPorCobrar={resumen.ingresosPorCobrar}
            inscriptosActuales={resumen.inscriptosTotales}
          />
        </div>

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

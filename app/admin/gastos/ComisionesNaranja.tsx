"use client"

import { useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Percent, Plus, Trash2 } from "lucide-react"
import { CUENTA } from "@/lib/finanzas/cuenta"
import {
  CATEGORIA_COMISION,
  DESCRIPCION_COMISIONES,
  fechaCorta,
  hoyISO,
  nuevoItemComision,
  ordenarComisiones,
  resumenComisiones,
  totalComisiones,
  type ItemComision,
} from "@/lib/finanzas/comisiones"
import { formatARS, mensajeError, parseMonto, type Ingreso } from "./tipos"

interface ComisionesNaranjaProps {
  ingresos: Ingreso[]
  puedeEditar: boolean
  userEmail: string
  userRole: string
  onGuardado: () => Promise<void>
}

/**
 * Comisiones de Naranja X: un solo ingreso que va acumulando acreditaciones.
 *
 * Naranja X paga comision cada tanto y de a montos chicos. Un ingreso por
 * acreditacion dejaba la lista de finanzas llena de filas de $300 que tapaban
 * los sponsors, asi que aca se carga el dia y el monto, y todo eso suma en una
 * sola fila ("Comisiones de Naranja X") con su total.
 */
export function ComisionesNaranja({
  ingresos,
  puedeEditar,
  userEmail,
  userRole,
  onGuardado,
}: ComisionesNaranjaProps) {
  const { toast } = useToast()

  const [fecha, setFecha] = useState(hoyISO())
  const [monto, setMonto] = useState("")
  const [nota, setNota] = useState("")
  const [guardando, setGuardando] = useState(false)

  // El ingreso acumulador. Puede no existir todavia: se crea con la primera
  // comision que se carga.
  const ingreso = useMemo(
    () => ingresos.find((i) => i.categoria === CATEGORIA_COMISION) ?? null,
    [ingresos],
  )
  const items = useMemo(() => ordenarComisiones(ingreso?.items ?? []), [ingreso])
  const resumen = resumenComisiones(items)

  /** Guarda la lista completa de items y deja `monto` igual a su suma. */
  const guardarItems = async (nuevos: ItemComision[]) => {
    const total = totalComisiones(nuevos)

    if (ingreso) {
      // .select() a proposito: sin eso, una fila filtrada por RLS parece
      // guardada y la pantalla queda mintiendo.
      const { data, error } = await supabase
        .from("ingresos")
        .update({ items: nuevos, monto: total })
        .eq("id", ingreso.id)
        .select()
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error("No se guardó: la base rechazó el cambio (permisos)")
      }
      return
    }

    const { data, error } = await supabase
      .from("ingresos")
      .insert({
        evento_id: "2026",
        descripcion: DESCRIPCION_COMISIONES,
        monto: total,
        categoria: CATEGORIA_COMISION,
        estado: "cobrado",
        fecha: new Date().toISOString(),
        creado_por: userEmail,
        rol_creador: userRole,
        items: nuevos,
      })
      .select()
    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error("No se guardó: la base rechazó el alta (permisos)")
    }
  }

  const agregar = async () => {
    const montoNumero = parseMonto(monto)
    if (!Number.isFinite(montoNumero) || montoNumero === 0) {
      toast({
        title: "Falta el monto",
        description: "Escribí cuánto acreditó Naranja X (se aceptan centavos: 1234,56)",
        variant: "destructive",
      })
      return
    }

    setGuardando(true)
    try {
      await guardarItems([...items, nuevoItemComision(fecha, montoNumero, nota)])
      toast({
        title: "Comisión cargada",
        description: `${formatARS(montoNumero)} del ${fechaCorta(fecha)}`,
      })
      setMonto("")
      setNota("")
      setFecha(hoyISO())
      await onGuardado()
    } catch (err) {
      console.error("Error guardando la comisión:", mensajeError(err), err)
      toast({ title: "Error", description: mensajeError(err), variant: "destructive" })
    } finally {
      setGuardando(false)
    }
  }

  const borrar = async (id: string) => {
    setGuardando(true)
    try {
      await guardarItems(items.filter((i) => i.id !== id))
      toast({ title: "Comisión eliminada" })
      await onGuardado()
    } catch (err) {
      console.error("Error eliminando la comisión:", mensajeError(err), err)
      toast({ title: "Error", description: mensajeError(err), variant: "destructive" })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card className="bg-gray-800/50 border-orange-400/30">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-orange-300 flex items-center gap-2 text-base">
              <Percent className="w-4 h-4" />
              Comisiones de {CUENTA}
            </CardTitle>
            <CardDescription className="text-gray-400">
              Lo que {CUENTA} acredita por la plata del evento. Se carga por día y suma todo en un
              solo ingreso.
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-500">+{formatARS(resumen.total)}</p>
            <p className="text-[11px] text-gray-500">
              {resumen.desde
                ? `${resumen.cantidad} acreditación${resumen.cantidad === 1 ? "" : "es"} desde el ${fechaCorta(resumen.desde)}`
                : "Todavía no hay comisiones cargadas"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {puedeEditar && (
          <div className="grid grid-cols-2 sm:grid-cols-[auto_1fr_1fr_auto] gap-2 items-end rounded-lg border border-gray-700 bg-gray-700/30 p-3">
            <div>
              <Label className="text-gray-300 text-xs">Fecha</Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300 text-xs">Monto</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="1234,56"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-gray-300 text-xs">Nota (opcional)</Label>
              <Input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Comisión de la semana"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <Button
              onClick={agregar}
              disabled={guardando}
              className="col-span-2 sm:col-span-1 bg-green-600 text-white hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Agregar
            </Button>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-gray-500">
            Cargá la primera acreditación y acá queda el historial, con el total arriba.
          </p>
        ) : (
          <div className="rounded-lg border border-gray-700 divide-y divide-gray-700 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-white text-sm">
                    {fechaCorta(item.fecha)}
                    {item.nota && (
                      <span className="text-gray-500 text-xs"> · {item.nota}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-green-500 whitespace-nowrap">
                    +{formatARS(item.monto)}
                  </span>
                  {puedeEditar && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={guardando}
                      className="border-red-500/50 text-red-400 bg-transparent px-1.5"
                      onClick={() => borrar(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* En el PDF esto va en una sola linea: el total y desde cuando. Los dias
            uno por uno quedan en esta pantalla y en el Excel. */}
        {resumen.desde && (
          <p className="text-[11px] text-gray-500">
            En el PDF de finanzas sale una sola fila: {formatARS(resumen.total)} desde el{" "}
            {fechaCorta(resumen.desde)}.
          </p>
        )}

        {!puedeEditar && (
          <Badge className="bg-gray-700 text-gray-300">Solo un admin puede cargar comisiones</Badge>
        )}
      </CardContent>
    </Card>
  )
}

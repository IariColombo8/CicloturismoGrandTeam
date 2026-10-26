"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Wallet, ChevronDown, List } from "lucide-react"
import { ListaModal } from "./ListaModal"
import { CUENTA, ETIQUETA_PLATA } from "@/lib/finanzas/cuenta"
import { desdeCuando, fechaCorta } from "@/lib/finanzas/comisiones"
import { formatARS, totalGasto, type DesglosePagos, type Gasto, type Ingreso } from "./tipos"

interface Item {
  id: string
  label: string
  detalle?: string
  monto: number
  /** Si arranca tildado (osea, plata que ya se considera real). */
  defaultChecked: boolean
  etiqueta?: string
  /** Nombres detras del numero, para el boton "ver". */
  listado?: { titulo: string; items: string[] }
}

interface CalculadoraCajaProps {
  gastos: Gasto[]
  ingresos: Ingreso[]
  confirmados: number
  /** Confirmados con discapacidad (no pagan los gastos que no se les cobran). */
  conDiscapacidad?: number
  ingresoInscripciones: number
  ingresoInscripcionesProyectado: number
  /** Como se componen las inscripciones: quien pago el precio, quien otro monto, quien no pago. */
  desglosePagos: DesglosePagos
  precioBase: number
}

/**
 * Calculadora manual de caja: elegis que entradas y que salidas contar
 * para simular cuanta plata hay realmente disponible en la cuenta.
 */
export function CalculadoraCaja({
  gastos,
  ingresos,
  confirmados,
  conDiscapacidad = 0,
  ingresoInscripciones,
  ingresoInscripcionesProyectado,
  desglosePagos,
  precioBase,
}: CalculadoraCajaProps) {
  const [abierto, setAbierto] = useState(false)
  // Nombres detras de una fila, cuando se toca "ver".
  const [lista, setLista] = useState<{ titulo: string; items: string[] } | null>(null)

  const itemsEntra = useMemo<Item[]>(() => {
    const deIngresos: Item[] = ingresos.map((i) => ({
      id: `ingreso-${i.id}`,
      label: i.descripcion,
      // Un acumulador (comisiones de Naranja X) no tiene una sola fecha: lo que
      // ubica el monto es desde cuando se viene sumando.
      detalle:
        i.items.length > 0
          ? `${i.categoria} · desde el ${fechaCorta(desdeCuando(i.items))}`
          : i.categoria,
      monto: i.monto,
      defaultChecked: i.estado === "cobrado",
      etiqueta: i.estado === "cobrado" ? undefined : "Por cobrar",
    }))

    // Las inscripciones van desglosadas por situacion de pago: una sola linea
    // con "confirmados x precio" haria parecer que pagaron todos los
    // confirmados, y hay varios confirmados que todavia no transfirieron.
    const deInscripciones: Item[] = []

    if (desglosePagos.precioLista.cantidad > 0) {
      deInscripciones.push({
        id: "inscripciones-precio-lista",
        label: `Pagaron ${formatARS(precioBase)}`,
        detalle: `${desglosePagos.precioLista.cantidad} inscriptos × ${formatARS(precioBase)}`,
        monto: desglosePagos.precioLista.total,
        defaultChecked: true,
      })
    }

    if (desglosePagos.otroMonto.cantidad > 0) {
      deInscripciones.push({
        id: "inscripciones-otro-monto",
        label: "Pagaron otro monto",
        detalle: `${desglosePagos.otroMonto.cantidad} inscriptos`,
        monto: desglosePagos.otroMonto.total,
        defaultChecked: true,
        listado: {
          titulo: "Pagaron otro monto",
          items: desglosePagos.otroMonto.items.map(
            (i) => `${i.nombre} ${i.apellido} — ${formatARS(i.montoPagado ?? 0)}`,
          ),
        },
      })
    }

    if (desglosePagos.sinPagar.cantidad > 0) {
      deInscripciones.push({
        id: "inscripciones-sin-pagar",
        label: "Confirmados que no pagaron",
        // Solo la cantidad: los nombres van al modal del boton "ver".
        detalle: `${desglosePagos.sinPagar.cantidad} inscriptos`,
        monto: desglosePagos.sinPagar.total,
        defaultChecked: false,
        etiqueta: "Falta que transfieran",
        listado: {
          titulo: "Confirmados que no pagaron",
          items: desglosePagos.sinPagar.items.map((i) => `${i.nombre} ${i.apellido}`),
        },
      })
    }

    if (desglosePagos.otraForma.cantidad > 0) {
      deInscripciones.push({
        id: "inscripciones-otra-forma",
        label: "Pagaron de otra forma",
        detalle: `${desglosePagos.otraForma.cantidad} inscriptos`,
        monto: desglosePagos.otraForma.total,
        defaultChecked: false,
        etiqueta: "No entró a la caja",
        listado: {
          titulo: "Pagaron de otra forma",
          items: desglosePagos.otraForma.items.map(
            (i) => `${i.nombre} ${i.apellido}${i.pagoNota ? ` — ${i.pagoNota}` : ""}`,
          ),
        },
      })
    }

    // Lo que falta de las inscripciones que ni siquiera estan confirmadas: al
    // proyectado se le quitan los confirmados que ya aparecen en sus filas.
    const pendienteProyectado =
      ingresoInscripcionesProyectado -
      ingresoInscripciones -
      desglosePagos.sinPagar.total -
      desglosePagos.otraForma.total
    if (pendienteProyectado > 0) {
      deInscripciones.push({
        id: "inscripciones-pendientes",
        label: "Inscripciones pendientes de confirmar",
        detalle: "Si terminan de pagar",
        monto: pendienteProyectado,
        defaultChecked: false,
        etiqueta: "Todavía no confirmado",
      })
    }

    return [...deInscripciones, ...deIngresos]
  }, [
    ingresos,
    ingresoInscripciones,
    ingresoInscripcionesProyectado,
    desglosePagos,
    precioBase,
  ])

  const itemsSale = useMemo<Item[]>(() => {
    return gastos
      .filter((g) => g.estado === "aprobado")
      .map((g) => ({
        id: `gasto-${g.id}`,
        label: g.descripcion,
        detalle: g.categoria,
        monto: totalGasto(g, confirmados, conDiscapacidad),
        defaultChecked: g.pagado,
        etiqueta: g.pagado ? undefined : "Aún no se pagó",
      }))
  }, [gastos, confirmados, conDiscapacidad])

  const [marcadosEntra, setMarcadosEntra] = useState<Set<string> | null>(null)
  const [marcadosSale, setMarcadosSale] = useState<Set<string> | null>(null)

  const seleccionEntra =
    marcadosEntra ?? new Set(itemsEntra.filter((i) => i.defaultChecked).map((i) => i.id))
  const seleccionSale =
    marcadosSale ?? new Set(itemsSale.filter((i) => i.defaultChecked).map((i) => i.id))

  const toggleEntra = (id: string) => {
    const next = new Set(seleccionEntra)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setMarcadosEntra(next)
  }

  const toggleSale = (id: string) => {
    const next = new Set(seleccionSale)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setMarcadosSale(next)
  }

  const totalEntra = itemsEntra.filter((i) => seleccionEntra.has(i.id)).reduce((s, i) => s + i.monto, 0)
  const totalSale = itemsSale.filter((i) => seleccionSale.has(i.id)).reduce((s, i) => s + i.monto, 0)
  const totalBanco = totalEntra - totalSale

  return (
    <Card className="bg-gray-800/50 border-yellow-400/20">
      <Collapsible open={abierto} onOpenChange={setAbierto}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Calculadora de caja
              </CardTitle>
              <CardDescription className="text-gray-400 text-left">
                Elegí qué entradas y salidas contar para calcular cuánta plata hay realmente en{" "}
                {CUENTA}
              </CardDescription>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${abierto ? "rotate-180" : ""}`}
            />
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-green-500 mb-2">Entra</p>
                <div className="rounded-lg border border-gray-700 divide-y divide-gray-700 max-h-64 overflow-y-auto">
                  {itemsEntra.length === 0 && (
                    <p className="p-3 text-sm text-gray-500">No hay ingresos registrados</p>
                  )}
                  {itemsEntra.map((item) => {
                    const marcado = seleccionEntra.has(item.id)
                    return (
                      <label
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-2.5 cursor-pointer hover:bg-gray-700/40"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox checked={marcado} onCheckedChange={() => toggleEntra(item.id)} />
                          <div className="min-w-0">
                            <p className="text-white text-sm truncate">{item.label}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.detalle && (
                                <span className="text-xs text-gray-500 capitalize">{item.detalle}</span>
                              )}
                              {item.etiqueta && (
                                <Badge className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0">
                                  {item.etiqueta}
                                </Badge>
                              )}
                              {/* preventDefault para que al tocar "ver" no se
                                  tilde/destilde el item (esta dentro del label). */}
                              {item.listado && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setLista(item.listado!)
                                  }}
                                  className="inline-flex items-center gap-1 rounded border border-blue-400/40 px-1.5 py-0 text-[10px] text-blue-300 hover:bg-blue-400/10"
                                >
                                  <List className="w-3 h-3" />
                                  ver
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-sm font-semibold whitespace-nowrap ${
                            marcado ? "text-green-500" : "text-gray-500 line-through"
                          }`}
                        >
                          +{formatARS(item.monto)}
                        </span>
                      </label>
                    )
                  })}
                </div>
                <p className="text-right text-sm text-green-500 font-bold mt-1">
                  Subtotal: +{formatARS(totalEntra)}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-red-400 mb-2">Sale</p>
                <div className="rounded-lg border border-gray-700 divide-y divide-gray-700 max-h-64 overflow-y-auto">
                  {itemsSale.length === 0 && (
                    <p className="p-3 text-sm text-gray-500">No hay gastos aprobados</p>
                  )}
                  {itemsSale.map((item) => {
                    const marcado = seleccionSale.has(item.id)
                    return (
                      <label
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-2.5 cursor-pointer hover:bg-gray-700/40"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox checked={marcado} onCheckedChange={() => toggleSale(item.id)} />
                          <div className="min-w-0">
                            <p className="text-white text-sm truncate">{item.label}</p>
                            <div className="flex items-center gap-2">
                              {item.detalle && (
                                <span className="text-xs text-gray-500 capitalize">{item.detalle}</span>
                              )}
                              {item.etiqueta && (
                                <Badge className="bg-orange-500/20 text-orange-400 text-[10px] px-1.5 py-0">
                                  {item.etiqueta}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-sm font-semibold whitespace-nowrap ${
                            marcado ? "text-red-400" : "text-gray-500 line-through"
                          }`}
                        >
                          -{formatARS(item.monto)}
                        </span>
                      </label>
                    )
                  })}
                </div>
                <p className="text-right text-sm text-red-400 font-bold mt-1">
                  Subtotal: -{formatARS(totalSale)}
                </p>
              </div>
            </div>

            <div
              className={`rounded-lg border p-4 text-center ${
                totalBanco >= 0 ? "border-yellow-400/30 bg-yellow-400/10" : "border-red-500/40 bg-red-500/10"
              }`}
            >
              <p className="text-xs text-gray-400">{ETIQUETA_PLATA} (según lo tildado)</p>
              <p className={`text-3xl font-bold ${totalBanco >= 0 ? "text-yellow-400" : "text-red-500"}`}>
                {totalBanco < 0 ? "-" : ""}
                {formatARS(Math.abs(totalBanco))}
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <ListaModal
        abierto={lista !== null}
        onCerrar={() => setLista(null)}
        titulo={lista?.titulo || ""}
        descripcion={lista ? `${lista.items.length} inscriptos` : undefined}
        items={lista?.items || []}
      />
    </Card>
  )
}

"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calculator, TrendingUp, TrendingDown, Scale, ChevronDown } from "lucide-react"
import { formatARS, type Gasto } from "./tipos"

interface EstimadorInscriptosProps {
  gastos: Gasto[]
  precioBase: number
  ingresosCobrados: number
  ingresosPorCobrar: number
  inscriptosActuales: number
}

/**
 * Simulador: si llegan a inscribirse N personas, ¿cuanto entra, cuanto sale y cual es el neto?
 * Se calcula sobre gastos aprobados + pendientes (peor caso realista, sin contar rechazados).
 */
export function EstimadorInscriptos({
  gastos,
  precioBase,
  ingresosCobrados,
  ingresosPorCobrar,
  inscriptosActuales,
}: EstimadorInscriptosProps) {
  const [abierto, setAbierto] = useState(false)
  const [cantidadTexto, setCantidadTexto] = useState(String(inscriptosActuales || 150))

  const cantidad = Math.max(0, Number.parseInt(cantidadTexto, 10) || 0)

  const gastosVigentes = useMemo(() => gastos.filter((g) => g.estado !== "rechazado"), [gastos])

  const { gastosFijos, montoPorParticipante } = useMemo(() => {
    let fijos = 0
    let porParticipante = 0
    for (const g of gastosVigentes) {
      if (g.porParticipante) {
        porParticipante += g.monto
      } else {
        fijos += g.monto
      }
    }
    return { gastosFijos: fijos, montoPorParticipante: porParticipante }
  }, [gastosVigentes])

  const gastosVariables = montoPorParticipante * cantidad
  const entra = cantidad * precioBase + ingresosCobrados + ingresosPorCobrar
  const sale = gastosFijos + gastosVariables
  const neto = entra - sale

  const estado =
    neto > 0
      ? { texto: "RINDE", color: "text-green-500", borde: "border-green-500/40", bg: "bg-green-500/10" }
      : neto === 0
        ? { texto: "JUSTO", color: "text-yellow-400", borde: "border-yellow-400/40", bg: "bg-yellow-400/10" }
        : { texto: "FALTA PLATA", color: "text-red-500", borde: "border-red-500/40", bg: "bg-red-500/10" }

  return (
    <Card className="bg-gray-800/50 border-yellow-400/10">
      <Collapsible open={abierto} onOpenChange={setAbierto}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-yellow-400/80 flex items-center gap-2 text-base">
                <Calculator className="w-4 h-4" />
                Estimador de inscriptos <span className="text-xs text-gray-500">(extra, para chusmear)</span>
              </CardTitle>
              <CardDescription className="text-gray-500 text-left text-xs">
                Simulá cuánto entra y cuánto sale según la cantidad de inscriptos que proyectás.
              </CardDescription>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${abierto ? "rotate-180" : ""}`}
            />
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="max-w-xs">
              <Label className="text-gray-300">Cantidad de inscriptos estimados</Label>
              <Input
                type="number"
                min={0}
                value={cantidadTexto}
                onChange={(e) => setCantidadTexto(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Entra
                </p>
                <p className="text-2xl font-bold text-green-500">+{formatARS(entra)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {cantidad} × {formatARS(precioBase)} inscripción
                  {ingresosCobrados + ingresosPorCobrar > 0 && (
                    <> + {formatARS(ingresosCobrados + ingresosPorCobrar)} otros ingresos</>
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Sale
                </p>
                <p className="text-2xl font-bold text-red-400">-{formatARS(sale)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatARS(gastosFijos)} fijos + {formatARS(montoPorParticipante)} × {cantidad} por participante
                </p>
              </div>

              <div className={`rounded-lg border p-3 ${estado.borde} ${estado.bg}`}>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5" /> Neto
                </p>
                <p className={`text-2xl font-bold ${estado.color}`}>
                  {neto < 0 ? "-" : "+"}
                  {formatARS(Math.abs(neto))}
                </p>
                <p className={`text-xs font-semibold mt-1 ${estado.color}`}>{estado.texto}</p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

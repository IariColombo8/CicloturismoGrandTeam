"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Calculator, TrendingUp, TrendingDown, Scale, ChevronDown, FileText } from "lucide-react"
import { calcularEstimacion, personasDelGasto } from "@/lib/finanzas/estimacion"
import { exportarEstimacionPDF } from "./exportEstimacion"
import { formatARS, mensajeError, type Gasto } from "./tipos"

interface EstimadorInscriptosProps {
  gastos: Gasto[]
  precioBase: number
  ingresosCobrados: number
  ingresosPorCobrar: number
  inscriptosActuales: number
  /** Inscripciones sin cargo ya cargadas (confirmadas con pago "gratis"). */
  gratis: number
  /** Confirmados con discapacidad: no pagan los gastos que no se les cobran (el lugar). */
  conDiscapacidad?: number
}

/**
 * Simulador: si llegan a inscribirse N personas, ¿cuanto entra, cuanto sale y cual es el neto?
 * Se calcula sobre gastos aprobados + pendientes (peor caso realista, sin contar rechazados).
 *
 * En pantalla se separa a la gente en tres: los que pagan la inscripcion, los
 * gratis (no pagan, pero cuentan en todos los gastos por persona) y las
 * personas con discapacidad (no cuentan en los gastos que no se les cobran,
 * como el lugar del evento). El PDF pregunta si tenerlos en cuenta.
 */
export function EstimadorInscriptos({
  gastos,
  precioBase,
  ingresosCobrados,
  ingresosPorCobrar,
  inscriptosActuales,
  gratis,
  conDiscapacidad = 0,
}: EstimadorInscriptosProps) {
  const { toast } = useToast()
  const [abierto, setAbierto] = useState(false)
  const [cantidadTexto, setCantidadTexto] = useState(String(inscriptosActuales || 150))
  const [preguntarEspeciales, setPreguntarEspeciales] = useState(false)
  const [generando, setGenerando] = useState(false)

  const cantidad = Math.max(0, Number.parseInt(cantidadTexto, 10) || 0)
  const hayEspeciales = gratis > 0 || conDiscapacidad > 0

  const est = useMemo(
    () =>
      calcularEstimacion({
        cantidad,
        precioBase,
        gastos,
        ingresosCobrados,
        ingresosPorCobrar,
        gratis,
        contarGratis: true,
        conDiscapacidad,
        contarDiscapacidad: true,
      }),
    [cantidad, precioBase, gastos, ingresosCobrados, ingresosPorCobrar, gratis, conDiscapacidad],
  )

  // Gastos por persona vigentes, con por cuantos se paga cada uno.
  const gastosPorPersona = useMemo(
    () => gastos.filter((g) => g.porParticipante && g.estado !== "rechazado"),
    [gastos],
  )

  const estado =
    est.veredicto === "RINDE"
      ? { color: "text-green-500", borde: "border-green-500/40", bg: "bg-green-500/10" }
      : est.veredicto === "JUSTO"
        ? { color: "text-yellow-400", borde: "border-yellow-400/40", bg: "bg-yellow-400/10" }
        : { color: "text-red-500", borde: "border-red-500/40", bg: "bg-red-500/10" }

  const descargar = async (contar: boolean) => {
    setPreguntarEspeciales(false)
    setGenerando(true)
    try {
      await exportarEstimacionPDF({
        cantidad,
        precioBase,
        gastos,
        ingresosCobrados,
        ingresosPorCobrar,
        gratis,
        contarGratis: contar,
        conDiscapacidad,
        contarDiscapacidad: contar,
      })
    } catch (err) {
      console.error("Error generando el PDF de la estimación:", mensajeError(err), err)
      toast({ title: "Error al generar el PDF", description: mensajeError(err), variant: "destructive" })
    } finally {
      setGenerando(false)
    }
  }

  const pedirPDF = () => {
    if (cantidad === 0) {
      toast({
        title: "Falta la cantidad",
        description: "Poné cuántos inscriptos querés proyectar",
        variant: "destructive",
      })
      return
    }
    // Sin gratis ni personas con discapacidad no hay nada que preguntar.
    if (!hayEspeciales) {
      descargar(false)
      return
    }
    setPreguntarEspeciales(true)
  }

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
            <div className="flex flex-wrap items-end gap-3">
              <div className="max-w-xs space-y-1">
                <Label className="text-gray-300">Cantidad de inscriptos estimados</Label>
                <Input
                  type="number"
                  min={0}
                  value={cantidadTexto}
                  onChange={(e) => setCantidadTexto(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <Button
                onClick={pedirPDF}
                disabled={generando}
                variant="outline"
                className="border-gray-600 text-gray-200 bg-gray-700/60 hover:bg-gray-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                {generando ? "Generando..." : "PDF de esta cantidad"}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Entra
                </p>
                <p className="text-2xl font-bold text-green-500">+{formatARS(est.entra)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {est.pagan} × {formatARS(precioBase)} inscripción
                  {est.entraOtros > 0 && <> + {formatARS(est.entraOtros)} otros ingresos</>}
                </p>
              </div>

              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Sale
                </p>
                <p className="text-2xl font-bold text-red-400">-{formatARS(est.sale)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatARS(est.gastosFijos)} fijos + {formatARS(est.gastosVariables)} por persona
                </p>
              </div>

              <div className={`rounded-lg border p-3 ${estado.borde} ${estado.bg}`}>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5" /> Neto
                </p>
                <p className={`text-2xl font-bold ${estado.color}`}>
                  {est.neto < 0 ? "-" : "+"}
                  {formatARS(Math.abs(est.neto))}
                </p>
                <p className={`text-xs font-semibold mt-1 ${estado.color}`}>{est.veredicto}</p>
              </div>
            </div>

            {/* Quien paga que: la cuenta de arriba, separada por grupo. */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-gray-700 bg-gray-700/30 p-3 space-y-2">
                <p className="text-gray-300 font-semibold">La gente ({cantidad})</p>
                <p className="text-gray-400">
                  <span className="text-white font-semibold">{est.pagan}</span> pagan la inscripción
                  ({formatARS(precioBase)}) = {formatARS(est.entraInscripciones)}
                </p>
                <p className="text-gray-400">
                  <span className="text-blue-300 font-semibold">{est.gratisDescontados}</span> gratis: no
                  pagan la inscripción, pero cuentan en todos los gastos por persona (lugar, seguro y
                  lo demás).
                </p>
                <p className="text-gray-400">
                  <span className="text-teal-300 font-semibold">{est.discapacidadDescontados}</span> con
                  discapacidad: no se paga por ellas el lugar del evento
                  {est.montoNoCobraDiscapacidad > 0 &&
                    ` (${formatARS(est.montoNoCobraDiscapacidad)} c/u = ${formatARS(est.ahorroDiscapacidad)} menos)`}
                  ; el seguro y lo demás sí. La inscripción la pagan según lo cargado (si son gratis,
                  ya están en los gratis).
                </p>
                <p className="text-[10px] text-gray-500">
                  Gratis y personas con discapacidad salen de los confirmados de hoy.
                </p>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-700/30 p-3 space-y-1.5">
                <p className="text-gray-300 font-semibold">Gastos por persona</p>
                {gastosPorPersona.length === 0 ? (
                  <p className="text-gray-500">No hay gastos por persona cargados.</p>
                ) : (
                  gastosPorPersona.map((g) => {
                    const personas = personasDelGasto(g, est)
                    return (
                      <div key={g.id} className="flex items-start justify-between gap-2">
                        <span className="text-gray-400 min-w-0">
                          {g.descripcion}{" "}
                          <span className="text-gray-500">
                            {formatARS(g.monto)} × {personas}
                            {personas < cantidad && " (sin las personas con discapacidad)"}
                          </span>
                        </span>
                        <span className="text-red-400 font-semibold whitespace-nowrap">
                          {formatARS(g.monto * personas)}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* La pregunta del PDF: gratis y personas con discapacidad. */}
      <Dialog open={preguntarEspeciales} onOpenChange={setPreguntarEspeciales}>
        <DialogContent className="bg-gray-800 border-yellow-400/30 max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">
              ¿Tener en cuenta los gratis y las personas con discapacidad?
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              En los {cantidad} que proyectás hay {gratis} gratis y {conDiscapacidad} con
              discapacidad. Pueden contarse de dos formas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <p className="rounded-lg border border-gray-700 bg-gray-700/40 p-3 text-gray-300">
              <span className="font-semibold text-white">Tenerlos en cuenta (como en pantalla):</span>{" "}
              los gratis no pagan la inscripción pero cuentan en los gastos por persona; por las
              personas con discapacidad no se paga el lugar del evento.
            </p>
            <p className="rounded-lg border border-gray-700 bg-gray-700/40 p-3 text-gray-300">
              <span className="font-semibold text-white">No tenerlos en cuenta:</span> se calcula
              como si los {cantidad} pagaran el precio de lista y todos los gastos por persona.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="border-gray-600 text-gray-200 bg-gray-700/60 hover:bg-gray-700"
              onClick={() => descargar(false)}
            >
              No, que paguen todos
            </Button>
            <Button
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700"
              onClick={() => descargar(true)}
            >
              Sí, tenerlos en cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

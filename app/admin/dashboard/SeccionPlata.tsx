"use client"

import { useMemo } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  ArrowRight,
  Banknote,
  CreditCard,
  Landmark,
  Receipt,
  StickyNote,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { useFinanzas } from "@/app/admin/gastos/useFinanzas"
import { formatARS, totalGasto } from "@/app/admin/gastos/tipos"
import { ETIQUETA_PLATA } from "@/lib/finanzas/cuenta"
import { Dato, FilaConteo, Panel, Seccion, SinDatos, Tarjeta } from "./piezas"
import type { Conteo } from "./panorama"

const LazyGraficosPlata = dynamic(() => import("./GraficosPlata"), {
  ssr: false,
  loading: () => <div className="py-16 text-center text-sm text-yellow-400/70 animate-pulse">Cargando gráficos…</div>,
})

/**
 * Bloque de plata del dashboard.
 *
 * Usa el mismo `useFinanzas` que /admin/gastos a proposito: antes el dashboard
 * calculaba los ingresos por su cuenta y los dos paneles mostraban numeros
 * distintos para la misma pregunta.
 */
export function SeccionPlata({ precio, habilitado }: { precio: number; habilitado: boolean }) {
  const { resumen, gastos, notas, cargando, error } = useFinanzas(precio, habilitado)
  const d = resumen.desglosePagos

  // Gastos aprobados agrupados por categoria, con los "por participante" ya
  // multiplicados por la cantidad de confirmados.
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const gasto of gastos) {
      if (gasto.estado !== "aprobado") continue
      const categoria = (gasto.categoria || "sin categoría").trim()
      mapa.set(categoria, (mapa.get(categoria) ?? 0) + totalGasto(gasto, resumen.confirmados))
    }
    return [...mapa.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([categoria, monto]) => ({ categoria, monto }))
  }, [gastos, resumen.confirmados])

  // Cada situacion de pago, con los nombres detras del boton "ver".
  const filasPago: { conteo: Conteo; monto: number; nota?: string }[] = [
    {
      conteo: {
        label: `Pagaron ${formatARS(precio)}`,
        cantidad: d.precioLista.cantidad,
        // Los que pagaron el precio de lista no necesitan lista de nombres:
        // no hay nada que revisar en ellos.
        items: [],
      },
      monto: d.precioLista.total,
    },
    {
      conteo: {
        label: "Pagaron otro monto",
        cantidad: d.otroMonto.cantidad,
        items: d.otroMonto.items.map((i) => `${i.nombre} ${i.apellido} — ${formatARS(i.montoPagado ?? 0)}`),
      },
      monto: d.otroMonto.total,
    },
    {
      conteo: {
        label: "Confirmados sin pagar",
        cantidad: d.sinPagar.cantidad,
        items: d.sinPagar.items.map((i) => `${i.nombre} ${i.apellido}`),
      },
      monto: d.sinPagar.total,
      nota: "falta que entre",
    },
    {
      conteo: {
        label: "Pagaron de otra forma",
        cantidad: d.otraForma.cantidad,
        items: d.otraForma.items.map(
          (i) => `${i.nombre} ${i.apellido}${i.pagoNota ? ` — ${i.pagoNota}` : ""}`,
        ),
      },
      monto: d.otraForma.total,
      nota: "no entró a la caja",
    },
    {
      conteo: {
        label: "Sin cargo",
        cantidad: d.gratis.cantidad,
        items: d.gratis.items.map((i) => `${i.nombre} ${i.apellido}`),
      },
      monto: 0,
    },
  ].filter((f) => f.conteo.cantidad > 0)

  const notasSinResolver = notas.filter((n) => !n.resuelta)

  return (
    <Seccion
      titulo="Plata"
      bajada="Los mismos números que /admin/gastos: confirmar no es cobrar, así que lo que entró sale de lo que pagó cada uno."
      icono={<Wallet className="w-5 h-5 text-emerald-400" />}
      acciones={
        <Link
          href="/admin/gastos"
          className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 border border-yellow-400/30 rounded-lg px-3 py-1.5"
        >
          Ver finanzas completas <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      }
    >
      {error && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          No se pudieron cargar las finanzas: {error}
        </p>
      )}

      {/* Los numeros que se miran primero */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Tarjeta
          titulo="Entró de verdad"
          valor={formatARS(resumen.totalIngresos)}
          title={formatARS(resumen.totalIngresos)}
          detalle={`${formatARS(resumen.ingresoInscripciones)} de inscripciones + ${formatARS(resumen.ingresosCobrados)} de sponsors y otros`}
          icono={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          tono="verde"
          cargando={cargando}
        />
        <Tarjeta
          titulo="Gastos aprobados"
          valor={formatARS(resumen.gastosAprobados)}
          title={formatARS(resumen.gastosAprobados)}
          detalle={`${formatARS(resumen.gastosAprobadosPagados)} ya pagados`}
          aviso={
            resumen.gastosAprobadosSinPagar > 0
              ? `${formatARS(resumen.gastosAprobadosSinPagar)} sin pagar todavía`
              : undefined
          }
          icono={<TrendingDown className="w-4 h-4 text-red-400" />}
          tono="rojo"
          cargando={cargando}
        />
        <Tarjeta
          titulo={ETIQUETA_PLATA}
          valor={formatARS(resumen.plataEnBanco)}
          title={formatARS(resumen.plataEnBanco)}
          detalle="Lo cobrado menos lo que ya se pagó"
          icono={<Landmark className="w-4 h-4 text-sky-400" />}
          tono="azul"
          cargando={cargando}
        />
        <Tarjeta
          titulo="Balance"
          valor={formatARS(resumen.balance)}
          title={formatARS(resumen.balance)}
          detalle={`Proyectado: ${formatARS(resumen.balanceProyectado)}`}
          icono={<Banknote className="w-4 h-4 text-yellow-400" />}
          tono={resumen.balance >= 0 ? "dorado" : "rojo"}
          cargando={cargando}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Desglose de pagos: la unica forma honesta de mostrar los ingresos
            por inscripcion, porque no todos los confirmados pagaron igual. */}
        <Panel
          titulo="Cómo pagaron los confirmados"
          bajada={`${resumen.confirmados} confirmados. El botón "ver" abre los nombres.`}
          icono={<CreditCard className="w-4 h-4 text-yellow-400" />}
        >
          {cargando ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-zinc-800 rounded animate-pulse" />
              ))}
            </div>
          ) : filasPago.length === 0 ? (
            <SinDatos texto="Todavía no hay inscripciones confirmadas." />
          ) : (
            <div className="divide-y divide-zinc-800">
              {filasPago.map((fila) => (
                <div key={fila.conteo.label} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <FilaConteo
                      conteo={fila.conteo}
                      total={resumen.confirmados}
                      tituloModal={fila.conteo.label}
                    />
                  </div>
                  <div className="text-right flex-shrink-0 w-24">
                    <p className="text-sm font-bold text-white tabular-nums">{formatARS(fila.monto)}</p>
                    {fila.nota && <p className="text-[10px] text-orange-400 leading-none">{fila.nota}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Dato label="Falta cobrar de inscripciones" valor={formatARS(d.sinPagar.total + d.otraForma.total)} tono="ambar" />
            <Dato label="Ingresos por cobrar" valor={formatARS(resumen.ingresosPorCobrar)} tono="azul" />
          </div>
        </Panel>

        {/* Gastos: el detalle operativo que antes no estaba en el dashboard. */}
        <Panel
          titulo="Gastos por categoría"
          bajada="Aprobados, con los gastos por persona ya multiplicados."
          icono={<Receipt className="w-4 h-4 text-yellow-400" />}
        >
          {cargando ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-zinc-800 rounded animate-pulse" />
              ))}
            </div>
          ) : porCategoria.length === 0 ? (
            <SinDatos texto="Todavía no hay gastos aprobados." />
          ) : (
            <div className="space-y-2">
              {porCategoria.map((c) => (
                <div key={c.categoria}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-300 capitalize truncate">{c.categoria}</span>
                    <span className="text-sm font-bold text-white tabular-nums flex-shrink-0">
                      {formatARS(c.monto)}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1 mt-1">
                    <div
                      className="bg-gradient-to-r from-red-500 to-orange-400 h-1 rounded-full"
                      style={{
                        width: `${resumen.gastosAprobados > 0 ? (c.monto / resumen.gastosAprobados) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Dato label="Sin aprobar (posible deuda)" valor={formatARS(resumen.gastosPendientes)} tono="ambar" />
            <Dato
              label="Costo por confirmado"
              valor={
                resumen.confirmados > 0
                  ? formatARS(Math.round(resumen.gastosAprobados / resumen.confirmados))
                  : "—"
              }
              tono="violeta"
            />
          </div>
        </Panel>
      </div>

      {/* Observaciones de caja cargadas desde el registro de inscripciones. */}
      {notasSinResolver.length > 0 && (
        <Panel
          titulo={`${notasSinResolver.length} ${notasSinResolver.length === 1 ? "nota de caja sin resolver" : "notas de caja sin resolver"}`}
          bajada="Plata que no es gasto ni ingreso y hay que acordarse."
          icono={<StickyNote className="w-4 h-4 text-amber-400" />}
          className="mb-4 sm:mb-6"
        >
          <ul className="space-y-1.5">
            {notasSinResolver.slice(0, 5).map((nota) => (
              <li key={nota.id} className="text-sm text-amber-200/90 flex gap-2">
                <span className="text-amber-500">•</span>
                <span className="break-words">{nota.texto}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {!cargando && (
        <LazyGraficosPlata
          ingresos={resumen.totalIngresos}
          gastosPagados={resumen.gastosAprobadosPagados}
          gastosSinPagar={resumen.gastosAprobadosSinPagar}
          gastosPendientes={resumen.gastosPendientes}
          porCobrar={d.sinPagar.total + d.otraForma.total + resumen.ingresosPorCobrar}
          porCategoria={porCategoria}
        />
      )}
    </Seccion>
  )
}

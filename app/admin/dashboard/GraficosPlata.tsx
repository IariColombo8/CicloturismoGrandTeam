"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Panel, SinDatos } from "./piezas"
import { formatARS } from "@/app/admin/gastos/tipos"
import { PieChart as PieIcon, Scale } from "lucide-react"

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#18181b",
    border: "1px solid #fbbf24",
    borderRadius: "8px",
    fontSize: "12px",
  },
  labelStyle: { color: "#fbbf24" },
}

const COLORES_CATEGORIA = ["#fbbf24", "#60a5fa", "#a78bfa", "#f472b6", "#34d399", "#fb923c", "#38bdf8", "#f87171"]

interface GraficosPlataProps {
  /** Plata que ya entro (inscripciones cobradas + ingresos cobrados). */
  ingresos: number
  /** Gastos aprobados que ya se pagaron. */
  gastosPagados: number
  /** Gastos aprobados que todavia no se abonaron. */
  gastosSinPagar: number
  /** Gastos propuestos que todavia no se aprobaron. */
  gastosPendientes: number
  /** Lo que falta cobrar (inscripciones impagas + ingresos por cobrar). */
  porCobrar: number
  /** Gastos aprobados por categoria, ya multiplicados los "por participante". */
  porCategoria: { categoria: string; monto: number }[]
}

export default function GraficosPlata({
  ingresos,
  gastosPagados,
  gastosSinPagar,
  gastosPendientes,
  porCobrar,
  porCategoria,
}: GraficosPlataProps) {
  // Un solo eje y una sola unidad: pesos. El grafico anterior ponia en las
  // mismas barras pesos y cantidad de inscripciones, asi que la barra de
  // inscripciones quedaba invisible al lado de los millones.
  const datosBalance = [
    { nombre: "Entró", valor: ingresos, color: "#10b981" },
    { nombre: "Falta cobrar", valor: porCobrar, color: "#38bdf8" },
    { nombre: "Gastos pagados", valor: gastosPagados, color: "#ef4444" },
    { nombre: "Aprobado sin pagar", valor: gastosSinPagar, color: "#fb923c" },
    { nombre: "Sin aprobar", valor: gastosPendientes, color: "#a1a1aa" },
  ]

  const datosCategoria = porCategoria.map((c, i) => ({
    name: c.categoria,
    value: c.monto,
    color: COLORES_CATEGORIA[i % COLORES_CATEGORIA.length],
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <Panel
        titulo="Entró, falta y salió"
        bajada="Todo en pesos: lo cobrado, lo que falta cobrar y los gastos según en qué etapa están."
        icono={<Scale className="w-4 h-4 text-yellow-400" />}
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={datosBalance} margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="nombre" stroke="#9ca3af" style={{ fontSize: "10px" }} interval={0} />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: "11px" }}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            />
            <Tooltip {...tooltipStyle} formatter={(valor: any) => formatARS(Number(valor))} />
            <Bar dataKey="valor" name="Monto" radius={[6, 6, 0, 0]}>
              {datosBalance.map((d) => (
                <Cell key={d.nombre} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel
        titulo="En qué se gasta"
        bajada="Gastos aprobados por categoría. Los gastos por persona ya están multiplicados por los confirmados."
        icono={<PieIcon className="w-4 h-4 text-yellow-400" />}
      >
        {datosCategoria.length === 0 ? (
          <SinDatos texto="Todavía no hay gastos aprobados." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={datosCategoria}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => entry.name}
                outerRadius={85}
                dataKey="value"
              >
                {datosCategoria.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(valor: any) => formatARS(Number(valor))} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  )
}

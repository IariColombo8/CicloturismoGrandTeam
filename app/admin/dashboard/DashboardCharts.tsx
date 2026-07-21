"use client"

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Activity, Calendar, Award, MapPin, DollarSign } from "lucide-react"

interface DashboardChartsProps {
  inscripciones: any[]
  ingresosConfirmados: number
  ingresosPotenciales: number
  aprobadas: any[]
  pendientes: any[]
}

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#1f2937",
    border: "1px solid #fbbf24",
    borderRadius: "8px",
  },
}

const COLORS_ESTADO = [
  { name: "Confirmadas", color: "#10b981" },
  { name: "Pendientes", color: "#f59e0b" },
  { name: "Rechazadas", color: "#ef4444" },
]

const COLORS_CATEGORIA = ["#fbbf24", "#60a5fa", "#a78bfa", "#f472b6", "#34d399", "#fb923c"]

function processChartData(inscripciones: any[]) {
  // Inscripciones por fecha
  const byDate: Record<string, number> = {}
  inscripciones.forEach((i) => {
    const fecha = i.fechaInscripcion?.toDate?.()
      ? i.fechaInscripcion.toDate().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
      : i.fechaInscripcion || "Sin fecha"
    byDate[fecha] = (byDate[fecha] || 0) + 1
  })
  const chartData = Object.entries(byDate)
    .map(([date, count]) => ({ date, inscripciones: count }))
    .slice(-14)

  // Estado
  const confirmadas = inscripciones.filter((i) => i.estado === "confirmada").length
  const pendientes = inscripciones.filter((i) => i.estado === "pendiente").length
  const rechazadas = inscripciones.filter((i) => i.estado === "rechazada").length
  const estadoData = [
    { name: "Confirmadas", value: confirmadas, color: "#10b981" },
    { name: "Pendientes", value: pendientes, color: "#f59e0b" },
    { name: "Rechazadas", value: rechazadas, color: "#ef4444" },
  ].filter((d) => d.value > 0)

  // Grupos ciclistas
  const byCat: Record<string, number> = {}
  inscripciones.forEach((i) => {
    const cat = i.grupoCiclistas || "Sin grupo"
    byCat[cat] = (byCat[cat] || 0) + 1
  })
  const categoriaData = Object.entries(byCat).map(([name, value], idx) => ({
    name,
    value,
    color: COLORS_CATEGORIA[idx % COLORS_CATEGORIA.length],
  }))

  // Localidades top 5
  const byLocalidad: Record<string, number> = {}
  inscripciones.forEach((i) => {
    const localidad = i.localidad || i.ciudad || "Sin dato"
    byLocalidad[localidad] = (byLocalidad[localidad] || 0) + 1
  })
  const localidadData = Object.entries(byLocalidad)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([localidad, count]) => ({ localidad, count }))

  // Tendencia acumulada
  let acum = 0
  const tendenciaData = chartData.map((d) => {
    acum += d.inscripciones
    return { fecha: d.date, total: acum }
  })

  // Radar
  const total = inscripciones.length || 1
  const radarData = [
    { metric: "Confirmación", value: Math.round((confirmadas / total) * 100) },
    { metric: "Ocupación", value: Math.min(100, Math.round((total / 150) * 100)) },
    { metric: "Pago", value: Math.round((confirmadas / total) * 100) },
    { metric: "Actividad", value: Math.min(100, chartData.length * 10) },
    { metric: "Diversidad", value: Math.min(100, Object.keys(byLocalidad).length * 15) },
  ]

  return { chartData, estadoData, categoriaData, localidadData, tendenciaData, radarData }
}

export default function DashboardCharts({
  inscripciones,
  ingresosConfirmados,
  ingresosPotenciales,
  aprobadas,
  pendientes,
}: DashboardChartsProps) {
  const { chartData, estadoData, categoriaData, localidadData, tendenciaData, radarData } =
    processChartData(inscripciones)
  const aprobadasLength = aprobadas.length
  const pendientesLength = pendientes.length
  return (
    <>
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Tendencia Acumulada */}
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
              Crecimiento Acumulado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={tendenciaData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="fecha" stroke="#9ca3af" style={{ fontSize: "12px" }} />
                <YAxis stroke="#9ca3af" />
                <Tooltip {...tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#fbbf24"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Estado de inscripciones - Pie */}
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-yellow-400" />
              Distribución por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={estadoData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {estadoData.map((entry, index) => (
                    <Cell key={`cell-estado-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Inscripciones por fecha - Line */}
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-400" />
              Inscripciones Diarias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: "12px" }} />
                <YAxis stroke="#9ca3af" />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="inscripciones"
                  stroke="#fbbf24"
                  strokeWidth={3}
                  dot={{ fill: "#fbbf24", r: 5 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Grupos ciclistas - Pie */}
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Distribución por grupo ciclista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoriaData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoriaData.map((entry, index) => (
                    <Cell key={`cell-categoria-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Top Localidades - Bar */}
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-yellow-400" />
              Top 5 Localidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={localidadData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="localidad" type="category" stroke="#9ca3af" width={80} style={{ fontSize: "11px" }} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" fill="#fbbf24" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar Chart - Métricas */}
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-yellow-400" />
              Métricas de Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="metric" stroke="#9ca3af" />
                <PolarRadiusAxis stroke="#9ca3af" />
                <Radar
                  name="Rendimiento"
                  dataKey="value"
                  stroke="#fbbf24"
                  fill="#fbbf24"
                  fillOpacity={0.6}
                />
                <Tooltip {...tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de Ingresos - Bar Chart Grande */}
      <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm mb-6 sm:mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Análisis Financiero Detallado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={[
                {
                  name: "Confirmadas",
                  ingresos: ingresosConfirmados,
                  inscripciones: aprobadasLength,
                },
                {
                  name: "Pendientes",
                  ingresos: ingresosPotenciales,
                  inscripciones: pendientesLength,
                },
                {
                  name: "Total Potencial",
                  ingresos: ingresosConfirmados + ingresosPotenciales,
                  inscripciones: aprobadasLength + pendientesLength,
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: any) => `$${value.toLocaleString("es-AR")}`}
              />
              <Legend />
              <Bar dataKey="ingresos" fill="#10b981" name="Ingresos ($)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="inscripciones" fill="#fbbf24" name="Inscripciones" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  )
}

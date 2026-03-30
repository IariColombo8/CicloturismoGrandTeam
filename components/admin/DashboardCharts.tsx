"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TrendingUp, Calendar, MapPin, Award, Activity, DollarSign
} from "lucide-react"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar,
} from "recharts"

const tooltipStyle = {
  backgroundColor: "#1f2937",
  border: "1px solid #fbbf24",
  borderRadius: "8px",
}

interface DashboardChartsProps {
  inscripciones: any[]
  ingresosConfirmados: number
  ingresosPotenciales: number
  aprobadas: any[]
  pendientes: any[]
}

export default function DashboardCharts({
  inscripciones,
  ingresosConfirmados,
  ingresosPotenciales,
  aprobadas,
  pendientes,
}: DashboardChartsProps) {
  const { chartData, estadoData, categoriaData, provinciaData, tendenciaData, radarData } =
    useMemo(() => {
      const data = inscripciones

      // Inscripciones por fecha
      const dateCount: { [key: string]: number } = {}
      data.forEach((inscripcion) => {
        if (inscripcion.fechaInscripcion) {
          const date = new Date(inscripcion.fechaInscripcion).toLocaleDateString("es-AR")
          dateCount[date] = (dateCount[date] || 0) + 1
        }
      })
      const chartData = Object.entries(dateCount)
        .map(([date, count]) => ({ date, inscripciones: count }))
        .sort(
          (a, b) =>
            new Date(a.date.split("/").reverse().join("-")).getTime() -
            new Date(b.date.split("/").reverse().join("-")).getTime()
        )

      // Estado
      const estadoData = [
        { name: "Pendiente", value: data.filter((i) => i.estado === "pendiente").length, color: "#f59e0b" },
        { name: "Confirmada", value: data.filter((i) => i.estado === "confirmada").length, color: "#10b981" },
        { name: "Rechazada", value: data.filter((i) => i.estado === "rechazada").length, color: "#ef4444" },
      ]

      // Categorías
      const categoriaCount: { [key: string]: number } = {}
      data.forEach((i) => {
        const cat = i.categoria || "Sin categoría"
        categoriaCount[cat] = (categoriaCount[cat] || 0) + 1
      })
      const colors = ["#fbbf24", "#f59e0b", "#d97706", "#b45309"]
      const categoriaData = Object.entries(categoriaCount).map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx % 4],
      }))

      // Top 5 Provincias
      const provinciaCount: { [key: string]: number } = {}
      data.forEach((i) => {
        const prov = i.provincia || "Sin especificar"
        provinciaCount[prov] = (provinciaCount[prov] || 0) + 1
      })
      const provinciaData = Object.entries(provinciaCount)
        .map(([provincia, count]) => ({ provincia, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Tendencia acumulada
      const sorted = [...data].sort(
        (a, b) => new Date(a.fechaInscripcion).getTime() - new Date(b.fechaInscripcion).getTime()
      )
      let acum = 0
      const tendenciaAgrupada: { [key: string]: number } = {}
      sorted.forEach((i) => {
        acum++
        tendenciaAgrupada[new Date(i.fechaInscripcion).toLocaleDateString("es-AR")] = acum
      })
      const tendenciaData = Object.entries(tendenciaAgrupada).map(([fecha, total]) => ({ fecha, total }))

      // Radar
      const confirmadas = data.filter((i) => i.estado === "confirmada").length
      const pend = data.filter((i) => i.estado === "pendiente").length
      const total = data.length || 1
      const radarData = [
        { metric: "Confirmadas", value: (confirmadas / total) * 100 },
        { metric: "Pendientes", value: (pend / total) * 100 },
        { metric: "Tasa Conv.", value: (confirmadas / total) * 100 },
        { metric: "Participación", value: (total / 200) * 100 },
        { metric: "Engagement", value: Math.min(((confirmadas + pend) / total) * 100, 100) },
      ]

      return { chartData, estadoData, categoriaData, provinciaData, tendenciaData, radarData }
    }, [inscripciones])

  return (
    <>
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
              Crecimiento Acumulado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="total" stroke="#fbbf24" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-yellow-400" />
              Distribución por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={estadoData} cx="50%" cy="50%" labelLine={false} label={(e) => `${e.name}: ${e.value}`} outerRadius={100} dataKey="value">
                  {estadoData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-400" />
              Inscripciones Diarias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: "12px" }} />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="inscripciones" stroke="#fbbf24" strokeWidth={3} dot={{ fill: "#fbbf24", r: 5 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              Distribución por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoriaData} cx="50%" cy="50%" labelLine={false} label={(e) => `${e.name}: ${e.value}`} outerRadius={100} dataKey="value">
                  {categoriaData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-yellow-400" />
              Top 5 Provincias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={provinciaData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="provincia" type="category" stroke="#9ca3af" width={100} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#fbbf24" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-yellow-400" />
              Métricas de Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="metric" stroke="#9ca3af" />
                <PolarRadiusAxis stroke="#9ca3af" />
                <Radar name="Rendimiento" dataKey="value" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.6} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de Ingresos */}
      <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Análisis Financiero Detallado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={[
                { name: "Confirmadas", ingresos: ingresosConfirmados, inscripciones: aprobadas.length },
                { name: "Pendientes", ingresos: ingresosPotenciales, inscripciones: pendientes.length },
                { name: "Total Potencial", ingresos: ingresosConfirmados + ingresosPotenciales, inscripciones: aprobadas.length + pendientes.length },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => `$${value.toLocaleString("es-AR")}`} />
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

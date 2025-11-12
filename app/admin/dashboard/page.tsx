"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, onSnapshot, orderBy, getDocs, where, doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, Clock, CheckCircle, LogOut, DollarSign, TrendingUp, 
  Calendar, MapPin, Award, Activity, User, Mail, Phone 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "firebase/auth"
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

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [chartData, setChartData] = useState<any[]>([])
  const [estadoData, setEstadoData] = useState<any[]>([])
  const [categoriaData, setCategoriaData] = useState<any[]>([])
  const [provinciaData, setProvinciaData] = useState<any[]>([])
  const [tendenciaData, setTendenciaData] = useState<any[]>([])
  const [radarData, setRadarData] = useState<any[]>([])

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login?returnUrl=/admin/dashboard")
      } else {
        try {
          const adminRef = collection(db, "administrador")
          const adminQuery = query(adminRef, where("email", "==", user.email))
          const adminSnapshot = await getDocs(adminQuery)

          if (!adminSnapshot.empty) {
            const adminData = adminSnapshot.docs[0].data()

            if (adminData.role === "admin" || adminData.role === "grandteam") {
              setIsAuthorized(true)
              setUser(user)
            } else {
              router.push("/")
            }
          } else {
            router.push("/")
          }
        } catch (error) {
          console.error("Error verificando permisos:", error)
          router.push("/")
        }
      }
    })
    return () => unsubscribe()
  }, [router])

  useEffect(() => {
  if (!user) return

  const q = query(collection(db, "inscripciones"), orderBy("fechaInscripcion", "desc"))
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    setInscripciones(data)
    
    // Procesar datos para gráficos
    procesarDatosGraficos(data)
    
    setLoading(false)
  })

  return () => unsubscribe()
}, [user])

  const procesarDatosGraficos = (data: any[]) => {
    // Inscripciones por fecha
    const dateCount: { [key: string]: number } = {}
    data.forEach((inscripcion) => {
      if (inscripcion.fechaInscripcion) {
        const date = new Date(inscripcion.fechaInscripcion).toLocaleDateString("es-AR")
        dateCount[date] = (dateCount[date] || 0) + 1
      }
    })

    const chartData = Object.entries(dateCount)
      .map(([date, count]) => ({
        date,
        inscripciones: count,
      }))
      .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime())
    setChartData(chartData)

    // Estado de inscripciones
    const estadoCount = {
      pendiente: data.filter((i) => i.estado === "pendiente").length,
      confirmada: data.filter((i) => i.estado === "confirmada").length,
      rechazada: data.filter((i) => i.estado === "rechazada").length,
    }
    setEstadoData([
      { name: "Pendiente", value: estadoCount.pendiente, color: "#f59e0b" },
      { name: "Confirmada", value: estadoCount.confirmada, color: "#10b981" },
      { name: "Rechazada", value: estadoCount.rechazada, color: "#ef4444" },
    ])

    // Categorías
    const categoriaCount: { [key: string]: number } = {}
    data.forEach((inscripcion) => {
      const categoria = inscripcion.categoria || "Sin categoría"
      categoriaCount[categoria] = (categoriaCount[categoria] || 0) + 1
    })
    const categoriaArray = Object.entries(categoriaCount).map(([name, value]) => ({
      name,
      value,
      color: ['#fbbf24', '#f59e0b', '#d97706', '#b45309'][Object.keys(categoriaCount).indexOf(name) % 4]
    }))
    setCategoriaData(categoriaArray)

    // Top 5 Provincias
    const provinciaCount: { [key: string]: number } = {}
    data.forEach((inscripcion) => {
      const provincia = inscripcion.provincia || "Sin especificar"
      provinciaCount[provincia] = (provinciaCount[provincia] || 0) + 1
    })
    const provinciaArray = Object.entries(provinciaCount)
      .map(([provincia, count]) => ({ provincia, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    setProvinciaData(provinciaArray)

    // Tendencia acumulada
    const sortedByDate = [...data].sort((a, b) => 
      new Date(a.fechaInscripcion).getTime() - new Date(b.fechaInscripcion).getTime()
    )
    let acumulado = 0
    const tendencia = sortedByDate.map((inscripcion, index) => {
      acumulado++
      return {
        fecha: new Date(inscripcion.fechaInscripcion).toLocaleDateString("es-AR"),
        total: acumulado,
      }
    })
    // Agrupar por fecha
    const tendenciaAgrupada: { [key: string]: number } = {}
    tendencia.forEach(item => {
      tendenciaAgrupada[item.fecha] = item.total
    })
    const tendenciaFinal = Object.entries(tendenciaAgrupada).map(([fecha, total]) => ({
      fecha,
      total
    }))
    setTendenciaData(tendenciaFinal)

    // Radar Chart - Métricas
    const confirmadas = data.filter(i => i.estado === "confirmada").length
    const pendientes = data.filter(i => i.estado === "pendiente").length
    const total = data.length
    
    setRadarData([
      { metric: "Confirmadas", value: (confirmadas / total) * 100 },
      { metric: "Pendientes", value: (pendientes / total) * 100 },
      { metric: "Tasa Conv.", value: (confirmadas / total) * 100 },
      { metric: "Participación", value: (total / 200) * 100 }, // Asumiendo meta de 200
      { metric: "Engagement", value: Math.min(((confirmadas + pendientes) / total) * 100, 100) },
    ])
  }

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/")
  }

  const pendientes = inscripciones.filter((i) => i.estado === "pendiente")
  const aprobadas = inscripciones.filter((i) => i.estado === "confirmada")
  const rechazadas = inscripciones.filter((i) => i.estado === "rechazada")
  const ingresosConfirmados = aprobadas.length * 40000
  const ingresosPotenciales = pendientes.length * 40000

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center">
        <div className="text-yellow-400 text-lg animate-pulse">Cargando Dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black pt-20">
      {/* Header */}
      <div className="border-b border-yellow-400/20 bg-black/50 backdrop-blur-sm sticky top-20 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white">
                Dashboard <span className="gradient-text">Grand Team Bike 2026</span>
              </h1>
              <p className="text-sm text-gray-400 mt-1">Análisis completo y métricas en tiempo real</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-yellow-900/20 border-yellow-400/30 hover:border-yellow-400/60 transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Inscripciones</CardTitle>
              <Users className="w-5 h-5 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-white">{inscripciones.length}</div>
              <p className="text-xs text-gray-500 mt-1">Participantes registrados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-900/20 border-amber-400/30 hover:border-amber-400/60 transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Pendientes</CardTitle>
              <Clock className="w-5 h-5 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-amber-400">{pendientes.length}</div>
              <p className="text-xs text-gray-500 mt-1">Esperando confirmación</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-green-900/20 border-green-400/30 hover:border-green-400/60 transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Confirmadas</CardTitle>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-green-500">{aprobadas.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {inscripciones.length > 0 ? ((aprobadas.length / inscripciones.length) * 100).toFixed(1) : 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-900/20 border-emerald-400/30 hover:border-emerald-400/60 transition-all duration-300 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Ingresos Confirmados</CardTitle>
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-emerald-500">
                ${(ingresosConfirmados / 1000).toFixed(0)}k
              </div>
              <p className="text-xs text-gray-500 mt-1">
                +${(ingresosPotenciales / 1000).toFixed(0)}k potenciales
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards - Secundarias */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Tasa de Conversión</CardTitle>
              <TrendingUp className="w-4 h-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-yellow-400">
                {inscripciones.length > 0 ? ((aprobadas.length / inscripciones.length) * 100).toFixed(1) : 0}%
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 mt-2">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-amber-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${inscripciones.length > 0 ? (aprobadas.length / inscripciones.length) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Rechazadas</CardTitle>
              <Activity className="w-4 h-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-red-400">{rechazadas.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {inscripciones.length > 0 ? ((rechazadas.length / inscripciones.length) * 100).toFixed(1) : 0}% del total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Ingreso Promedio</CardTitle>
              <Award className="w-4 h-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-green-400">$40k</div>
              <p className="text-xs text-gray-500 mt-1">Por participante confirmado</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Tendencia Acumulada */}
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
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="fecha" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#1f2937", 
                      border: "1px solid #fbbf24",
                      borderRadius: "8px"
                    }} 
                  />
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
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={estadoData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {estadoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#1f2937", 
                      border: "1px solid #fbbf24",
                      borderRadius: "8px"
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Inscripciones por fecha - Line */}
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
                  <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#1f2937", 
                      border: "1px solid #fbbf24",
                      borderRadius: "8px"
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="inscripciones" 
                    stroke="#fbbf24" 
                    strokeWidth={3}
                    dot={{ fill: '#fbbf24', r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Categorías - Pie */}
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
                  <Pie
                    data={categoriaData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoriaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#1f2937", 
                      border: "1px solid #fbbf24",
                      borderRadius: "8px"
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Provincias - Bar */}
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
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#1f2937", 
                      border: "1px solid #fbbf24",
                      borderRadius: "8px"
                    }} 
                  />
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
              <ResponsiveContainer width="100%" height={300}>
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
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#1f2937", 
                      border: "1px solid #fbbf24",
                      borderRadius: "8px"
                    }} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Resumen de Ingresos - Bar Chart Grande */}
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
                  {
                    name: "Confirmadas",
                    ingresos: ingresosConfirmados,
                    inscripciones: aprobadas.length,
                  },
                  {
                    name: "Pendientes",
                    ingresos: ingresosPotenciales,
                    inscripciones: pendientes.length,
                  },
                  {
                    name: "Total Potencial",
                    ingresos: ingresosConfirmados + ingresosPotenciales,
                    inscripciones: aprobadas.length + pendientes.length,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#1f2937", 
                    border: "1px solid #fbbf24",
                    borderRadius: "8px"
                  }}
                  formatter={(value: any) => `$${value.toLocaleString("es-AR")}`}
                />
                <Legend />
                <Bar dataKey="ingresos" fill="#10b981" name="Ingresos ($)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="inscripciones" fill="#fbbf24" name="Inscripciones" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Últimas Inscripciones */}
        <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-yellow-400" />
              Últimas 5 Inscripciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inscripciones.slice(0, 5).map((inscripcion, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-yellow-400/10 hover:border-yellow-400/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-black font-bold">
                      {inscripcion.nombre?.charAt(0)}{inscripcion.apellido?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {inscripcion.nombre} {inscripcion.apellido}
                      </p>
                      <p className="text-gray-400 text-sm flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        {inscripcion.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      inscripcion.estado === "confirmada" 
                        ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                        : inscripcion.estado === "pendiente"
                        ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}>
                      {inscripcion.estado?.toUpperCase()}
                    </span>
                    <p className="text-gray-500 text-xs mt-1">
                      {inscripcion.categoria}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
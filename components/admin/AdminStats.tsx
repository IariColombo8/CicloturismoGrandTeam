"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CheckCircle, Clock, DollarSign } from "lucide-react"

interface AdminStatsProps {
  totalInscripciones: number
  aprobadas: number
  pendientes: number
  ingresos?: number // Hacerlo opcional
}

export default function AdminStats({ 
  totalInscripciones = 0, 
  aprobadas = 0, 
  pendientes = 0, 
  ingresos = 0 
}: AdminStatsProps) {
  const stats = [
    {
      title: "Total Inscripciones",
      value: totalInscripciones,
      description: "Participantes totales",
      icon: Users,
      gradient: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600"
    },
    {
      title: "Confirmadas",
      value: aprobadas,
      description: "Confirmados para el evento",
      icon: CheckCircle,
      gradient: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600"
    },
    {
      title: "Pendientes",
      value: pendientes,
      description: "Esperando revisión",
      icon: Clock,
      gradient: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600"
    },
    {
      title: "Ingresos",
      value: `$${(ingresos || 0).toLocaleString('es-AR')}`,
      description: "De inscripciones confirmadas",
      icon: DollarSign,
      gradient: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600"
    }
  ]

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.title} className="animate-fade-in">
            <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all duration-300 h-full">
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${stat.gradient}`}></div>
              <CardHeader className="pb-2 px-4 pt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </CardTitle>
                  </div>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {stat.value}
                  </div>
                  <p className="text-xs text-gray-500">
                    {stat.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
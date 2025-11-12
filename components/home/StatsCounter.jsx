"use client"

import { useEffect, useState } from "react"
import { Users, MapPin, Award, Bike } from "lucide-react"

function useCountUp(end, duration = 2000) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const increment = end / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [end, duration])

  return count
}

export default function StatsCounter() {
  const stats = [
    {
      icon: Users,
      value: 1247,
      suffix: "+",
      label: "Ciclistas Registrados",
      color: "from-yellow-400 to-yellow-600",
    },
    {
      icon: MapPin,
      value: 300,
      suffix: "km",
      label: "Recorrido Total",
      color: "from-amber-400 to-orange-600",
    },
    {
      icon: Award,
      value: 98,
      suffix: "%",
      label: "Tasa de Satisfacción",
      color: "from-yellow-300 to-amber-500",
    },
    {
      icon: Bike,
      value: 5,
      suffix: "+",
      label: "Años de Experiencia",
      color: "from-yellow-500 to-yellow-700",
    },
  ]

  return (
    <section className="py-20 bg-black relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.1),transparent_70%)]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Nuestros <span className="gradient-text">Números</span>
          </h2>
          <p className="text-lg text-gray-400">Estadísticas que hablan por sí solas</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <StatCard key={index} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  )
}

function StatCard({ stat }) {
  const count = useCountUp(stat.value)

  return (
    <div className="glass p-8 rounded-2xl text-center group hover:scale-105 transition-all duration-300 border border-yellow-400/20 hover:border-yellow-400/50">
      <div
        className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br ${stat.color} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}
      >
        <stat.icon className="w-8 h-8 text-black" />
      </div>
      <div className={`text-5xl font-black mb-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
        {count}
        {stat.suffix}
      </div>
      <div className="text-gray-400 font-medium">{stat.label}</div>
    </div>
  )
}

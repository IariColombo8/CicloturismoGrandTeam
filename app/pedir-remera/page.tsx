"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import RemeroFormModal from "@/components/remera/RemeroFormModal"
import { Shirt, Truck, CreditCard, BadgeCheck, Ruler } from "lucide-react"

const TALLES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"]

const BENEFICIOS = [
  {
    icon: BadgeCheck,
    titulo: "Remera oficial",
    detalle: "Diseño exclusivo del evento Grand Team Bike 2026.",
  },
  {
    icon: Ruler,
    titulo: "Todos los talles",
    detalle: "Desde XS hasta 5XL para que le quede bien a todos.",
  },
  {
    icon: Truck,
    titulo: "Retiro o envío",
    detalle: "Retirala en el evento o recibila en tu domicilio.",
  },
  {
    icon: CreditCard,
    titulo: "Pago simple",
    detalle: "Coordinás el pago por transferencia y adjuntás el comprobante.",
  },
]

export default function PedirRemeraPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      {/* Glow decorativo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-yellow-400/10 blur-[120px]" />

      <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
        {/* Encabezado */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-sm font-medium mb-5">
            <Shirt className="w-4 h-4" />
            Merch oficial del evento
          </span>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
            Remera{" "}
            <span className="text-yellow-400">Grand Team Bike</span>
          </h1>
          <p className="text-lg text-zinc-400 mt-4 max-w-2xl mx-auto">
            Llevate la remera oficial de la edición 2026. Elegí tu talle, adjuntá el
            comprobante y el equipo coordina la entrega con vos.
          </p>
        </div>

        {/* Contenido principal: imagen + info */}
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Imagen de la remera */}
          <div className="relative">
            <div className="relative aspect-square rounded-3xl bg-gradient-to-b from-zinc-800/60 to-zinc-900/60 border border-white/10 overflow-hidden shadow-2xl">
              <Image
                src="/remera.png"
                alt="Remera oficial Grand Team Bike 2026"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-6"
              />
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-yellow-400 text-black text-xs font-bold shadow-lg">
                Edición 2026
              </div>
            </div>
          </div>

          {/* Info + CTA */}
          <div>
            {/* Beneficios */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {BENEFICIOS.map(({ icon: Icon, titulo, detalle }) => (
                <div
                  key={titulo}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-yellow-400/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-yellow-400" />
                  </div>
                  <h3 className="text-white font-semibold text-sm">{titulo}</h3>
                  <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{detalle}</p>
                </div>
              ))}
            </div>

            {/* Talles */}
            <div className="mb-8">
              <p className="text-zinc-300 font-semibold text-sm mb-3 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-yellow-400" />
                Talles disponibles
              </p>
              <div className="flex flex-wrap gap-2">
                {TALLES.map((talle) => (
                  <span
                    key={talle}
                    className="min-w-[3rem] text-center px-3 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-200 text-sm font-medium"
                  >
                    {talle}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={() => setModalOpen(true)}
              size="lg"
              className="w-full sm:w-auto bg-yellow-400 text-black hover:bg-yellow-500 font-bold text-lg px-10 h-14 shadow-lg shadow-yellow-400/20"
            >
              <Shirt className="w-5 h-5 mr-2" />
              Pedir mi remera
            </Button>
            <p className="text-zinc-500 text-xs mt-3">
              Si ya estás inscripto al evento, tus datos se completan automáticamente con tu DNI.
            </p>
          </div>
        </div>
      </div>

      <RemeroFormModal open={modalOpen} onOpenChange={setModalOpen} />
    </main>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import RemeroFormModal from "@/components/remera/RemeroFormModal"
import { Shirt } from "lucide-react"
import type { Metadata } from "next"

// Metadata se maneja en el layout, no en client components.
// Se agrega export metadata en un archivo separado si es necesario.

export default function PedirRemeraPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        {/* Icono */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
            <Shirt className="w-10 h-10 text-yellow-400" />
          </div>
        </div>

        {/* Título */}
        <h1 className="text-4xl sm:text-5xl font-bold text-yellow-400 mb-4">
          Remera Oficial
        </h1>
        <p className="text-lg text-zinc-400 mb-2">
          Grand Team Bike 2026
        </p>
        <p className="text-zinc-500 max-w-xl mx-auto mb-10">
          Pedí tu remera oficial del evento. Completá el formulario con tu DNI, elegí el talle y
          adjuntá el comprobante de pago. El equipo coordinará la entrega contigo.
        </p>

        {/* CTA */}
        <Button
          onClick={() => setModalOpen(true)}
          size="lg"
          className="bg-yellow-400 text-black hover:bg-yellow-500 font-bold text-lg px-10 h-14"
        >
          <Shirt className="w-5 h-5 mr-2" />
          Pedir mi remera
        </Button>

        {/* Info talles */}
        <div className="mt-12 text-left max-w-md mx-auto">
          <h2 className="text-white font-semibold mb-3 text-center">Talles disponibles</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"].map((talle) => (
              <span
                key={talle}
                className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm"
              >
                {talle}
              </span>
            ))}
          </div>
        </div>
      </div>

      <RemeroFormModal open={modalOpen} onOpenChange={setModalOpen} />
    </main>
  )
}

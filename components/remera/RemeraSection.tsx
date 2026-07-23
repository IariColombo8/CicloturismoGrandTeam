"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import RemeroFormModal from "@/components/remera/RemeroFormModal"
import { supabase } from "@/lib/supabase"
import { REMERA_CONTENT_DEFAULTS, mergeRemeraContent, type RemeraContentData } from "@/lib/remeraContent"
import {
  Shirt,
  BadgeCheck,
  Ruler,
  Tag,
  Maximize2,
  Truck,
  CreditCard,
  Package,
  MapPin,
  CheckCircle,
  Star,
  Heart,
  Award,
  Clock,
  Users,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

const FEATURE_ICONS: Record<string, LucideIcon> = {
  BadgeCheck,
  Ruler,
  Truck,
  CreditCard,
  Shirt,
  Tag,
  Package,
  MapPin,
  CheckCircle,
  Star,
  Heart,
  Award,
  Clock,
  Users,
  ShieldCheck,
}

// Sección pública "Pedir Remera": se usa tanto en el home (debajo de "Sobre
// Nosotros") como en la página standalone /pedir-remera, con el mismo
// contenido y el mismo comportamiento (un solo click abre el formulario).
export default function RemeraSection() {
  const [contenido, setContenido] = useState<RemeraContentData>(REMERA_CONTENT_DEFAULTS)
  const [modalOpen, setModalOpen] = useState(false)
  const [sizeChartOpen, setSizeChartOpen] = useState(false)

  useEffect(() => {
    supabase
      .from("content_settings")
      .select("data")
      .eq("id", "remera")
      .maybeSingle()
      .then(({ data }) => {
        setContenido(mergeRemeraContent(data?.data as Partial<RemeraContentData>))
      })
  }, [])

  return (
    <section
      id="pedir-remera"
      className="py-section bg-gradient-to-b from-black via-zinc-900 to-black relative overflow-hidden section-divider-top"
    >
      <div className="pointer-events-none absolute -bottom-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-yellow-400/10 blur-[120px]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Encabezado */}
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-sm font-medium mb-5">
            <Shirt className="w-4 h-4" />
            {contenido.badgeText}
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">{contenido.title}</h2>
          <p className="text-lg text-zinc-400 mt-4 max-w-2xl mx-auto">{contenido.description}</p>
          {contenido.price && (
            <p className="mt-5 inline-flex items-center gap-2 text-2xl font-bold text-yellow-400">
              <Tag className="w-5 h-5" />
              {contenido.price}
            </p>
          )}
        </div>

        {/* Contenido principal: imagen + info */}
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Imagen de la remera */}
          <div className="relative">
            <div className="relative aspect-square max-w-md mx-auto rounded-3xl bg-gradient-to-b from-zinc-800/60 to-zinc-900/60 border border-white/10 overflow-hidden shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL arbitraria cargada desde el admin, no un dominio conocido de antemano */}
              <img
                src={contenido.imageUrl}
                alt={contenido.title}
                className="absolute inset-0 w-full h-full object-contain p-6"
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
              {contenido.features.map((feat) => {
                const Icon = (feat.icon && FEATURE_ICONS[feat.icon]) || BadgeCheck
                return (
                  <div
                    key={feat.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-yellow-400/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-yellow-400" />
                    </div>
                    <h3 className="text-white font-semibold text-sm">{feat.title}</h3>
                    <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{feat.description}</p>
                  </div>
                )
              })}
            </div>

            {/* Talles */}
            <div className="mb-4">
              <p className="text-zinc-300 font-semibold text-sm mb-3 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-yellow-400" />
                Talles disponibles
              </p>
              <div className="flex flex-wrap gap-2">
                {contenido.talles.map((talle) => (
                  <span
                    key={talle}
                    className="min-w-[3rem] text-center px-3 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-200 text-sm font-medium"
                  >
                    {talle}
                  </span>
                ))}
              </div>
            </div>

            {contenido.sizeChartImageUrl && (
              <button
                type="button"
                onClick={() => setSizeChartOpen(true)}
                className="inline-flex items-center gap-1.5 text-yellow-400 text-sm font-medium hover:underline mb-6"
              >
                <Maximize2 className="w-4 h-4" />
                Ver tabla de talles
              </button>
            )}

            {/* CTA */}
            <div>
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
      </div>

      <RemeroFormModal open={modalOpen} onOpenChange={setModalOpen} />

      <Dialog open={sizeChartOpen} onOpenChange={setSizeChartOpen}>
        <DialogContent className="bg-zinc-900 border-yellow-400/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Tabla de talles</DialogTitle>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={contenido.sizeChartImageUrl}
            alt="Tabla de talles"
            className="w-full rounded-lg border border-zinc-700"
          />
        </DialogContent>
      </Dialog>
    </section>
  )
}

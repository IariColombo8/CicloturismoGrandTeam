"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { Check, Pencil, RefreshCw, X } from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { usePanorama, type Alcance } from "./usePanorama"
import { SeccionPlata } from "./SeccionPlata"
import { SeccionGente } from "./SeccionGente"
import { SeccionExtra } from "./SeccionExtra"

/**
 * Dashboard del panel.
 *
 * Tres bloques: plata (los mismos numeros que /admin/gastos), inscripciones y
 * gente (salud, grupos, procedencia, edades) y lo que hace falta mirar aparte
 * (ritmo, remeras, ultimas altas).
 *
 * Todo se calcula sobre las filas de la edicion. La version anterior pedia
 * conteos sueltos y las ultimas 5 inscripciones, y con esas 5 filas dibujaba
 * los graficos de "todo el evento": los grupos, las localidades y el
 * crecimiento acumulado nunca coincidian con el registro.
 */
export default function AdminDashboard() {
  const router = useRouter()
  const { user, userRole, loading: authLoading, eventSettings } = useSupabaseContext()

  const [alcance, setAlcance] = useState<Alcance>("todos")
  const [precioEntrada, setPrecioEntrada] = useState(0)
  const [editandoPrecio, setEditandoPrecio] = useState(false)
  const [precioTemp, setPrecioTemp] = useState("")

  const isAuthorized = userRole === "admin" || userRole === "grandteam"

  const { personas, panorama, remeras, cargando, error, recargar } = usePanorama(
    alcance,
    isAuthorized && !!user,
  )

  // Redirigir si no esta autorizado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?returnUrl=/admin/dashboard")
    } else if (!authLoading && user && !isAuthorized) {
      router.push("/")
    }
  }, [authLoading, user, isAuthorized, router])

  useEffect(() => {
    if (eventSettings?.precio) setPrecioEntrada(Number(eventSettings.precio))
  }, [eventSettings])

  const guardarPrecio = async () => {
    const nuevo = parseInt(precioTemp) || 0
    if (nuevo <= 0) return
    setPrecioEntrada(nuevo)
    setEditandoPrecio(false)

    await supabase.from("event_settings").update({ precio: nuevo }).eq("id", "eventSettings")

    // El provider cachea event_settings en sessionStorage: hay que invalidarlo
    // o el precio viejo vuelve en la proxima carga.
    try {
      sessionStorage.removeItem("event_settings_cache")
    } catch {}
  }

  if (authLoading || (!userRole && cargando)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center">
        <div className="text-yellow-400 text-lg animate-pulse">Cargando Dashboard...</div>
      </div>
    )
  }

  if (!isAuthorized) return null

  const cupo = Number(eventSettings?.cupoMaximo) || 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black pt-20">
      {/* Cabecera */}
      <div className="border-b border-yellow-400/20 bg-black/60 backdrop-blur-sm sticky top-20 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-white leading-tight">
                Dashboard <span className="gradient-text">Grand Team Bike</span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Edición 2026 · {personas.length} inscripciones cargadas · se actualiza en tiempo real
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Precio de la inscripcion: entra en todos los calculos de plata,
                  asi que se edita desde aca mismo. */}
              <div className="rounded-lg border border-yellow-400/30 bg-black/40 px-3 py-1.5">
                <p className="text-[10px] uppercase tracking-wide text-gray-500 leading-none mb-1">
                  Precio inscripción
                </p>
                {editandoPrecio ? (
                  <div className="flex items-center gap-1">
                    <span className="text-green-400 font-black text-sm">$</span>
                    <input
                      type="number"
                      value={precioTemp}
                      onChange={(e) => setPrecioTemp(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && guardarPrecio()}
                      autoFocus
                      className="w-24 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-white text-sm font-black focus:outline-none focus:border-green-400"
                    />
                    <button onClick={guardarPrecio} className="text-green-400 hover:text-green-300 p-0.5">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditandoPrecio(false)} className="text-zinc-500 hover:text-zinc-300 p-0.5">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setPrecioTemp(String(precioEntrada))
                      setEditandoPrecio(true)
                    }}
                    className="flex items-center gap-1.5 group"
                    title="Click para editar el precio"
                  >
                    <span className="text-sm sm:text-base font-black text-green-400 tabular-nums">
                      {formatCurrency(precioEntrada)}
                    </span>
                    <Pencil className="w-3 h-3 text-zinc-600 group-hover:text-yellow-400 transition-colors" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => recargar()}
                className="rounded-lg border border-yellow-400/30 p-2 text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                title="Volver a cargar los datos"
              >
                <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {error && (
          <p className="mb-6 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            No se pudieron cargar las inscripciones: {error}
          </p>
        )}

        {/* 1 · Plata */}
        <SeccionPlata precio={precioEntrada} habilitado={isAuthorized && !!user} />

        {/* 2 · Inscripciones y gente */}
        <SeccionGente
          panorama={panorama}
          cupo={cupo}
          alcance={alcance}
          onCambiarAlcance={setAlcance}
          cargando={cargando}
        />

        {/* 3 · Lo que no entra en los dos bloques anteriores */}
        <SeccionExtra panorama={panorama} personas={personas} remeras={remeras} cargando={cargando} />
      </div>
    </div>
  )
}

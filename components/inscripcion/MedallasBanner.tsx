"use client"

import { Medal, AlertTriangle, XCircle } from "lucide-react"
import { useMedallasRestantes } from "@/hooks/useMedallasRestantes"

/** Por debajo de este umbral se muestra el aviso de "quedan pocas medallas". */
const UMBRAL_POCAS = 30

export default function MedallasBanner() {
  const { limiteMedallas, ocupados, disponibles, hayDatos } = useMedallasRestantes()

  if (!hayDatos || disponibles === null || ocupados === null) {
    return (
      <div className="bg-zinc-900/60 border border-yellow-400/20 rounded-lg p-4 mb-6 flex items-center gap-3">
        <Medal className="w-6 h-6 text-yellow-400 flex-shrink-0" />
        <p className="text-sm text-gray-300">
          Las primeras <strong className="text-white">{limiteMedallas}</strong> inscripciones reciben medalla
          de finisher.
        </p>
      </div>
    )
  }

  const progreso = Math.min((ocupados / limiteMedallas) * 100, 100)

  if (disponibles <= 0) {
    return (
      <div className="bg-red-500/15 border-2 border-red-500/60 rounded-lg p-4 mb-6 flex gap-3">
        <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm sm:text-base font-black text-red-200 uppercase">No hay más medallas disponibles</p>
          <p className="text-xs sm:text-sm text-red-200/80 mt-1">
            Ya se alcanzaron las {limiteMedallas} medallas garantizadas para esta edición. Podés inscribirte
            igual y participar del evento con normalidad, pero tu inscripción no incluirá medalla de finisher.
          </p>
        </div>
      </div>
    )
  }

  if (disponibles <= UMBRAL_POCAS) {
    return (
      <div className="bg-orange-500/15 border-2 border-orange-500/60 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm sm:text-base font-black text-orange-200 uppercase">¡Quedan pocas medallas!</p>
            <p className="text-xs sm:text-sm text-orange-200/80 mt-1">
              Solo quedan <strong>{disponibles}</strong> de las {limiteMedallas} medallas garantizadas.
              No te quedes sin la tuya, inscribite ahora.
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-black/40 overflow-hidden">
          <div className="h-full rounded-full bg-orange-400 transition-all" style={{ width: `${progreso}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 mb-6">
      <div className="flex gap-3">
        <Medal className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-200">
          Hasta la inscripción <strong className="text-yellow-400">{limiteMedallas}</strong> tenés medalla
          de finisher garantizada. Quedan{" "}
          <strong className="text-yellow-400">{disponibles} medallas</strong> disponibles.{" "}
          <span className="font-semibold">¡No te quedes sin tu medalla!</span>
        </p>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-black/30 overflow-hidden">
        <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: `${progreso}%` }} />
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Building2, Check, Copy, CreditCard, Landmark, User } from "lucide-react"
import {
  cbuLegible,
  textoCompleto,
  tieneDatos,
  type DatosTransferencia,
} from "@/lib/transferencia"

interface DatosTransferenciaCardProps {
  datos: DatosTransferencia
  /** Mensaje mientras todavia no cargaron los datos del evento. */
  mensajeVacio?: string
  className?: string
}

/** Copia al portapapeles, con respaldo para navegadores sin la API moderna. */
async function copiar(texto: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto)
    return
  }
  const ta = document.createElement("textarea")
  ta.value = texto
  ta.style.position = "fixed"
  ta.style.left = "-9999px"
  document.body.appendChild(ta)
  ta.select()
  document.execCommand("copy")
  document.body.removeChild(ta)
}

/**
 * Datos de la cuenta para transferir, con un boton de copiar en cada dato.
 *
 * Antes era un parrafo de texto con un solo "copiar todo": en el celular habia
 * que seleccionar a mano el CBU del medio de un bloque. Ahora cada dato se
 * copia solo y el CBU se muestra en grupos de 4 para poder chequearlo.
 */
export default function DatosTransferenciaCard({
  datos,
  mensajeVacio = "Cargando datos de transferencia...",
  className = "",
}: DatosTransferenciaCardProps) {
  const [copiado, setCopiado] = useState<string | null>(null)

  const copiarDato = async (texto: string, clave: string) => {
    if (!texto) return
    try {
      await copiar(texto)
      setCopiado(clave)
      setTimeout(() => setCopiado((c) => (c === clave ? null : c)), 1800)
    } catch (err) {
      console.error("Error copiando al portapapeles:", err)
    }
  }

  if (!tieneDatos(datos)) {
    return (
      <div
        className={`bg-zinc-900 border border-yellow-400/20 rounded-xl p-4 ${className}`}
      >
        <p className="text-gray-400 text-sm">{mensajeVacio}</p>
      </div>
    )
  }

  // El alias va primero y mas grande: es lo que usa casi todo el mundo.
  const filas = [
    { clave: "banco", etiqueta: "Banco", valor: datos.banco, icono: Landmark, copiable: false },
    {
      clave: "cbu",
      etiqueta: "CBU",
      valor: datos.cbu,
      mostrar: cbuLegible(datos.cbu),
      icono: CreditCard,
      copiable: true,
      mono: true,
    },
    { clave: "titular", etiqueta: "Titular", valor: datos.titular, icono: User, copiable: true },
  ].filter((f) => f.valor)

  const todo = textoCompleto(datos)

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-yellow-400/30 bg-gradient-to-br from-zinc-900 via-zinc-900 to-yellow-400/5 p-4 ${className}`}
    >
      {/* Brillo decorativo en la esquina */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-yellow-400/10 blur-2xl"
      />

      <div className="relative flex items-start justify-between gap-3 mb-3">
        <h4 className="text-white font-semibold flex items-center gap-2">
          <Building2 className="w-4 h-4 text-yellow-400" />
          Datos para transferir
        </h4>
        {todo && (
          <button
            type="button"
            onClick={() => copiarDato(todo, "todo")}
            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] font-semibold text-gray-300 transition-colors hover:border-yellow-400/40 hover:text-yellow-400"
          >
            {copiado === "todo" ? (
              <>
                <Check className="w-3 h-3" aria-hidden="true" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" aria-hidden="true" />
                Copiar todo
              </>
            )}
          </button>
        )}
      </div>

      {/* Alias: el dato estrella, grande y en amarillo */}
      {datos.alias && (
        <div className="relative mb-2 flex items-center justify-between gap-3 rounded-lg border border-yellow-400/40 bg-yellow-400/10 p-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-yellow-400/70">Alias</p>
            <p className="break-all text-lg font-bold text-yellow-400 sm:text-xl">{datos.alias}</p>
          </div>
          <button
            type="button"
            onClick={() => copiarDato(datos.alias, "alias")}
            aria-label="Copiar alias"
            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-yellow-400/50 px-3 py-2 text-xs font-bold text-yellow-400 transition-colors hover:bg-yellow-400 hover:text-black"
          >
            {copiado === "alias" ? (
              <>
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                Copiar
              </>
            )}
          </button>
        </div>
      )}

      {/* Resto de los datos, uno por fila */}
      <div className="relative space-y-2">
        {filas.map((fila) => {
          const Icono = fila.icono
          return (
            <div
              key={fila.clave}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-700/80 bg-black/40 p-2.5 transition-colors hover:border-yellow-400/30"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Icono className="h-4 w-4 flex-shrink-0 text-yellow-400/70" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">
                    {fila.etiqueta}
                  </p>
                  <p
                    className={`break-all text-sm font-semibold text-yellow-400 ${
                      fila.mono ? "font-mono tracking-wide" : ""
                    }`}
                  >
                    {fila.mostrar ?? fila.valor}
                  </p>
                </div>
              </div>
              {fila.copiable && (
                <button
                  type="button"
                  onClick={() => copiarDato(fila.valor, fila.clave)}
                  aria-label={`Copiar ${fila.etiqueta}`}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] font-semibold text-gray-300 transition-colors hover:border-yellow-400/40 hover:text-yellow-400"
                >
                  {copiado === fila.clave ? (
                    <>
                      <Check className="w-3 h-3" aria-hidden="true" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" aria-hidden="true" />
                      Copiar
                    </>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {datos.nota && <p className="relative mt-3 text-xs text-gray-400">{datos.nota}</p>}
    </div>
  )
}

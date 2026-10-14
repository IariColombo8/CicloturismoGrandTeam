"use client"

import { useState, type ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye } from "lucide-react"
import { ListaModal } from "@/app/admin/gastos/ListaModal"
import type { Conteo } from "./panorama"

/** Paletas de las tarjetas, para no repetir las clases de Tailwind. */
const TONOS = {
  dorado: { borde: "border-yellow-400/30", texto: "text-yellow-400", fondo: "to-yellow-900/20" },
  verde: { borde: "border-emerald-400/30", texto: "text-emerald-400", fondo: "to-emerald-900/20" },
  rojo: { borde: "border-red-400/30", texto: "text-red-400", fondo: "to-red-900/20" },
  ambar: { borde: "border-amber-400/30", texto: "text-amber-400", fondo: "to-amber-900/20" },
  azul: { borde: "border-sky-400/30", texto: "text-sky-400", fondo: "to-sky-900/20" },
  violeta: { borde: "border-violet-400/30", texto: "text-violet-400", fondo: "to-violet-900/20" },
  neutro: { borde: "border-zinc-700", texto: "text-white", fondo: "to-zinc-900" },
} as const

export type Tono = keyof typeof TONOS

interface TarjetaProps {
  titulo: string
  valor: ReactNode
  /** Linea chica debajo del numero: de donde sale o que significa. */
  detalle?: ReactNode
  /** Segunda linea, para avisos ("14 sin pagar"). */
  aviso?: ReactNode
  icono?: ReactNode
  tono?: Tono
  cargando?: boolean
  /** Titulo nativo, para ver el monto completo cuando el numero va abreviado. */
  title?: string
}

/** Tarjeta de un numero con su contexto. */
export function Tarjeta({
  titulo,
  valor,
  detalle,
  aviso,
  icono,
  tono = "neutro",
  cargando,
  title,
}: TarjetaProps) {
  const t = TONOS[tono]
  return (
    <Card
      className={`bg-gradient-to-br from-zinc-900 via-zinc-900 ${t.fondo} ${t.borde} transition-colors`}
      title={title}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-1 p-3 sm:p-4">
        <CardTitle className="text-[11px] sm:text-xs font-medium text-gray-400 leading-tight">
          {titulo}
        </CardTitle>
        {icono}
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        {cargando ? (
          <div className="h-7 w-16 bg-zinc-800 rounded animate-pulse" />
        ) : (
          <div className={`text-xl sm:text-2xl font-black tabular-nums ${t.texto} truncate`}>{valor}</div>
        )}
        {detalle && <p className="text-[11px] text-gray-500 mt-1 leading-snug">{detalle}</p>}
        {aviso && <p className="text-[11px] text-orange-400 mt-0.5 leading-snug">{aviso}</p>}
      </CardContent>
    </Card>
  )
}

interface SeccionProps {
  titulo: string
  /** Que mira esta seccion y de donde sale el dato. */
  bajada?: string
  icono?: ReactNode
  acciones?: ReactNode
  children: ReactNode
}

/** Bloque del dashboard con su titulo y una bajada que explica el dato. */
export function Seccion({ titulo, bajada, icono, acciones, children }: SeccionProps) {
  return (
    <section className="mb-8 sm:mb-12">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3 sm:mb-4 pb-2 border-b border-yellow-400/20">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
            {icono}
            {titulo}
          </h2>
          {bajada && <p className="text-xs text-gray-500 mt-0.5">{bajada}</p>}
        </div>
        {acciones}
      </div>
      {children}
    </section>
  )
}

/** Caja contenedora con titulo, para tablas y graficos. */
export function Panel({
  titulo,
  bajada,
  icono,
  children,
  className = "",
}: {
  titulo: string
  bajada?: string
  icono?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={`bg-black/50 border-yellow-400/20 backdrop-blur-sm ${className}`}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-sm sm:text-base">
          {icono}
          {titulo}
        </CardTitle>
        {bajada && <p className="text-xs text-gray-500">{bajada}</p>}
      </CardHeader>
      <CardContent className="p-4 pt-2">{children}</CardContent>
    </Card>
  )
}

/**
 * Fila "etiqueta — cantidad — ver".
 *
 * Los nombres nunca van escritos en la fila: con 16 celiacos o 20 grupos la
 * fila se volvia ilegible. La fila dice cuantos son y el boton abre la lista.
 */
export function FilaConteo({
  conteo,
  total,
  tituloModal,
  descripcionModal,
  destacar,
}: {
  conteo: Conteo
  /** Para la barrita de proporcion. Si no se pasa, no se dibuja. */
  total?: number
  tituloModal?: string
  descripcionModal?: string
  /** Resalta la fila cuando el dato pide atencion (menores, salud). */
  destacar?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const porcentaje = total && total > 0 ? (conteo.cantidad / total) * 100 : 0

  return (
    <>
      <div className="flex items-center gap-3 py-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm truncate ${destacar && conteo.cantidad > 0 ? "text-orange-300" : "text-gray-300"}`}>
              {conteo.label}
            </span>
            <span className="text-sm font-bold text-white tabular-nums flex-shrink-0">{conteo.cantidad}</span>
          </div>
          {total != null && (
            <div className="w-full bg-zinc-800 rounded-full h-1 mt-1">
              <div
                className="bg-gradient-to-r from-yellow-400 to-amber-600 h-1 rounded-full transition-all"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          disabled={conteo.items.length === 0}
          className="flex-shrink-0 text-xs text-gray-500 hover:text-yellow-400 disabled:opacity-30 disabled:hover:text-gray-500 flex items-center gap-1 px-1.5 py-0.5 rounded"
          title={conteo.items.length === 0 ? "Sin nombres para mostrar" : "Ver quiénes son"}
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ver</span>
        </button>
      </div>

      <ListaModal
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={tituloModal ?? conteo.label}
        descripcion={descripcionModal ?? `${conteo.cantidad} ${conteo.cantidad === 1 ? "persona" : "personas"}`}
        items={conteo.items}
      />
    </>
  )
}

/** Dato suelto en una grilla compacta: etiqueta arriba, numero abajo. */
export function Dato({ label, valor, tono = "neutro" }: { label: string; valor: ReactNode; tono?: Tono }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
      <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
      <p className={`text-base sm:text-lg font-black tabular-nums ${TONOS[tono].texto}`}>{valor}</p>
    </div>
  )
}

/** Cartel para cuando todavia no hay datos que mostrar. */
export function SinDatos({ texto }: { texto: string }) {
  return <p className="text-sm text-gray-500 py-6 text-center">{texto}</p>
}

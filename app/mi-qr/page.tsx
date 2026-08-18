"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import Navbar from "@/components/layout/Navbar"
import { EVENTO } from "@/lib/constants"
import { descargarQRDesdeSVG, nombreArchivoQR } from "@/lib/descargarQR"
import {
  describirEntrega,
  describirEntregaRemera,
  esDniValido,
  muestraEstadoEntrega,
  normalizarDni,
  presentarEstado,
  resumirTalles,
  totalRemeras,
  type RemeraItem,
} from "@/lib/miInscripcion"
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  MapPin,
  MessageCircle,
  QrCode,
  Search,
  Shirt,
  Truck,
  XCircle,
} from "lucide-react"

const GRUPO_WHATSAPP = "https://chat.whatsapp.com/LwCX4X2i7eG0ENJvA4TjHS"
const MAPA_EVENTO = "https://maps.app.goo.gl/ok3ytmh5SFYBfgZp8"

type Respuesta = {
  encontrada: boolean
  inscripcion?: {
    nombre: string
    apellido: string
    estado: string
    numeroInscripcion: number | null
    tokenQR: string | null
  }
  remera?: {
    items: RemeraItem[]
    envioTipo: string | null
    estado: string | null
    entregado: boolean
    ciudad: string | null
  } | null
}

const TONOS = {
  verde: {
    borde: "border-green-500/40",
    fondo: "from-green-500/15 to-emerald-600/5",
    texto: "text-green-400",
    chip: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  amarillo: {
    borde: "border-yellow-400/40",
    fondo: "from-yellow-400/15 to-amber-600/5",
    texto: "text-yellow-400",
    chip: "bg-yellow-400/15 text-yellow-400 border-yellow-400/30",
  },
  rojo: {
    borde: "border-red-500/40",
    fondo: "from-red-500/15 to-rose-600/5",
    texto: "text-red-400",
    chip: "bg-red-500/15 text-red-400 border-red-500/30",
  },
} as const

export default function MiQRPage() {
  const [dni, setDni] = useState("")
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState<Respuesta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const qrRef = useRef<HTMLDivElement>(null)

  const buscar = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault()
      if (!esDniValido(dni)) {
        setError("Ingresá tu DNI (7 u 8 dígitos).")
        setResultado(null)
        return
      }

      setBuscando(true)
      setError(null)
      setResultado(null)

      try {
        const res = await fetch(`/api/mi-inscripcion?dni=${encodeURIComponent(dni)}`)
        if (!res.ok) throw new Error("No pudimos buscar tu inscripción")
        setResultado((await res.json()) as Respuesta)
      } catch {
        setError("No pudimos buscar tu inscripción. Probá de nuevo en unos segundos.")
      } finally {
        setBuscando(false)
      }
    },
    [dni]
  )

  const inscripcion = resultado?.encontrada ? resultado.inscripcion : undefined
  const remera = resultado?.remera
  const estado = inscripcion ? presentarEstado(inscripcion.estado) : null
  const tono = estado ? TONOS[estado.tono] : null

  const descargar = useCallback(() => {
    descargarQRDesdeSVG(qrRef.current, nombreArchivoQR(inscripcion?.numeroInscripcion))
  }, [inscripcion?.numeroInscripcion])

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      <Navbar />

      <main className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Encabezado */}
          <header className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded-full">
              <QrCode className="w-4 h-4 text-yellow-400" aria-hidden="true" />
              <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-[0.2em]">
                Mi inscripción
              </span>
            </div>
            <h1 className="font-heading text-h2 text-white mb-3">
              Consultá tu <span className="gradient-text">estado y tu QR</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
              Ingresá tu DNI para ver en qué estado está tu inscripción y descargar tu código de
              acreditación las veces que necesites.
            </p>
          </header>

          {/* Buscador */}
          <form
            onSubmit={buscar}
            className="bg-zinc-900/60 border border-yellow-400/20 rounded-2xl p-5 sm:p-6 backdrop-blur-sm mb-8"
          >
            <label htmlFor="dni" className="block text-sm font-semibold text-gray-300 mb-2">
              Tu DNI
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                  aria-hidden="true"
                />
                <input
                  id="dni"
                  inputMode="numeric"
                  autoComplete="off"
                  value={dni}
                  onChange={(e) => setDni(normalizarDni(e.target.value))}
                  placeholder="Sin puntos ni espacios"
                  className="w-full bg-black/60 border border-yellow-400/30 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={buscando}
                className="px-6 py-3 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black font-bold rounded-lg shadow-lg hover:shadow-yellow-500/40 hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 disabled:cursor-wait transition-all whitespace-nowrap"
              >
                {buscando ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Buscando
                  </span>
                ) : (
                  "Ver mi inscripción"
                )}
              </button>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-400 flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
          </form>

          {/* No encontrada */}
          {resultado && !resultado.encontrada && (
            <div className="bg-zinc-900/60 border border-zinc-700 rounded-2xl p-8 text-center">
              <XCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-xl font-bold text-white mb-2">No encontramos tu inscripción</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Revisá que el DNI esté bien escrito. Si todavía no te inscribiste, podés hacerlo
                ahora; si creés que es un error, escribinos por WhatsApp.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/inscripcion"
                  className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-600 text-black font-bold rounded-lg hover:scale-105 transition-transform"
                >
                  Inscribirme
                </Link>
                <a
                  href={`https://wa.me/${EVENTO.contacto.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 border border-zinc-600 text-gray-300 font-semibold rounded-lg hover:border-yellow-400/50 hover:text-yellow-400 transition-colors"
                >
                  Escribirnos
                </a>
              </div>
            </div>
          )}

          {/* Resultado */}
          {inscripcion && estado && tono && (
            <div className="space-y-6">
              {/* Estado */}
              <section
                className={`bg-gradient-to-b ${tono.fondo} border ${tono.borde} rounded-2xl p-6 sm:p-8 text-center`}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/40 grid place-items-center">
                  {estado.tono === "verde" ? (
                    <CheckCircle2 className={`w-9 h-9 ${tono.texto}`} aria-hidden="true" />
                  ) : estado.tono === "rojo" ? (
                    <XCircle className={`w-9 h-9 ${tono.texto}`} aria-hidden="true" />
                  ) : (
                    <Clock className={`w-9 h-9 ${tono.texto}`} aria-hidden="true" />
                  )}
                </div>

                <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">
                  {inscripcion.nombre} {inscripcion.apellido}
                </p>
                <h2 className={`text-2xl sm:text-3xl font-black mb-3 ${tono.texto}`}>
                  {estado.titulo}
                </h2>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
                  {estado.detalle}
                </p>

                {inscripcion.numeroInscripcion != null && (
                  <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-400/30 bg-black/40">
                    <span className="text-xs uppercase tracking-widest text-gray-400">
                      Inscripción
                    </span>
                    <span className="text-lg font-black text-yellow-400">
                      #{String(inscripcion.numeroInscripcion).padStart(3, "0")}
                    </span>
                  </div>
                )}
              </section>

              {/* QR */}
              {estado.muestraQR && inscripcion.tokenQR && (
                <section className="bg-zinc-900/60 border border-yellow-400/20 rounded-2xl p-6 sm:p-8 text-center">
                  <h2 className="text-xl font-bold text-white mb-2">Tu código de acceso</h2>
                  <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                    Mostralo desde el celular al acreditarte. Podés descargarlo las veces que
                    quieras.
                  </p>

                  <div className="inline-block bg-white p-5 rounded-2xl shadow-2xl shadow-yellow-500/10">
                    <div ref={qrRef}>
                      <QRCodeSVG
                        value={inscripcion.tokenQR}
                        size={210}
                        level="H"
                        includeMargin
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                    <p className="text-black text-sm font-bold mt-3">
                      {inscripcion.nombre} {inscripcion.apellido}
                    </p>
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={descargar}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-600 text-black font-bold rounded-lg hover:scale-105 transition-transform"
                    >
                      <Download className="w-4 h-4" aria-hidden="true" />
                      Descargar QR
                    </button>
                    <p className="text-xs text-gray-500 mt-3">
                      Es personal e intransferible. No lo compartas.
                    </p>
                  </div>
                </section>
              )}

              {/* Remera */}
              <section className="bg-zinc-900/60 border border-yellow-400/20 rounded-2xl p-6 sm:p-7">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-yellow-400/10 grid place-items-center flex-shrink-0">
                    <Shirt className="w-5 h-5 text-yellow-400" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Tu remera</h2>
                </div>

                {remera && remera.items.length > 0 ? (
                  <>
                    <p className="text-sm text-green-400 font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                      Confirmamos tu pedido de {totalRemeras(remera.items)}{" "}
                      {totalRemeras(remera.items) === 1 ? "remera" : "remeras"}.
                    </p>

                    <dl className="space-y-3">
                      <div className="flex items-center justify-between gap-4 pb-3 border-b border-zinc-800">
                        <dt className="text-sm text-gray-400">Talle</dt>
                        <dd className="text-sm font-bold text-white text-right">
                          {resumirTalles(remera.items)}
                        </dd>
                      </div>
                      <div
                        className={`flex items-center justify-between gap-4 ${
                          muestraEstadoEntrega(remera.envioTipo) ? "pb-3 border-b border-zinc-800" : ""
                        }`}
                      >
                        <dt className="text-sm text-gray-400 flex items-center gap-2">
                          <Truck className="w-4 h-4" aria-hidden="true" />
                          Entrega
                        </dt>
                        <dd className="text-sm font-bold text-white text-right">
                          {describirEntrega(remera.envioTipo)}
                          {remera.envioTipo === "envio" && remera.ciudad && (
                            <span className="block text-xs font-normal text-gray-500">
                              {remera.ciudad}
                            </span>
                          )}
                        </dd>
                      </div>
                      {muestraEstadoEntrega(remera.envioTipo) && (
                        <div className="flex items-center justify-between gap-4">
                          <dt className="text-sm text-gray-400">Estado</dt>
                          <dd className="text-sm font-bold text-white text-right">
                            {describirEntregaRemera(remera.estado, remera.entregado)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-400 leading-relaxed mb-5">
                      Todavía no tenés una remera pedida. Podés sumarla y elegir si la retirás o te
                      la enviamos.
                    </p>
                    <Link
                      href="/pedir-remera"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-600 text-black font-bold rounded-lg hover:scale-105 transition-transform"
                    >
                      <Shirt className="w-4 h-4" aria-hidden="true" />
                      Pedir mi remera
                    </Link>
                  </>
                )}
              </section>

              {/* Datos del evento */}
              <section className="bg-zinc-900/60 border border-yellow-400/20 rounded-2xl p-6 sm:p-7">
                <h2 className="text-lg font-bold text-white mb-4">El evento</h2>
                <dl className="space-y-3">
                  <div className="flex items-center justify-between gap-4 pb-3 border-b border-zinc-800">
                    <dt className="text-sm text-gray-400 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" aria-hidden="true" />
                      Fecha
                    </dt>
                    <dd className="text-sm font-bold text-white">{EVENTO.fechaTexto}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-gray-400 flex items-center gap-2">
                      <MapPin className="w-4 h-4" aria-hidden="true" />
                      Lugar
                    </dt>
                    <dd className="text-sm font-bold text-right">
                      <a
                        href={MAPA_EVENTO}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-400 hover:underline"
                      >
                        El Viejo Molino · Camping
                      </a>
                    </dd>
                  </div>
                </dl>
              </section>

              {/* WhatsApp */}
              <section className="bg-gradient-to-b from-green-500/10 to-transparent border border-green-500/30 rounded-2xl p-6 sm:p-7 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/15 grid place-items-center">
                  <MessageCircle className="w-6 h-6 text-green-400" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Sumate al grupo de WhatsApp</h2>
                <p className="text-sm text-gray-400 mb-5 max-w-sm mx-auto leading-relaxed">
                  Ahí compartimos novedades, horarios y todos los detalles previos al evento.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href={GRUPO_WHATSAPP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-[#25d366] text-white font-bold rounded-lg hover:brightness-110 transition-all"
                  >
                    Unirme al grupo
                  </a>
                  <a
                    href={`https://wa.me/${EVENTO.contacto.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 border border-green-500/40 text-green-400 font-semibold rounded-lg hover:bg-green-500/10 transition-colors"
                  >
                    Consulta privada
                  </a>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

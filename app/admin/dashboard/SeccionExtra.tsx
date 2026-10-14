"use client"

import Link from "next/link"
import { ArrowRight, Flame, Shirt, Truck, Package, Activity } from "lucide-react"
import { Dato, Panel, Seccion, SinDatos, Tarjeta } from "./piezas"
import type { DiaInscripciones, Panorama, PanoramaRemeras, Persona } from "./panorama"
import { formatDate } from "@/lib/format"

/**
 * Ritmo de inscripcion: sirve para ver si la venta se frenó.
 * Se calcula sobre los dias que tuvieron al menos una inscripcion.
 */
function calcularRitmo(porDia: DiaInscripciones[], personas: Persona[]) {
  const diasConMovimiento = porDia.length
  const totalInscriptos = porDia.reduce((suma, d) => suma + d.cantidad, 0)
  const diaRecord = porDia.reduce<DiaInscripciones | null>(
    (mejor, dia) => (!mejor || dia.cantidad > mejor.cantidad ? dia : mejor),
    null,
  )

  // Dias desde la ultima inscripcion: las personas vienen ordenadas por fecha
  // descendente desde la consulta.
  const ultimaFecha = personas.find((p) => p.fechaInscripcion)?.fechaInscripcion ?? null
  let diasSinInscripciones: number | null = null
  if (ultimaFecha) {
    const ultima = new Date(ultimaFecha)
    if (!isNaN(ultima.getTime())) {
      diasSinInscripciones = Math.max(
        0,
        Math.floor((Date.now() - ultima.getTime()) / (1000 * 60 * 60 * 24)),
      )
    }
  }

  // Ultimos 7 dias de calendario (no los ultimos 7 dias con movimiento).
  const hace7Dias = Date.now() - 7 * 24 * 60 * 60 * 1000
  const ultimaSemana = personas.filter((p) => {
    if (!p.fechaInscripcion) return false
    const fecha = new Date(p.fechaInscripcion)
    return !isNaN(fecha.getTime()) && fecha.getTime() >= hace7Dias
  }).length

  return {
    promedioPorDia: diasConMovimiento > 0 ? (totalInscriptos / diasConMovimiento).toFixed(1) : "0",
    diaRecord,
    diasSinInscripciones,
    ultimaSemana,
    ultimaFecha,
  }
}

interface SeccionExtraProps {
  panorama: Panorama
  personas: Persona[]
  remeras: PanoramaRemeras
  cargando: boolean
}

/**
 * Lo que no entra en inscripciones ni en plata pero hace falta mirar:
 * los pedidos de remera (hay que encargarlas por talle), el ritmo de
 * inscripcion y las ultimas altas.
 */
export function SeccionExtra({ panorama, personas, remeras, cargando }: SeccionExtraProps) {
  const ritmo = calcularRitmo(panorama.porDia, personas)
  const talleTop = remeras.porTalle.reduce<{ talle: string; cantidad: number } | null>(
    (mejor, t) => (!mejor || t.cantidad > mejor.cantidad ? t : mejor),
    null,
  )
  const maxTalle = talleTop?.cantidad ?? 0
  const ultimas = personas.slice(0, 6)

  return (
    <>
      {/* Ritmo de inscripcion */}
      <Seccion
        titulo="Ritmo"
        bajada="Si la inscripción se frenó, acá se ve antes que en el total."
        icono={<Activity className="w-5 h-5 text-sky-400" />}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Tarjeta
            titulo="Últimos 7 días"
            valor={ritmo.ultimaSemana}
            detalle="Inscripciones nuevas"
            icono={<Flame className="w-4 h-4 text-orange-400" />}
            tono="ambar"
            cargando={cargando}
          />
          <Tarjeta
            titulo="Promedio por día"
            valor={ritmo.promedioPorDia}
            detalle={`Sobre ${panorama.porDia.length} días con movimiento`}
            tono="azul"
            cargando={cargando}
          />
          <Tarjeta
            titulo="Día récord"
            valor={ritmo.diaRecord ? `${ritmo.diaRecord.cantidad}` : "—"}
            detalle={ritmo.diaRecord ? `El ${ritmo.diaRecord.fecha}` : "Sin datos"}
            tono="dorado"
            cargando={cargando}
          />
          <Tarjeta
            titulo="Sin inscripciones"
            valor={ritmo.diasSinInscripciones != null ? `${ritmo.diasSinInscripciones} días` : "—"}
            detalle={ritmo.ultimaFecha ? `Última: ${formatDate(ritmo.ultimaFecha)}` : "Sin datos"}
            tono={ritmo.diasSinInscripciones != null && ritmo.diasSinInscripciones > 7 ? "rojo" : "verde"}
            cargando={cargando}
          />
        </div>
      </Seccion>

      {/* Remeras: hay que encargarlas por talle, asi que el desglose importa. */}
      <Seccion
        titulo="Remeras"
        bajada="Pedidos cargados en /pedir-remera. Son todos los pedidos, no solo los de inscriptos."
        icono={<Shirt className="w-5 h-5 text-violet-400" />}
        acciones={
          <Link
            href="/admin/remera"
            className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 border border-yellow-400/30 rounded-lg px-3 py-1.5"
          >
            Ver pedidos <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Tarjeta
            titulo="Pedidos"
            valor={remeras.pedidos}
            detalle={`${remeras.unidades} remeras en total`}
            icono={<Package className="w-4 h-4 text-violet-400" />}
            tono="violeta"
            cargando={cargando}
          />
          <Tarjeta
            titulo="Sin entregar"
            valor={remeras.pendientes}
            detalle={`${remeras.entregadas} ya entregadas`}
            icono={<Shirt className="w-4 h-4 text-amber-400" />}
            tono={remeras.pendientes > 0 ? "ambar" : "verde"}
            cargando={cargando}
          />
          <Tarjeta
            titulo="Hay que enviar"
            valor={remeras.paraEnviar}
            detalle={`${remeras.paraRetirar} las retiran en mano`}
            icono={<Truck className="w-4 h-4 text-sky-400" />}
            tono="azul"
            cargando={cargando}
          />
          <Tarjeta
            titulo="Talle más pedido"
            valor={talleTop ? talleTop.talle : "—"}
            detalle={talleTop ? `${talleTop.cantidad} unidades` : "Sin pedidos"}
            tono="dorado"
            cargando={cargando}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Panel titulo="Talles pedidos" bajada="Lo que hay que encargar al proveedor.">
            {remeras.porTalle.length === 0 ? (
              <SinDatos texto="Todavía no hay pedidos de remera." />
            ) : (
              <div className="space-y-2">
                {remeras.porTalle.map((t) => (
                  <div key={t.talle} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-yellow-400 w-10 flex-shrink-0">{t.talle}</span>
                    <div className="flex-1 bg-zinc-800 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-violet-500 to-fuchsia-400 h-3 rounded-full"
                        style={{ width: `${maxTalle > 0 ? (t.cantidad / maxTalle) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white tabular-nums w-8 text-right flex-shrink-0">
                      {t.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-4">
              {remeras.porGenero.map((g) => (
                <Dato key={g.label} label={`Corte ${g.label.toLowerCase()}`} valor={g.cantidad} tono="violeta" />
              ))}
            </div>
          </Panel>

          <Panel titulo="Estado de los pedidos" bajada="Para saber a quién hay que reclamarle el comprobante.">
            <div className="grid grid-cols-2 gap-2">
              <Dato label="Con comprobante" valor={remeras.conComprobante} tono="verde" />
              <Dato
                label="Sin comprobante"
                valor={remeras.pedidos - remeras.conComprobante}
                tono={remeras.pedidos - remeras.conComprobante > 0 ? "ambar" : "verde"}
              />
              <Dato
                label="No están inscriptos"
                valor={remeras.noInscriptos}
                tono={remeras.noInscriptos > 0 ? "ambar" : "neutro"}
              />
              <Dato label="Entregadas" valor={remeras.entregadas} tono="azul" />
            </div>
            <p className="text-[11px] text-gray-500 mt-3">
              Los pedidos de gente no inscripta son válidos: se puede pedir la remera sin anotarse al evento.
            </p>
          </Panel>
        </div>
      </Seccion>

      {/* Ultimas altas */}
      <Seccion
        titulo="Últimas inscripciones"
        bajada="Las 6 más recientes de la edición."
        icono={<Activity className="w-5 h-5 text-yellow-400" />}
      >
        <Panel titulo="Recién anotados">
          {cargando ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-zinc-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : ultimas.length === 0 ? (
            <SinDatos texto="Todavía no hay inscripciones." />
          ) : (
            <div className="space-y-2">
              {ultimas.map((persona) => (
                <div
                  key={persona.id}
                  className="flex items-center justify-between gap-2 p-2.5 sm:p-3 bg-zinc-900 rounded-lg border border-yellow-400/10"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 flex-shrink-0 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-black font-bold text-xs">
                      {persona.nombreCompleto
                        .split(" ")
                        .slice(0, 2)
                        .map((parte) => parte.charAt(0))
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{persona.nombreCompleto}</p>
                      <p className="text-gray-500 text-xs truncate">
                        {persona.localidad}
                        {persona.grupo !== "Sin grupo" ? ` · ${persona.grupo}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        persona.estado === "confirmada"
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : persona.estado === "pendiente"
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {persona.estado.toUpperCase()}
                    </span>
                    <p className="text-gray-600 text-[10px] mt-1">{formatDate(persona.fechaInscripcion)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </Seccion>
    </>
  )
}

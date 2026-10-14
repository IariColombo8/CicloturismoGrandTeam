"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Clock,
  Globe,
  HeartPulse,
  MapPin,
  QrCode,
  Users,
  UsersRound,
  XCircle,
} from "lucide-react"
import { Dato, FilaConteo, Panel, Seccion, SinDatos, Tarjeta } from "./piezas"
import type { Panorama } from "./panorama"
import type { Alcance } from "./usePanorama"

const LazyGraficosGente = dynamic(() => import("./GraficosGente"), {
  ssr: false,
  loading: () => <div className="py-16 text-center text-sm text-yellow-400/70 animate-pulse">Cargando gráficos…</div>,
})

interface SeccionGenteProps {
  panorama: Panorama
  /** Cupo maximo del evento, para saber cuanto queda. */
  cupo: number
  alcance: Alcance
  onCambiarAlcance: (alcance: Alcance) => void
  cargando: boolean
}

/**
 * Bloque de inscripciones y gente.
 *
 * Todo lo que se muestra sale de las filas de la edicion, no de una muestra:
 * el dashboard anterior dibujaba los grupos y las localidades con las ultimas
 * 5 inscripciones y el numero nunca coincidia con el registro.
 */
export function SeccionGente({ panorama, cupo, alcance, onCambiarAlcance, cargando }: SeccionGenteProps) {
  const p = panorama
  const lugaresLibres = Math.max(0, cupo - p.total)
  const ocupacion = cupo > 0 ? Math.min(100, (p.total / cupo) * 100) : 0

  return (
    <Seccion
      titulo="Inscripciones y gente"
      bajada={
        alcance === "confirmados"
          ? "Solo las inscripciones confirmadas."
          : "Confirmadas y pendientes (las rechazadas no cuentan)."
      }
      icono={<Users className="w-5 h-5 text-yellow-400" />}
      acciones={
        <div className="flex items-center gap-2">
          {/* El alcance cambia que se cuenta: para el dia del evento importan
              los confirmados; para saber como viene la inscripcion, todos. */}
          <div className="flex rounded-lg border border-yellow-400/30 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => onCambiarAlcance("todos")}
              className={`px-3 py-1.5 transition-colors ${
                alcance === "todos" ? "bg-yellow-400 text-black font-bold" : "text-gray-400 hover:text-yellow-400"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => onCambiarAlcance("confirmados")}
              className={`px-3 py-1.5 transition-colors ${
                alcance === "confirmados" ? "bg-yellow-400 text-black font-bold" : "text-gray-400 hover:text-yellow-400"
              }`}
            >
              Confirmados
            </button>
          </div>
          <Link
            href="/admin/registro-inscripciones"
            className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 border border-yellow-400/30 rounded-lg px-3 py-1.5"
          >
            Ver registro <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      }
    >
      {/* Estado de las inscripciones */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Tarjeta
          titulo={alcance === "confirmados" ? "Confirmados" : "Van al evento"}
          valor={p.total}
          detalle={cupo > 0 ? `${lugaresLibres} lugares libres de ${cupo}` : "Sin cupo configurado"}
          icono={<Users className="w-4 h-4 text-yellow-400" />}
          tono="dorado"
          cargando={cargando}
        />
        <Tarjeta
          titulo="Confirmadas"
          valor={p.confirmadas}
          detalle={p.total > 0 ? `${((p.confirmadas / p.total) * 100).toFixed(0)}% de los inscriptos` : "—"}
          icono={<BadgeCheck className="w-4 h-4 text-emerald-400" />}
          tono="verde"
          cargando={cargando}
        />
        <Tarjeta
          titulo="Pendientes"
          valor={p.pendientes}
          detalle="Esperando revisión del pago"
          icono={<Clock className="w-4 h-4 text-amber-400" />}
          tono="ambar"
          cargando={cargando}
        />
        <Tarjeta
          titulo="Rechazadas"
          valor={p.rechazadas}
          detalle={alcance === "confirmados" ? "No entran en este alcance" : "No cuentan como inscriptas"}
          icono={<XCircle className="w-4 h-4 text-red-400" />}
          tono="rojo"
          cargando={cargando}
        />
        <Tarjeta
          titulo="Acreditados"
          valor={p.acreditados}
          detalle={`${p.total - p.acreditados} sin acreditar`}
          icono={<QrCode className="w-4 h-4 text-violet-400" />}
          tono="violeta"
          cargando={cargando}
        />
      </div>

      {/* Ocupacion del cupo */}
      {cupo > 0 && (
        <div className="mb-4 sm:mb-6 rounded-xl border border-yellow-400/20 bg-black/40 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <span>Ocupación del cupo</span>
            <span className="font-bold text-yellow-400 tabular-nums">
              {p.total} / {cupo} · {ocupacion.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-yellow-400 to-amber-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${ocupacion}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Salud: lo que hay que tener a mano el dia del evento. */}
        <Panel
          titulo="Salud y alimentación"
          bajada="Lo que hay que resolver antes del evento. El botón abre los nombres y el detalle."
          icono={<HeartPulse className="w-4 h-4 text-red-400" />}
        >
          {cargando ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 bg-zinc-800 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              <FilaConteo
                conteo={p.celiacos}
                total={p.total}
                tituloModal="Celíacos"
                descripcionModal="Hay que prever vianda sin TACC para estas personas."
                destacar
              />
              <FilaConteo
                conteo={p.problemasSalud}
                total={p.total}
                tituloModal="Declararon problemas de salud"
                descripcionModal="Nombre y condición tal como la cargaron en la inscripción."
                destacar
              />
              <FilaConteo
                conteo={p.alergicos}
                total={p.total}
                tituloModal="Declararon alergias"
                descripcionModal="Nombre y alergia tal como la cargaron."
                destacar
              />
              <FilaConteo
                conteo={p.menores}
                total={p.total}
                tituloModal="Menores de edad"
                descripcionModal="Necesitan autorización de un adulto responsable."
                destacar
              />
              <FilaConteo
                conteo={p.sinExperiencia}
                total={p.total}
                tituloModal="Nunca hicieron la distancia"
                descripcionModal="Declararon que no recorrieron antes la distancia del evento."
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Dato
              label="Sin grupo sanguíneo cargado"
              valor={p.sinGrupoSanguineo.cantidad}
              tono={p.sinGrupoSanguineo.cantidad > 0 ? "ambar" : "verde"}
            />
            <Dato label="Ya hicieron la distancia" valor={p.conExperiencia} tono="verde" />
          </div>
        </Panel>

        {/* Grupos ciclistas */}
        <Panel
          titulo="Grupos ciclistas"
          bajada={`${p.grupos.length} ${p.grupos.length === 1 ? "grupo" : "grupos"} y ${p.sinGrupo.cantidad} sin grupo.`}
          icono={<UsersRound className="w-4 h-4 text-yellow-400" />}
        >
          {cargando ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-zinc-800 rounded animate-pulse" />
              ))}
            </div>
          ) : p.grupos.length === 0 ? (
            <SinDatos texto="Nadie declaró grupo todavía." />
          ) : (
            <div className="divide-y divide-zinc-800 max-h-[320px] overflow-y-auto pr-1">
              {p.grupos.map((grupo) => (
                <FilaConteo
                  key={grupo.label}
                  conteo={grupo}
                  total={p.total}
                  tituloModal={grupo.label}
                  descripcionModal={`${grupo.cantidad} ${grupo.cantidad === 1 ? "integrante" : "integrantes"} inscriptos`}
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Dato label="En algún grupo" valor={p.total - p.sinGrupo.cantidad} tono="dorado" />
            <Dato label="Sueltos" valor={p.sinGrupo.cantidad} />
          </div>
          {p.sinGrupo.cantidad > 0 && (
            <div className="mt-2 border-t border-zinc-800 pt-1">
              <FilaConteo
                conteo={p.sinGrupo}
                tituloModal="Van sin grupo"
                descripcionModal="No declararon pertenecer a ningún grupo ciclista."
              />
            </div>
          )}
        </Panel>

        {/* De donde viene la gente */}
        <Panel
          titulo="Procedencia"
          bajada={`${p.localidades.length} localidades y ${p.paises.length} ${p.paises.length === 1 ? "país" : "países"}.`}
          icono={<MapPin className="w-4 h-4 text-sky-400" />}
        >
          {cargando ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-zinc-800 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Países
              </p>
              <div className="divide-y divide-zinc-800 mb-3">
                {p.paises.map((pais) => (
                  <FilaConteo key={pais.label} conteo={pais} total={p.total} tituloModal={`Vienen de ${pais.label}`} />
                ))}
              </div>

              <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Localidades
              </p>
              <div className="divide-y divide-zinc-800 max-h-[220px] overflow-y-auto pr-1">
                {p.localidades.map((loc) => (
                  <FilaConteo key={loc.label} conteo={loc} total={p.total} tituloModal={`Vienen de ${loc.label}`} />
                ))}
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* Edades */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Dato label="Edad promedio" valor={p.edadPromedio != null ? `${p.edadPromedio} años` : "—"} tono="dorado" />
        <Dato
          label="El más joven"
          valor={p.masJoven?.edad != null ? `${p.masJoven.edad} años` : "—"}
          tono="azul"
        />
        <Dato
          label="El más grande"
          valor={p.masGrande?.edad != null ? `${p.masGrande.edad} años` : "—"}
          tono="violeta"
        />
        <Dato label="Sin edad usable" valor={p.sinEdad} tono={p.sinEdad > 0 ? "ambar" : "verde"} />
      </div>

      {/* Fechas mal cargadas. Se avisan en vez de esconderse: una fecha con el
          año en curso daba "0 años" y contaba como menor de edad. */}
      {p.fechasDudosas.cantidad > 0 && (
        <div className="mb-4 sm:mb-6 rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-2">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-200">
              Hay fechas de nacimiento que no dan una edad creíble. No se cuentan en edades ni en menores
              hasta que se corrijan en el registro.
            </p>
          </div>
          <FilaConteo
            conteo={p.fechasDudosas}
            tituloModal="Fechas de nacimiento a revisar"
            descripcionModal="La fecha guardada no da una edad posible: hay que corregirla en el registro de inscripciones."
            destacar
          />
        </div>
      )}

      {!cargando && (
        <LazyGraficosGente
          porDia={p.porDia}
          grupos={p.grupos}
          localidades={p.localidades}
          edades={p.edades}
          sangre={p.sangre}
        />
      )}
    </Seccion>
  )
}

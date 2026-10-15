"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Label } from "@/components/ui/label"

/**
 * Fecha de nacimiento en tres campos: día, mes y año.
 *
 * Antes era un `<input type="date">`. En la compu anda bien, pero en el
 * celular depende del selector nativo: dentro del navegador de Instagram o
 * Facebook (por donde entra buena parte de la gente) y en varios Android ese
 * selector no abre, y como el campo tampoco deja escribir, la fecha quedaba
 * imposible de cargar y nadie podía pasar del paso 1.
 *
 * Estos tres campos son HTML común (dos numéricos y un `<select>` nativo):
 * funcionan igual en cualquier teléfono, navegador o WebView, y el mes con
 * nombre saca de encima la duda de si va día/mes o mes/día.
 *
 * Hacia afuera sigue hablando en ISO (`aaaa-mm-dd`), que es lo que guarda la
 * base, así que el resto del formulario no cambia.
 */

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
]

interface CampoFechaProps {
  /** Valor en ISO (`aaaa-mm-dd`) o cadena vacía. */
  value: string
  onChange: (iso: string) => void
  id?: string
  label?: string
  requerido?: boolean
}

function partesDesdeIso(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || "").trim())
  if (!m) return { dia: "", mes: "", anio: "" }
  return { dia: String(Number(m[3])), mes: m[2], anio: m[1] }
}

/** Días reales del mes, para no aceptar un 31 de febrero. */
function diasDelMes(mes: number, anio: number) {
  if (!mes) return 31
  if (!anio) return mes === 2 ? 29 : [4, 6, 9, 11].includes(mes) ? 30 : 31
  return new Date(anio, mes, 0).getDate()
}

function edadDesde(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const nacimiento = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(nacimiento.getTime())) return null
  const hoy = new Date()
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const cumplioEsteAnio =
    hoy.getMonth() > nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= nacimiento.getDate())
  if (!cumplioEsteAnio) edad -= 1
  return edad
}

export default function CampoFecha({
  value,
  onChange,
  id = "fechaNacimiento",
  label = "Fecha de Nacimiento",
  requerido = true,
}: CampoFechaProps) {
  const inicial = partesDesdeIso(value)
  const [dia, setDia] = useState(inicial.dia)
  const [mes, setMes] = useState(inicial.mes)
  const [anio, setAnio] = useState(inicial.anio)
  const mesRef = useRef<HTMLSelectElement>(null)
  const anioRef = useRef<HTMLInputElement>(null)

  // Si el valor llega de afuera (borrador restaurado, autocompletado por DNI)
  // y no coincide con lo que está escrito, sincronizamos los tres campos.
  useEffect(() => {
    const p = partesDesdeIso(value)
    const actual = armarIso(dia, mes, anio)
    if (value !== actual) {
      setDia(p.dia)
      setMes(p.mes)
      setAnio(p.anio)
    }
    // Solo cuando cambia el valor externo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function armarIso(d: string, m: string, a: string) {
    const nd = Number(d)
    const nm = Number(m)
    const na = Number(a)
    if (!nd || !nm || a.length !== 4 || !na) return ""
    if (nm < 1 || nm > 12) return ""
    if (nd < 1 || nd > diasDelMes(nm, na)) return ""
    return `${String(na).padStart(4, "0")}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`
  }

  const emitir = (d: string, m: string, a: string) => {
    onChange(armarIso(d, m, a))
  }

  const cambiarDia = (crudo: string) => {
    const limpio = crudo.replace(/\D/g, "").slice(0, 2)
    setDia(limpio)
    emitir(limpio, mes, anio)
    // Dos dígitos (o un 4..9 que ya no puede seguir) → pasamos al mes.
    if (limpio.length === 2 || (limpio.length === 1 && Number(limpio) > 3)) {
      mesRef.current?.focus()
    }
  }

  const cambiarMes = (crudo: string) => {
    setMes(crudo)
    emitir(dia, crudo, anio)
    if (crudo && anio.length < 4) anioRef.current?.focus()
  }

  const cambiarAnio = (crudo: string) => {
    const limpio = crudo.replace(/\D/g, "").slice(0, 4)
    setAnio(limpio)
    emitir(dia, mes, limpio)
  }

  const iso = armarIso(dia, mes, anio)
  const edad = edadDesde(iso)
  const cargoAlgo = !!(dia || mes || anio)
  const completo = !!(dia && mes && anio.length === 4)

  // Avisos suaves: orientan, nunca bloquean ni asustan.
  let aviso: string | null = null
  if (completo && !iso) {
    aviso = "Esa fecha no existe, revisá el día"
  } else if (completo && edad !== null && (edad < 3 || edad > 100)) {
    aviso = "Revisá el año de nacimiento"
  }

  const claseCampo =
    "h-12 w-full rounded-md border border-yellow-400/30 bg-zinc-900 px-3 text-base text-white " +
    "outline-none transition-colors focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 " +
    "appearance-none"

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-dia`} className="text-gray-300">
        {label} {requerido && <span className="text-red-500">*</span>}
      </Label>

      <div className="grid grid-cols-[4.5rem_1fr_5.5rem] gap-2">
        <input
          id={`${id}-dia`}
          type="text"
          inputMode="numeric"
          autoComplete="bday-day"
          placeholder="Día"
          aria-label="Día de nacimiento"
          value={dia}
          onChange={(e) => cambiarDia(e.target.value)}
          className={`${claseCampo} text-center tabular-nums`}
        />

        <div className="relative">
          <select
            id={`${id}-mes`}
            ref={mesRef}
            aria-label="Mes de nacimiento"
            value={mes}
            onChange={(e) => cambiarMes(e.target.value)}
            className={`${claseCampo} pr-9 capitalize ${mes ? "" : "text-gray-500"}`}
          >
            <option value="">Mes</option>
            {MESES.map((nombre, i) => (
              <option key={nombre} value={String(i + 1).padStart(2, "0")} className="capitalize">
                {nombre}
              </option>
            ))}
          </select>
          {/* La flecha va aparte porque el select lleva appearance-none (si no,
              en iOS el fondo claro nativo se come el tema oscuro). */}
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-400"
            aria-hidden="true"
          />
        </div>

        <input
          id={`${id}-anio`}
          ref={anioRef}
          type="text"
          inputMode="numeric"
          autoComplete="bday-year"
          placeholder="Año"
          aria-label="Año de nacimiento"
          value={anio}
          onChange={(e) => cambiarAnio(e.target.value)}
          className={`${claseCampo} text-center tabular-nums`}
        />
      </div>

      {/* El resto del formulario lee la fecha de acá. */}
      <input type="hidden" id={id} name={id} value={iso} readOnly />

      {aviso ? (
        <p className="text-xs text-yellow-400">{aviso}</p>
      ) : edad !== null ? (
        <p className="text-xs text-gray-500">
          {edad} años {edad < 18 && "· los menores necesitan autorización de madre, padre o tutor"}
        </p>
      ) : (
        <p className="text-xs text-gray-500">
          {cargoAlgo ? "Completá día, mes y año" : "Por ejemplo: 12 · marzo · 1990"}
        </p>
      )}
    </div>
  )
}

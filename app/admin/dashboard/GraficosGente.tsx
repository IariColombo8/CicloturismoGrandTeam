"use client"

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Panel, SinDatos } from "./piezas"
import type { Conteo, DiaInscripciones } from "./panorama"
import { Calendar, Droplet, MapPin, Users } from "lucide-react"

// Recharts se carga con dynamic import desde la pagina: es la libreria mas
// pesada del panel y el dashboard ya trae bastantes datos.

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#18181b",
    border: "1px solid #fbbf24",
    borderRadius: "8px",
    fontSize: "12px",
  },
  labelStyle: { color: "#fbbf24" },
}

const COLORES = ["#fbbf24", "#60a5fa", "#a78bfa", "#f472b6", "#34d399", "#fb923c", "#38bdf8", "#f87171"]

interface GraficosGenteProps {
  porDia: DiaInscripciones[]
  grupos: Conteo[]
  localidades: Conteo[]
  edades: Conteo[]
  sangre: Conteo[]
}

export default function GraficosGente({ porDia, grupos, localidades, edades, sangre }: GraficosGenteProps) {
  // Los graficos de ranking se recortan: con 20 grupos o 32 localidades las
  // etiquetas quedan ilegibles. El total completo se ve en las listas de al lado.
  const topGrupos = grupos.slice(0, 10).map((g) => ({ nombre: g.label, cantidad: g.cantidad }))
  const topLocalidades = localidades.slice(0, 8).map((l) => ({ nombre: l.label, cantidad: l.cantidad }))
  const datosEdad = edades.map((e) => ({ nombre: e.label, cantidad: e.cantidad }))
  const datosSangre = sangre.map((s, i) => ({
    name: s.label,
    value: s.cantidad,
    color: COLORES[i % COLORES.length],
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Crecimiento: la barra es lo que entro ese dia y la linea el acumulado.
          Van juntos con dos ejes porque son escalas distintas. */}
      <Panel
        titulo="Cómo se fue llenando"
        bajada="Barras: inscripciones de ese día. Línea: total acumulado."
        icono={<Calendar className="w-4 h-4 text-yellow-400" />}
        className="lg:col-span-2"
      >
        {porDia.length === 0 ? (
          <SinDatos texto="Todavía no hay inscripciones con fecha." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={porDia}>
              <defs>
                <linearGradient id="gradAcumulado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="fecha" stroke="#9ca3af" style={{ fontSize: "11px" }} />
              <YAxis yAxisId="dia" stroke="#60a5fa" style={{ fontSize: "11px" }} allowDecimals={false} />
              <YAxis
                yAxisId="acum"
                orientation="right"
                stroke="#fbbf24"
                style={{ fontSize: "11px" }}
                allowDecimals={false}
              />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area
                yAxisId="acum"
                type="monotone"
                dataKey="acumulado"
                name="Acumulado"
                stroke="#fbbf24"
                strokeWidth={2}
                fill="url(#gradAcumulado)"
              />
              <Bar yAxisId="dia" dataKey="cantidad" name="Ese día" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Grupos */}
      <Panel
        titulo={`Grupos ciclistas${grupos.length > 10 ? " (top 10)" : ""}`}
        bajada={`${grupos.length} ${grupos.length === 1 ? "grupo" : "grupos"} con integrantes inscriptos`}
        icono={<Users className="w-4 h-4 text-yellow-400" />}
      >
        {topGrupos.length === 0 ? (
          <SinDatos texto="Nadie declaró grupo todavía." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, topGrupos.length * 28)}>
            <BarChart data={topGrupos} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" stroke="#9ca3af" allowDecimals={false} style={{ fontSize: "11px" }} />
              <YAxis
                dataKey="nombre"
                type="category"
                stroke="#9ca3af"
                width={120}
                style={{ fontSize: "10px" }}
                interval={0}
              />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="cantidad" name="Integrantes" fill="#fbbf24" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Localidades */}
      <Panel
        titulo={`De dónde vienen${localidades.length > 8 ? " (top 8)" : ""}`}
        bajada={`${localidades.length} ${localidades.length === 1 ? "localidad" : "localidades"} distintas`}
        icono={<MapPin className="w-4 h-4 text-yellow-400" />}
      >
        {topLocalidades.length === 0 ? (
          <SinDatos texto="Sin localidades cargadas." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, topLocalidades.length * 28)}>
            <BarChart data={topLocalidades} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis type="number" stroke="#9ca3af" allowDecimals={false} style={{ fontSize: "11px" }} />
              <YAxis
                dataKey="nombre"
                type="category"
                stroke="#9ca3af"
                width={120}
                style={{ fontSize: "10px" }}
                interval={0}
              />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="cantidad" name="Inscriptos" fill="#60a5fa" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Edades */}
      <Panel
        titulo="Edades"
        bajada="Edad cumplida al día de hoy, según la fecha de nacimiento cargada."
        icono={<Users className="w-4 h-4 text-yellow-400" />}
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={datosEdad}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="nombre" stroke="#9ca3af" style={{ fontSize: "10px" }} interval={0} />
            <YAxis stroke="#9ca3af" allowDecimals={false} style={{ fontSize: "11px" }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="cantidad" name="Personas" radius={[6, 6, 0, 0]}>
              {datosEdad.map((d, i) => (
                // El primer tramo son los menores: va marcado en naranja porque
                // necesitan autorizacion el dia del evento.
                <Cell key={d.nombre} fill={i === 0 ? "#fb923c" : "#fbbf24"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Grupo sanguineo: dato de emergencia, no una curiosidad. */}
      <Panel
        titulo="Grupos sanguíneos"
        bajada="Para el equipo médico el día del evento."
        icono={<Droplet className="w-4 h-4 text-yellow-400" />}
      >
        {datosSangre.length === 0 ? (
          <SinDatos texto="Sin grupos sanguíneos cargados." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={datosSangre}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                dataKey="value"
              >
                {datosSangre.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  )
}

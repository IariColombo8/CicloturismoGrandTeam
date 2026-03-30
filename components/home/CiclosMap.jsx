"use client"

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet"
import { useState, useMemo } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

const ENTRE_RIOS_CENTER = [-31.7, -59.5]
const ENTRE_RIOS_ZOOM = 7

const COLORS = {
  facil: "#22c55e",
  media: "#facc15",
  dificil: "#fb923c",
  extrema: "#ef4444",
}

// Dimensiones aproximadas de la etiqueta en píxeles
const LABEL_W = 160
const LABEL_H = 38

// Posiciones candidatas (dir + vOffset desde el pin)
const CANDIDATE_POSITIONS = [
  { dir: "right", vOffset: -27 },
  { dir: "left",  vOffset: -27 },
  { dir: "right", vOffset: -60 },
  { dir: "left",  vOffset: -60 },
  { dir: "right", vOffset:   6 },
  { dir: "left",  vOffset:   6 },
  { dir: "right", vOffset: -93 },
  { dir: "left",  vOffset: -93 },
  { dir: "right", vOffset:  39 },
  { dir: "left",  vOffset:  39 },
  { dir: "right", vOffset: -126 },
  { dir: "left",  vOffset: -126 },
  { dir: "right", vOffset:  72 },
  { dir: "left",  vOffset:  72 },
]

function getLabelRect(sx, sy, pos) {
  const x = pos.dir === "right" ? sx + 18 : sx - 18 - LABEL_W
  return { x, y: sy + pos.vOffset, w: LABEL_W, h: LABEL_H }
}

function rectsOverlap(a, b) {
  const margin = 4
  return (
    a.x < b.x + b.w + margin &&
    a.x + a.w + margin > b.x &&
    a.y < b.y + b.h + margin &&
    a.y + a.h + margin > b.y
  )
}

function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h
}

// Asigna posición no solapada a cada ciclo y detecta pins ocultos tras carteles ajenos
function assignPositions(ciclos, map) {
  const placed = [] // { cicloId, rect }
  const sorted = [...ciclos].sort((a, b) => parseFloat(b.latitud) - parseFloat(a.latitud))
  const posResult = new Map()

  for (const ciclo of sorted) {
    const point = map.project([parseFloat(ciclo.latitud), parseFloat(ciclo.longitud)])
    const sx = point.x
    const sy = point.y

    let chosen = CANDIDATE_POSITIONS[0]
    let placedThis = false

    for (const pos of CANDIDATE_POSITIONS) {
      const rect = getLabelRect(sx, sy, pos)
      const hasOverlap = placed.some((p) => rectsOverlap(rect, p.rect))
      if (!hasOverlap) {
        chosen = pos
        placed.push({ cicloId: ciclo.id, rect })
        placedThis = true
        break
      }
    }

    if (!placedThis) {
      placed.push({ cicloId: ciclo.id, rect: getLabelRect(sx, sy, chosen) })
    }

    posResult.set(ciclo.id, chosen)
  }

  // Detectar pins que quedan detrás de un cartel ajeno
  const hiddenPins = new Set()
  for (const ciclo of ciclos) {
    const point = map.project([parseFloat(ciclo.latitud), parseFloat(ciclo.longitud)])
    for (const p of placed) {
      if (p.cicloId === ciclo.id) continue
      if (pointInRect(point.x, point.y, p.rect)) {
        hiddenPins.add(ciclo.id)
        break
      }
    }
  }

  return { posResult, hiddenPins }
}

const createLabelIcon = (ciclo, pos, hidePin) => {
  const color = COLORS[ciclo.dificultad] || COLORS.media
  const { dir, vOffset } = pos

  const fechaStr = ciclo.fecha
    ? new Date(ciclo.fecha + "T12:00:00").toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : ""

  const localidad = ciclo.localidad || ""

  const borderSide = dir === "right" ? "border-left" : "border-right"
  const borderRadius = dir === "right" ? "0 7px 7px 0" : "7px 0 0 7px"

  // Punto de conexión en el borde del cartel (centro vertical)
  const lineEndX = dir === "right" ? 18 : -18
  const lineEndY = vOffset + LABEL_H / 2

  const labelBox = `
    <div style="
      background:rgba(8,8,8,0.95);
      border:1px solid ${color}44;
      ${borderSide}:3px solid ${color};
      border-radius:${borderRadius};
      padding:5px 10px 5px 9px;
      box-shadow:0 3px 14px rgba(0,0,0,0.75);
      line-height:1.25;
    ">
      ${localidad ? `<div style="
        font-weight:900;
        font-size:13px;
        color:#ffffff;
        letter-spacing:0.05em;
        text-transform:uppercase;
        text-shadow:0 0 10px ${color}99;
        ${fechaStr ? "margin-bottom:2px;" : ""}
        white-space:nowrap;
      ">${localidad}</div>` : ""}
      ${fechaStr ? `<div style="
        font-size:10px;
        color:${color};
        font-weight:700;
        letter-spacing:0.02em;
        white-space:nowrap;
      ">${fechaStr}</div>` : ""}
    </div>
  `

  const posStyle = dir === "right"
    ? `left:18px;top:${vOffset}px;`
    : `right:18px;top:${vOffset}px;`

  // Línea SVG desde el pin (0,0) hasta el borde del cartel
  const svgLine = `
    <svg style="position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;z-index:0;pointer-events:none;">
      <line x1="0" y1="0" x2="${lineEndX}" y2="${lineEndY}"
        stroke="${color}" stroke-width="1.5" opacity="0.5" />
    </svg>
  `

  const pinStyle = hidePin
    ? "display:none;"
    : ""

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:0;height:0;">
        ${svgLine}
        <!-- Pin -->
        <div style="
          position:absolute;
          left:-6px;top:-6px;
          width:12px;height:12px;
          border-radius:50%;
          background:${color};
          border:2.5px solid #fff;
          box-shadow:0 0 8px ${color}aa, 0 2px 6px rgba(0,0,0,0.8);
          z-index:2;
          ${pinStyle}
        "></div>
        <!-- Etiqueta -->
        <div style="position:absolute;${posStyle}z-index:1;white-space:nowrap;">
          ${labelBox}
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [80, 0],
  })
}

// Componente interno que accede al mapa y recalcula posiciones en cada zoom/movimiento
function CiclosMarkers({ ciclos }) {
  const map = useMap()
  const [version, setVersion] = useState(0)

  useMapEvents({
    zoomend: () => setVersion((v) => v + 1),
    moveend: () => setVersion((v) => v + 1),
  })

  const { posResult, hiddenPins } = useMemo(() => {
    return assignPositions(ciclos, map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciclos, version])

  return (
    <>
      {ciclos.map((ciclo) => (
        <Marker
          key={`${ciclo.id}-${version}`}
          position={[parseFloat(ciclo.latitud), parseFloat(ciclo.longitud)]}
          icon={createLabelIcon(
            ciclo,
            posResult.get(ciclo.id) || CANDIDATE_POSITIONS[0],
            hiddenPins.has(ciclo.id)
          )}
        >
          <Popup>
            <div style={{ minWidth: 220, fontFamily: "system-ui" }}>
              <h4 style={{ margin: "0 0 2px", fontWeight: 900, fontSize: 16 }}>{ciclo.localidad}</h4>
              <p style={{ margin: "0 0 6px", color: "#888", fontSize: 12, fontWeight: 600 }}>{ciclo.nombre}</p>
              <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "#555" }}>
                {ciclo.distancia && <span>{ciclo.distancia} km</span>}
                {ciclo.duracion && <span>{ciclo.duracion}</span>}
                {ciclo.dificultad && <span style={{ textTransform: "capitalize" }}>{ciclo.dificultad}</span>}
              </div>
              {ciclo.fecha && (
                <p style={{ margin: "6px 0 0", fontWeight: 600, fontSize: 13, color: "#b45309" }}>
                  {new Date(ciclo.fecha + "T12:00:00").toLocaleDateString("es-AR", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              )}
              {ciclo.linkInscripcion && (
                <a
                  href={ciclo.linkInscripcion}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block", marginTop: 8, padding: "6px 14px",
                    background: "#facc15", color: "#000", borderRadius: 8,
                    fontSize: 12, fontWeight: 700, textDecoration: "none",
                  }}
                >
                  Inscribirse
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}

export default function CiclosMap({ ciclos }) {
  const ciclosConMapa = ciclos.filter((c) => c.latitud && c.longitud)

  return (
    <div className="w-full h-[75svh] sm:h-[500px] rounded-2xl overflow-hidden border-2 border-yellow-400/20 hover:border-yellow-400/40 transition-colors relative">
      <MapContainer
        center={ENTRE_RIOS_CENTER}
        zoom={ENTRE_RIOS_ZOOM}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <CiclosMarkers ciclos={ciclosConMapa} />
      </MapContainer>

      {/* Leyenda */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-black/80 backdrop-blur-sm rounded-xl p-3 border border-zinc-700">
        <p className="text-xs text-gray-400 font-semibold mb-2">Dificultad</p>
        <div className="flex flex-col gap-1.5">
          {[
            { color: COLORS.facil, label: "Fácil" },
            { color: COLORS.media, label: "Media" },
            { color: COLORS.dificil, label: "Difícil" },
            { color: COLORS.extrema, label: "Extrema" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-white/40" style={{ background: item.color }} />
              <span className="text-xs text-gray-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

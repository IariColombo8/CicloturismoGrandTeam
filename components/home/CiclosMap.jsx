"use client"

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
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

// 6 posiciones distintas para evitar superposición
// dir: 'right' | 'left', vOffset: desplazamiento vertical en px desde el punto del pin
const LABEL_CONFIGS = [
  { dir: "right", vOffset: -18 },  // centro derecha
  { dir: "left",  vOffset: -18 },  // centro izquierda
  { dir: "right", vOffset: -42 },  // arriba derecha
  { dir: "left",  vOffset: -42 },  // arriba izquierda
  { dir: "right", vOffset:   6 },  // abajo derecha
  { dir: "left",  vOffset:   6 },  // abajo izquierda
]

const createLabelIcon = (ciclo, configIndex = 0) => {
  const color = COLORS[ciclo.dificultad] || COLORS.media
  const { dir, vOffset } = LABEL_CONFIGS[configIndex % LABEL_CONFIGS.length]

  const fechaStr = ciclo.fecha
    ? new Date(ciclo.fecha + "T12:00:00").toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : ""

  const localidad = ciclo.localidad || ""
  const nombre = (ciclo.nombre || "").toUpperCase()

  // Línea conectora y etiqueta según dirección
  const connectorRight = `
    <div style="width:12px;height:2px;background:${color};flex-shrink:0;"></div>
  `
  const connectorLeft = `
    <div style="width:12px;height:2px;background:${color};flex-shrink:0;"></div>
  `

  const labelBox = `
    <div style="
      background:rgba(8,8,8,0.94);
      border:1px solid ${color}55;
      border-${dir === "right" ? "left" : "right"}:3px solid ${color};
      border-radius:${dir === "right" ? "0 7px 7px 0" : "7px 0 0 7px"};
      padding:5px 10px 5px 8px;
      box-shadow:0 3px 12px rgba(0,0,0,0.7);
      line-height:1.2;
      min-width:80px;
    ">
      ${localidad ? `<div style="
        font-weight:900;
        font-size:13px;
        color:#fff;
        letter-spacing:0.04em;
        text-transform:uppercase;
        margin-bottom:2px;
        text-shadow:0 0 8px ${color}88;
      ">${localidad}</div>` : ""}
      <div style="
        font-size:9.5px;
        color:#aaa;
        letter-spacing:0.02em;
        font-weight:600;
        margin-bottom:${fechaStr ? "2px" : "0"};
        max-width:140px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      ">${nombre}</div>
      ${fechaStr ? `<div style="
        font-size:9.5px;
        color:${color};
        font-weight:700;
        letter-spacing:0.02em;
      ">${fechaStr}</div>` : ""}
    </div>
  `

  const dotHtml = `
    <div style="
      position:absolute;
      left:-6px;
      top:-6px;
      width:12px;
      height:12px;
      border-radius:50%;
      background:${color};
      border:2.5px solid #fff;
      box-shadow:0 0 8px ${color}99, 0 2px 6px rgba(0,0,0,0.8);
      flex-shrink:0;
      z-index:2;
    "></div>
  `

  const labelHtml = dir === "right"
    ? `<div style="position:absolute;left:6px;top:${vOffset}px;display:flex;align-items:center;white-space:nowrap;z-index:1;">${connectorRight}${labelBox}</div>`
    : `<div style="position:absolute;right:6px;top:${vOffset}px;display:flex;align-items:center;flex-direction:row-reverse;white-space:nowrap;z-index:1;">${connectorLeft}${labelBox}</div>`

  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:0;height:0;">${dotHtml}${labelHtml}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [80, 0],
  })
}

export default function CiclosMap({ ciclos }) {
  const ciclosConMapa = ciclos.filter((c) => c.latitud && c.longitud)

  return (
    <div className="w-full h-[300px] sm:h-[500px] rounded-2xl overflow-hidden border-2 border-yellow-400/20 hover:border-yellow-400/40 transition-colors relative">
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
        {ciclosConMapa.map((ciclo, index) => (
          <Marker
            key={ciclo.id}
            position={[parseFloat(ciclo.latitud), parseFloat(ciclo.longitud)]}
            icon={createLabelIcon(ciclo, index)}
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
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
                {ciclo.linkInscripcion && (
                  <a
                    href={ciclo.linkInscripcion}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      padding: "6px 14px",
                      background: "#facc15",
                      color: "#000",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    Inscribirse
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
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

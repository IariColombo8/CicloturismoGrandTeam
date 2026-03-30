"use client"

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Centro de Entre Ríos
const ENTRE_RIOS_CENTER = [-31.7, -59.5]
const ENTRE_RIOS_ZOOM = 7

const COLORS = {
  facil: "#22c55e",
  media: "#facc15",
  dificil: "#fb923c",
  extrema: "#ef4444",
}

// Etiqueta con nombre y fecha apuntando hacia la derecha
const createLabelIcon = (ciclo) => {
  const color = COLORS[ciclo.dificultad] || COLORS.media

  const fechaStr = ciclo.fecha
    ? new Date(ciclo.fecha + "T12:00:00").toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : ""

  const nombre = (ciclo.nombre || "").toUpperCase()

  return L.divIcon({
    className: "",
    html: `
      <div style="
        display: flex;
        align-items: center;
        white-space: nowrap;
        transform: translateY(-50%);
      ">
        <!-- Punto pin -->
        <div style="
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.7);
          flex-shrink: 0;
        "></div>
        <!-- Conector -->
        <div style="
          width: 10px;
          height: 2px;
          background: ${color};
          flex-shrink: 0;
        "></div>
        <!-- Etiqueta -->
        <div style="
          background: rgba(10,10,10,0.92);
          border: 1px solid ${color}44;
          border-left: 2.5px solid ${color};
          border-radius: 0 6px 6px 0;
          padding: 4px 10px 4px 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.6);
          line-height: 1;
        ">
          <div style="
            font-weight: 800;
            font-size: 10.5px;
            color: #fff;
            letter-spacing: 0.03em;
            margin-bottom: ${fechaStr ? "3px" : "0"};
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
          ">${nombre}</div>
          ${fechaStr ? `<div style="
            font-size: 10px;
            color: ${color};
            font-weight: 600;
            letter-spacing: 0.02em;
          ">${fechaStr}</div>` : ""}
        </div>
      </div>
    `,
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
        {ciclosConMapa.map((ciclo) => (
          <Marker
            key={ciclo.id}
            position={[parseFloat(ciclo.latitud), parseFloat(ciclo.longitud)]}
            icon={createLabelIcon(ciclo)}
          >
            <Popup>
              <div style={{ minWidth: 220, fontFamily: "system-ui" }}>
                <h4 style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 15 }}>{ciclo.nombre}</h4>
                {ciclo.localidad && (
                  <p style={{ margin: "0 0 4px", color: "#666", fontSize: 13 }}>
                    {ciclo.localidad}
                  </p>
                )}
                <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: "#555" }}>
                  {ciclo.distancia && <span>{ciclo.distancia} km</span>}
                  {ciclo.duracion && <span>{ciclo.duracion}</span>}
                  {ciclo.dificultad && (
                    <span style={{ textTransform: "capitalize" }}>{ciclo.dificultad}</span>
                  )}
                </div>
                {ciclo.fecha && (
                  <p style={{ margin: "6px 0 0", fontWeight: 600, fontSize: 13, color: "#b45309" }}>
                    {new Date(ciclo.fecha).toLocaleDateString("es-AR", {
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

      {/* Leyenda de dificultad */}
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
              <div
                className="w-2.5 h-2.5 rounded-full border-2 border-white/40"
                style={{ background: item.color }}
              />
              <span className="text-xs text-gray-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

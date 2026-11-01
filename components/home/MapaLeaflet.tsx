"use client"

// El mapa interactivo del recorrido. Se carga con next/dynamic (ssr: false) recien
// cuando la seccion se acerca a la pantalla (ver MapaRecorrido.tsx): Leaflet y su CSS
// no viajan con la home.

import "leaflet/dist/leaflet.css"
import { useEffect, useRef } from "react"
import L from "leaflet"
import {
  PUNTOS_HIDRATACION,
  PUNTOS_RUTA,
  acumularDistancias,
  posicionEnRuta,
  sentidoHorizontal,
  ubicarEnRuta,
} from "@/lib/recorrido"

/**
 * Segundos que tarda la bici en dar la vuelta entera (sin contar la parada). Es el mismo
 * en la PC y en el celular: antes, con "reducir movimiento" iba a 70 s, y como el ahorro
 * de bateria del telefono lo activa solo, en el celu la bici parecia arrastrarse.
 */
const VUELTA_S = 30
/** Segundos que la bici se queda en la hidratacion (lo que dura la animacion del globo). */
const PARADA_S = 4

const DORADO = "#ffd700"

// Icono de lucide "Bike", en SVG suelto: el marcador es HTML de Leaflet, no React.
const SVG_BICI = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`

/**
 * La lluvia de la hidratacion: gotas (y alguna fruta) que caen sobre todo el mapa mientras
 * la bici esta parada. Posiciones y tiempos fijos (no Math.random) para que el HTML sea
 * siempre el mismo.
 */
const LLUVIA = Array.from({ length: 30 }, (_, i) => ({
  emoji: i % 6 === 2 ? "🍌" : i % 6 === 5 ? "🍊" : "💧",
  izquierda: (i * 37 + (i % 3) * 11) % 100,
  demora: ((i * 0.37) % 1.6).toFixed(2),
  duracion: (1.1 + ((i * 0.23) % 0.7)).toFixed(2),
  tamano: 14 + ((i * 5) % 10),
}))

type Props = {
  /** La animacion corre solo con la seccion en pantalla y sin pausa del usuario. */
  enMovimiento: boolean
  onListo?: () => void
}

export default function MapaLeaflet({ enMovimiento, onListo }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const envoltura = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<L.Map | null>(null)
  const bici = useRef<L.Marker | null>(null)
  const recorrido = useRef<L.Polyline | null>(null)
  const movimiento = useRef(enMovimiento)
  movimiento.current = enMovimiento

  useEffect(() => {
    const nodo = contenedor.current
    if (!nodo || PUNTOS_RUTA.length < 2) return

    const celular = L.Browser.mobile
    const mapa = L.map(nodo, {
      // En el celular un dedo scrollea la pagina (no arrastra el mapa); con dos se mueve y se hace zoom.
      dragging: !celular,
      scrollWheelZoom: false,
      // Zoom entero: con zoom fraccionado se ven lineas finas entre los mosaicos.
      zoomSnap: 1,
      attributionControl: true,
    })

    // Mosaicos sin clave de API: OpenStreetMap (calles y caminos rurales) y el satelite de Esri.
    // (CARTO, el primero que se probo, ahora exige clave y pone una marca de agua.)
    const calles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(mapa)
    const satelite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 18, attribution: "Imágenes &copy; Esri, Maxar, Earthstar Geographics" },
    )
    L.control.layers({ Mapa: calles, "Satélite": satelite }, undefined, { position: "topright" }).addTo(mapa)

    // Halo oscuro + linea dorada: se lee sobre calles claras y oscuras.
    L.polyline(PUNTOS_RUTA, { color: "#000", weight: 9, opacity: 0.55, interactive: false }).addTo(mapa)
    const linea = L.polyline(PUNTOS_RUTA, { color: DORADO, weight: 4.5, opacity: 0.95, lineJoin: "round" }).addTo(mapa)
    // Lo ya pedaleado, mas brillante, crece detras de la bici.
    recorrido.current = L.polyline([], { color: "#fff7c2", weight: 5, opacity: 0.9, interactive: false }).addTo(mapa)

    // Margen extra arriba en el mapa grande (PC): la hidratacion queda en el borde norte y
    // el globo de la parada entra arriba de la bici. En el celular ese margen alejaba el mapa
    // un nivel de zoom; ahi el globo sale al costado (ver el efecto de la animacion).
    const margenArriba = nodo.clientHeight >= 400 ? 90 : 24
    mapa.fitBounds(linea.getBounds(), { paddingTopLeft: [24, margenArriba], paddingBottomRight: [24, 24] })
    mapaRef.current = mapa

    const salida = PUNTOS_RUTA[0]
    L.marker(salida, {
      title: "Salida y llegada",
      icon: L.divIcon({
        className: "",
        html: `<div class="gt-mapa-salida" aria-hidden="true">🏁</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
      keyboard: true,
    })
      .addTo(mapa)
      .bindPopup("<strong>Salida y llegada</strong><br/>Camping El Molino")

    for (const punto of PUNTOS_HIDRATACION) {
      L.marker(punto.posicion, {
        title: `${punto.detalle}: ${punto.nombre}`,
        icon: L.divIcon({
          className: "",
          html: `<div class="gt-mapa-agua" aria-hidden="true">💧</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
        keyboard: true,
      })
        .addTo(mapa)
        .bindTooltip(punto.detalle, { permanent: true, direction: "top", offset: [0, -16], className: "gt-mapa-etiqueta" })
        .bindPopup(`<strong>${punto.detalle}</strong><br/>${punto.nombre}`)
    }

    bici.current = L.marker(salida, {
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
      icon: L.divIcon({
        className: "",
        // El globo de la parada vive dentro del marcador, escondido (opacity 0) hasta que
        // la bici llega a la hidratacion: asi se anima solo con transform y opacity.
        html: `<div class="gt-mapa-ciclista">
            <div class="gt-mapa-globo" aria-hidden="true">
              <span class="gt-mapa-globo-titulo">¡A hidratarse!</span>
              <span class="gt-mapa-globo-items"><i>💧</i><i>🍌</i><i>🍊</i></span>
            </div>
            <div class="gt-mapa-bici">${SVG_BICI}</div>
          </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    }).addTo(mapa)

    onListo?.()

    return () => {
      mapa.remove()
      mapaRef.current = null
      bici.current = null
      recorrido.current = null
    }
    // onListo se llama una sola vez al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // La bici: un requestAnimationFrame que la corre por la ruta. Leaflet la ubica con
  // transform (translate3d), asi que moverla no rehace el layout de la pagina.
  useEffect(() => {
    if (PUNTOS_RUTA.length < 2) return
    const acumulados = acumularDistancias(PUNTOS_RUTA)
    const total = acumulados[acumulados.length - 1]
    const velocidad = total / VUELTA_S // metros por segundo
    // Donde frena: el punto de la ruta mas cercano a cada hidratacion (si queda pegado).
    const paradas = PUNTOS_HIDRATACION.map((p) => ubicarEnRuta(PUNTOS_RUTA, acumulados, p.posicion))
      .filter((u) => u.distancia < 100)
      .map((u) => u.metros)
    let paradaRestante = 0

    let metros = 0
    let anterior = 0
    let indiceEstela = 0
    let cuadro = 0
    let mirando: "izquierda" | "derecha" = "derecha"

    const paso = (ahora: number) => {
      cuadro = requestAnimationFrame(paso)
      const dt = anterior ? Math.min((ahora - anterior) / 1000, 0.1) : 0
      anterior = ahora
      if (!movimiento.current || document.hidden || !bici.current) return

      // En la hidratacion la bici se queda quieta mientras se ve el globo con agua y fruta.
      const ciclista = bici.current.getElement()?.querySelector(".gt-mapa-ciclista")
      if (paradaRestante > 0) {
        paradaRestante -= dt
        if (paradaRestante <= 0) {
          ciclista?.classList.remove("gt-mapa-parando")
          envoltura.current?.classList.remove("gt-mapa-en-parada")
        }
        return
      }

      const antes = metros
      metros += dt * velocidad
      const parada = paradas.find((m) => antes < m && metros >= m)
      if (parada !== undefined) {
        metros = parada
        paradaRestante = PARADA_S
        // Si arriba de la bici no entra el globo (celular), sale al costado.
        const enPantalla = mapaRef.current?.latLngToContainerPoint(posicionEnRuta(PUNTOS_RUTA, acumulados, metros))
        ciclista?.classList.toggle("gt-mapa-globo-costado", !!enPantalla && enPantalla.y < 85)
        ciclista?.classList.add("gt-mapa-parando")
        // La etiqueta fija "Punto de hidratacion" tapaba el globo: se esconde mientras dura.
        envoltura.current?.classList.add("gt-mapa-en-parada")
      }
      if (metros > total) {
        metros = 0
        indiceEstela = 0
        recorrido.current?.setLatLngs([])
      }
      const pos = posicionEnRuta(PUNTOS_RUTA, acumulados, metros)
      bici.current.setLatLng(pos)

      // El dibujo de la bici mira a la derecha: cuando la ruta va hacia el oeste se da
      // vuelta, si no parece que pedalea para atras. Solo se toca la clase al cambiar.
      const sentido = sentidoHorizontal(PUNTOS_RUTA, acumulados, metros)
      if (sentido && sentido !== mirando) {
        mirando = sentido
        bici.current.getElement()?.querySelector(".gt-mapa-bici")?.classList.toggle("gt-mapa-bici-izquierda", sentido === "izquierda")
      }

      // La estela se actualiza solo cuando la bici pasa un punto nuevo, no en cada cuadro.
      let nuevo = indiceEstela
      while (nuevo < acumulados.length - 1 && acumulados[nuevo + 1] <= metros) nuevo++
      if (nuevo !== indiceEstela || indiceEstela === 0) {
        indiceEstela = nuevo
        recorrido.current?.setLatLngs([...PUNTOS_RUTA.slice(0, indiceEstela + 1), pos])
      }
    }
    cuadro = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(cuadro)
  }, [])

  return (
    <div ref={envoltura} className="relative h-full w-full">
      <div
        ref={contenedor}
        className="h-full w-full"
        role="region"
        aria-label="Mapa interactivo del recorrido, con salida y llegada en el Camping El Molino y el punto de hidratación en la Escuela N° 6 Martín Rodríguez"
      />
      <div className="gt-mapa-lluvia" aria-hidden="true">
        {LLUVIA.map((gota, i) => (
          <span
            key={i}
            style={{
              left: `${gota.izquierda}%`,
              fontSize: gota.tamano,
              animationDelay: `${gota.demora}s`,
              animationDuration: `${gota.duracion}s`,
            }}
          >
            {gota.emoji}
          </span>
        ))}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ChevronRight,
  MapPin,
  Calendar,
  Users,
  Shield,
  Wrench,
  Droplet,
  Shirt,
  BadgeDollarSign,
  Bike,
  ArrowDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { EVENTO } from "@/lib/constants"
import { useCuposRestantes } from "@/hooks/useCuposRestantes"
import { useRemeraCerrada } from "@/hooks/use-remera-cerrada"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { REMERA_CERRADA_MENSAJE } from "@/lib/remeraDeadline"
import { NumeroAnimado } from "@/components/ui/NumeroAnimado"
import { CintaPalabras } from "@/components/ui/CintaPalabras"

// De que se trata, en palabras sueltas. Es lo primero que se mueve en la
// pagina y lo que aclara, sin un parrafo mas, que esto no es una carrera.
const PALABRAS = [
  "50 KM DE RIPIO",
  "A TU RITMO",
  "SIN CRONÓMETRO",
  "ENTRE AMIGOS",
  "RUINAS DEL VIEJO MOLINO",
  "ENTRE RÍOS",
  "PARADAS PARA LA FOTO",
  "VEHÍCULO DE APOYO",
]

export default function HeroSection() {
  const { disponibles, hayDatos } = useCuposRestantes()
  const { eventSettings } = useSupabaseContext()
  const remeraCerrada = useRemeraCerrada()
  const seccionRef = useRef<HTMLElement>(null)

  // Entrada del hero: se dispara apenas monta, asi el contenido entra en vez
  // de aparecer de golpe. Es la unica animacion que no espera al scroll.
  const [entro, setEntro] = useState(false)
  useEffect(() => {
    const cuadro = requestAnimationFrame(() => setEntro(true))
    return () => cancelAnimationFrame(cuadro)
  }, [])

  // Parallax: el fondo se mueve mas despacio que el contenido.
  //
  // Se escribe una variable CSS (--gt-scroll, de 0 a 1) sobre la seccion y el
  // resto lo hace el CSS con transform. Asi no hay ni un render de React por
  // cuadro, y con requestAnimationFrame el listener de scroll no corre mas de
  // una vez por cuadro.
  useEffect(() => {
    const nodo = seccionRef.current
    if (!nodo) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let pendiente = false

    const actualizar = () => {
      pendiente = false
      const avance = Math.min(Math.max(window.scrollY / Math.max(nodo.offsetHeight, 1), 0), 1)
      nodo.style.setProperty("--gt-scroll", avance.toFixed(3))
    }

    const alScrollear = () => {
      if (pendiente) return
      pendiente = true
      requestAnimationFrame(actualizar)
    }

    actualizar()
    window.addEventListener("scroll", alScrollear, { passive: true })
    return () => window.removeEventListener("scroll", alScrollear)
  }, [])

  // Cada bloque entra un poco despues que el anterior. El retraso va por
  // `style` y no por una clase de Tailwind: Tailwind lee el codigo como texto
  // y una clase armada con una variable nunca llega a generarse.
  const entrada = (retraso: number, extra = "") => ({
    className: `transition-all duration-700 ease-out ${
      entro ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
    } ${extra}`,
    style: { transitionDelay: `${retraso}ms` },
  })

  // El precio sale de event_settings (el mismo que cobra la inscripcion). Si
  // todavia no cargo no se muestra un numero inventado: queda la etiqueta sin
  // cifra hasta que llegue.
  const precio = eventSettings?.precio != null ? Number(eventSettings.precio) : null
  const precioTexto =
    precio != null && Number.isFinite(precio) ? `$${precio.toLocaleString("es-AR")}` : null

  const datosRapidos = [
    { icon: Calendar, label: "Cuándo", texto: EVENTO.fechaTexto, numero: null },
    { icon: MapPin, label: "Recorrido", texto: `${EVENTO.distancia} de ripio`, numero: null },
    {
      icon: Users,
      label: "Cupos",
      // Numero real o nada: "Limitados" es lo que se dice mientras la consulta
      // no responde, nunca un numero de relleno.
      texto: hayDatos ? (disponibles === 0 ? "Agotados" : "disponibles") : "Limitados",
      numero: hayDatos && disponibles ? disponibles : null,
    },
  ]

  const incluido = [
    { icon: Shield, text: "Seguro incluido" },
    { icon: Wrench, text: "Apoyo mecánico" },
    { icon: Droplet, text: "Hidratación en ruta" },
  ]

  const claseBoton =
    "gt-brillo w-full sm:w-auto group px-4 sm:px-8 py-3 sm:py-6 text-sm sm:text-lg font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black hover:scale-105 transition-transform duration-300 rounded-lg sm:rounded-xl shadow-lg shadow-yellow-500/25"

  return (
    <section
      ref={seccionRef}
      id="inicio"
      className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden bg-black"
    >
      {/* Fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-yellow-900/30" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,215,0,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,193,7,0.1),transparent_50%)]" />
      </div>

      {/* Manchas doradas que flotan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl animate-float-slow-delayed" />
      </div>

      {/* Foto de fondo con parallax. Es la imagen mas grande del primer
          pantallazo: va con `priority` para que el navegador la pida antes
          que al resto. */}
      <div className="absolute inset-0 opacity-20 gt-parallax" aria-hidden="true">
        <Image
          src="/ciclista-en-monta-a-silueta.jpg"
          alt=""
          fill
          className="object-cover"
          priority
          quality={65}
          sizes="100vw"
        />
      </div>

      {/* Overlay de proteccion de texto: garantiza contraste AA del titulo y la
          bajada sobre la imagen y los gradientes de fondo. */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/60"
        aria-hidden="true"
      />

      {/* Silueta que cruza el hero, despacio, una y otra vez. */}
      <div
        className="pointer-events-none absolute bottom-[18%] left-0 right-0 hidden sm:block opacity-[0.16]"
        aria-hidden="true"
      >
        <Bike className="gt-ciclista w-10 h-10 text-yellow-400" />
      </div>

      {/* Contenido */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto text-center">
          {/* Etiqueta: lo primero que aclara de que se trata */}
          <div {...entrada(0, "flex justify-center mb-4 sm:mb-6")}>
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-yellow-400 backdrop-blur-sm">
              <Bike className="h-3.5 w-3.5" aria-hidden="true" />
              Cicloturismo · no es una carrera
            </span>
          </div>

          <h1 className="font-heading text-hero mb-3 sm:mb-6 leading-none">
            <span {...entrada(80, "block text-white")}>1er CICLOTURISMO</span>
            <span {...entrada(180, "block text-yellow-400 text-[0.72em] mt-1")}>
              RUINAS DEL VIEJO MOLINO
            </span>
          </h1>

          <p
            {...entrada(
              280,
              "text-sm sm:text-base md:text-lg lg:text-xl text-gray-100 mb-3 sm:mb-5 max-w-2xl mx-auto leading-relaxed px-2",
            )}
          >
            <span className="text-yellow-400 font-semibold">{EVENTO.distancia} de ripio</span> por los caminos de
            Concepción del Uruguay. Se sale juntos, se vuelve juntos y se para a sacar fotos.
          </p>

          {/* Precio: visible pero deliberadamente discreto dentro del hero */}
          <div {...entrada(340, "mb-4 sm:mb-6 flex justify-center")}>
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-black/35 px-3 py-1.5 text-xs sm:text-sm text-zinc-300 backdrop-blur-sm">
              <BadgeDollarSign className="h-4 w-4 text-yellow-400" aria-hidden="true" />
              <span>Inscripción</span>
              <span className="font-bold text-yellow-400">{precioTexto ?? "—"}</span>
            </div>
          </div>

          {/* Datos rapidos */}
          <div {...entrada(400, "grid grid-cols-3 gap-1.5 sm:gap-4 mb-4 sm:mb-8 max-w-3xl mx-auto")}>
            {datosRapidos.map((dato) => {
              const Icono = dato.icon
              return (
                <div
                  key={dato.label}
                  className="glass p-1.5 sm:p-4 rounded-md sm:rounded-xl transition-transform duration-300 hover:-translate-y-1 hover:bg-yellow-400/5"
                >
                  <Icono className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-yellow-400 mx-auto mb-0.5 sm:mb-2" aria-hidden="true" />
                  <p className="text-[11px] sm:text-sm text-gray-300 leading-tight">{dato.label}</p>
                  <p className="text-xs sm:text-base text-white font-bold leading-tight">
                    {dato.numero != null ? (
                      <>
                        <NumeroAnimado valor={dato.numero} duracion={1200} /> {dato.texto}
                      </>
                    ) : (
                      dato.texto
                    )}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Botones */}
          <div
            {...entrada(
              470,
              "flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center items-center mb-4 sm:mb-0",
            )}
          >
            <Link href="/inscripcion" className="w-full sm:w-auto">
              <Button size="lg" className={claseBoton}>
                Quiero inscribirme
                <ChevronRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            {remeraCerrada ? (
              <Button
                size="lg"
                disabled
                aria-disabled
                title={REMERA_CERRADA_MENSAJE}
                className="w-full sm:w-auto px-4 sm:px-8 py-3 sm:py-6 text-sm sm:text-lg font-bold bg-zinc-700 text-zinc-300 rounded-lg sm:rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Pedidos de remera cerrados
                <Shirt className="ml-2 w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </Button>
            ) : (
              <Link href="/pedir-remera" className="w-full sm:w-auto">
                <Button size="lg" className={claseBoton}>
                  Pedir remera
                  <Shirt className="ml-2 w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                </Button>
              </Link>
            )}

            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto px-4 sm:px-8 py-3 sm:py-6 text-sm sm:text-lg font-semibold border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-colors duration-300 rounded-lg sm:rounded-xl bg-transparent"
              asChild
            >
              <a href="#detalles">Ver el recorrido</a>
            </Button>
          </div>

          {/* Lo que esta incluido */}
          <div
            {...entrada(
              540,
              "mt-8 sm:mt-14 flex flex-wrap justify-center items-center gap-3 sm:gap-6 lg:gap-8 text-gray-300 text-xs sm:text-sm",
            )}
          >
            {incluido.map((item) => {
              const Icono = item.icon
              return (
                <div key={item.text} className="flex items-center gap-1 sm:gap-2 hover:text-yellow-400 transition-colors">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-400/20 rounded-full flex items-center justify-center">
                    <Icono className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" aria-hidden="true" />
                  </div>
                  <span className="whitespace-nowrap">{item.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Cinta de palabras al pie del hero */}
      <div
        {...entrada(
          620,
          "relative z-10 w-full border-y border-yellow-400/15 bg-black/40 py-2.5 backdrop-blur-sm",
        )}
      >
        <CintaPalabras
          palabras={PALABRAS}
          duracion={45}
          className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400"
        />
      </div>

      {/* Indicador de scroll */}
      <a
        href="#nosotros"
        className="absolute bottom-20 left-1/2 -translate-x-1/2 cursor-pointer hidden md:flex flex-col items-center gap-1 text-yellow-400/70 hover:text-yellow-400 transition-colors"
        aria-label="Ver el resto de la página"
      >
        <span className="text-[10px] uppercase tracking-[0.2em]">Seguí bajando</span>
        <ArrowDown className="gt-indicador-scroll w-4 h-4" aria-hidden="true" />
      </a>
    </section>
  )
}

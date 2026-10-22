"use client"

import { useEffect, useRef } from "react"
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
    // En celular no: el scroll tactil corre fuera del hilo de JavaScript y el
    // fondo llegaba un cuadro tarde, a los saltos. Ahi queda quieto.
    if (window.matchMedia("(max-width: 767px), (pointer: coarse)").matches) return

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

  // Cada bloque entra un poco despues que el anterior. Es una animacion CSS
  // (.gt-entrar en globals.css), no un estado de React: arranca con el HTML del
  // servidor y no espera a que el JavaScript cargue. El retraso va por `style`
  // y no por una clase de Tailwind: Tailwind lee el codigo como texto y una
  // clase armada con una variable nunca llega a generarse.
  const entrada = (retraso: number, extra = "") => ({
    className: `gt-entrar ${extra}`,
    style: { animationDelay: `${retraso}ms` },
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

  // Alto de los botones: chicos en celular (tienen que entrar con todo lo demas
  // en una sola pantalla) y mas generosos desde tablet.
  const tamanoBoton = "h-11 [@media(max-height:620px)]:h-10 sm:h-auto px-3 sm:px-7 py-0 sm:py-4 lg:py-5 text-sm sm:text-base lg:text-lg rounded-lg sm:rounded-xl"

  const claseBoton = `gt-brillo w-full sm:w-auto group ${tamanoBoton} font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black hover:scale-105 transition-transform duration-300 shadow-lg shadow-yellow-500/25`

  return (
    // Todo el primer pantallazo (menu, titulo, datos, botones, lo incluido y la
    // cinta) entra en el alto de la pantalla, desde un celular chico hasta una
    // notebook. Los espacios y el titulo se achican con el ALTO (svh), no solo
    // con el ancho: una notebook de 768 px de alto es ancha pero baja.
    // pt-20 = alto del menu fijo, que se apoya encima del hero.
    <section
      ref={seccionRef}
      id="inicio"
      className="relative min-h-[100svh] flex flex-col overflow-hidden bg-black pt-20"
    >
      {/* Fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-yellow-900/30" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,215,0,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,193,7,0.1),transparent_50%)]" />
      </div>

      {/* Manchas doradas que flotan. En celular no: son capas enormes con blur
          que el telefono tiene que volver a pintar en cada cuadro. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block" aria-hidden="true">
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
      <div className="relative z-10 flex flex-1 items-center w-full">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-[clamp(0.5rem,2.5svh,2rem)] [@media(max-height:600px)]:py-1">
        {/* Un solo `gap` que depende del alto de la pantalla reemplaza los
            margenes de cada bloque: en una pantalla baja se juntan todos parejo. */}
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center gap-[clamp(0.375rem,1.8svh,1.5rem)]">
          {/* Etiqueta: lo primero que aclara de que se trata */}
          <div {...entrada(0, "flex justify-center")}>
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-yellow-400">
              <Bike className="h-3.5 w-3.5" aria-hidden="true" />
              Cicloturismo · no es una carrera
            </span>
          </div>

          {/* El titulo toma el menor entre el tamaño de siempre (--text-hero),
              el que hace entrar "1er CICLOTURISMO" en UNA linea (8.2vw; antes
              en celular eran cuatro renglones) y un 10% del alto, para que en
              una notebook baja no se coma la pantalla. */}
          <h1 className="font-heading text-[length:min(var(--text-hero),8.2vw,10svh)] leading-[0.95]">
            <span {...entrada(80, "block text-white")}>1er CICLOTURISMO</span>
            <span {...entrada(180, "block text-yellow-400 text-[0.72em] mt-1")}>
              RUINAS DEL VIEJO MOLINO
            </span>
          </h1>

          <p
            {...entrada(
              280,
              "text-sm [@media(max-height:620px)]:text-[13px] sm:text-base md:text-lg lg:text-xl text-gray-100 max-w-2xl mx-auto leading-snug sm:leading-relaxed px-2",
            )}
          >
            <span className="text-yellow-400 font-semibold">{EVENTO.distancia} de ripio</span> por los caminos de
            Concepción del Uruguay. Se sale juntos, se vuelve juntos y se para a sacar fotos.
          </p>

          {/* Precio: visible pero deliberadamente discreto dentro del hero */}
          <div {...entrada(340, "flex justify-center")}>
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-black/50 px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-zinc-300">
              <BadgeDollarSign className="h-4 w-4 text-yellow-400" aria-hidden="true" />
              <span>Inscripción</span>
              <span className="font-bold text-yellow-400">{precioTexto ?? "—"}</span>
            </div>
          </div>

          {/* Datos rapidos */}
          <div {...entrada(400, "grid grid-cols-3 gap-1.5 sm:gap-4 w-full max-w-3xl mx-auto")}>
            {datosRapidos.map((dato) => {
              const Icono = dato.icon
              return (
                <div
                  key={dato.label}
                  className="glass p-1.5 sm:p-3 lg:p-4 rounded-md sm:rounded-xl transition-transform duration-300 hover:-translate-y-1 hover:bg-yellow-400/5"
                >
                  <Icono className="w-3.5 h-3.5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-400 mx-auto mb-0.5 sm:mb-1.5" aria-hidden="true" />
                  <p className="text-[11px] sm:text-sm text-gray-300 leading-tight">{dato.label}</p>
                  <p className="text-[11px] min-[400px]:text-xs sm:text-base text-white font-bold leading-tight">
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

          {/* Botones. En celular: "Quiero inscribirme" a todo el ancho y abajo
              la remera con el link al recorrido lado a lado (apilados eran tres
              filas y empujaban lo incluido y la cinta fuera de la pantalla). */}
          <div
            {...entrada(
              470,
              "grid grid-cols-2 gap-2 w-full max-w-md sm:max-w-none sm:flex sm:flex-row sm:gap-4 sm:justify-center sm:items-center",
            )}
          >
            <Link href="/inscripcion" className="col-span-2 w-full sm:w-auto">
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
                className={`w-full sm:w-auto ${tamanoBoton} font-bold bg-zinc-700 text-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {/* En media pantalla de celular el texto largo no entra */}
                <span className="sm:hidden">Remera cerrada</span>
                <span className="hidden sm:inline">Pedidos de remera cerrados</span>
                <Shirt className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </Button>
            ) : (
              <Link href="/pedir-remera" className="w-full sm:w-auto">
                <Button size="lg" className={claseBoton}>
                  Pedir remera
                  <Shirt className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                </Button>
              </Link>
            )}

            {/* Link de texto, no boton: los botones quedan para inscribirse y
                pedir la remera. En celular ocupa la media fila al lado de la
                remera, asi no suma alto. */}
            <a
              href="#detalles"
              className="group inline-flex items-center justify-center gap-1 h-11 [@media(max-height:620px)]:h-10 sm:h-auto px-2 text-sm sm:text-base lg:text-lg font-semibold text-yellow-400 underline-offset-4 hover:underline"
            >
              Ver el recorrido
              <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
            </a>
          </div>

          {/* Lo que esta incluido */}
          <div
            {...entrada(
              540,
              "flex flex-wrap justify-center items-center gap-x-3 gap-y-1 sm:gap-6 lg:gap-8 text-gray-300 text-[11px] sm:text-sm",
            )}
          >
            {incluido.map((item) => {
              const Icono = item.icon
              return (
                <div key={item.text} className="flex items-center gap-1 sm:gap-2 hover:text-yellow-400 transition-colors">
                  <div className="w-5 h-5 sm:w-7 sm:h-7 bg-yellow-400/20 rounded-full flex items-center justify-center">
                    <Icono className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" aria-hidden="true" />
                  </div>
                  <span className="whitespace-nowrap">{item.text}</span>
                </div>
              )
            })}
          </div>
        </div>
        </div>
      </div>

      {/* Cinta de palabras al pie del hero. Sin backdrop-blur en celular: la
          cinta se mueve sin parar y el desenfoque se recalculaba cada cuadro. */}
      <div
        {...entrada(
          620,
          "relative z-10 w-full border-y border-yellow-400/15 bg-black/70 sm:bg-black/40 sm:backdrop-blur-sm py-2 sm:py-2.5",
        )}
      >
        <CintaPalabras
          palabras={PALABRAS}
          duracion={45}
          className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400"
        />
      </div>

      {/* Indicador de scroll: solo si sobra alto (.gt-indicador-alto) */}
      <a
        href="#nosotros"
        className="gt-indicador-alto absolute bottom-16 left-1/2 -translate-x-1/2 cursor-pointer flex-col items-center gap-1 text-yellow-400/70 hover:text-yellow-400 transition-colors"
        aria-label="Ver el resto de la página"
      >
        <span className="text-[10px] uppercase tracking-[0.2em]">Seguí bajando</span>
        <ArrowDown className="gt-indicador-scroll w-4 h-4" aria-hidden="true" />
      </a>
    </section>
  )
}

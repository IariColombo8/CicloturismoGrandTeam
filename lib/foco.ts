/**
 * Llevar a la persona hasta el campo que le falta completar.
 *
 * La idea: cuando falta un dato, nadie tiene que buscarlo. La pantalla se mueve
 * sola hasta el campo, le aparece un anillo dorado que late y, si se puede
 * escribir ahí, queda listo para escribir. El anillo se apaga en cuanto la
 * persona carga algo (o a los pocos segundos), así no queda una pantalla llena
 * de marcas rojas.
 *
 * Trabaja por `id`, así que sirve para cualquier campo del formulario sin tener
 * que tocar cada componente.
 */

const CLASE = "gt-resaltado"
const DURACION_MS = 7_000

/** Lo que hay que completar, con el nombre que la persona ve en pantalla. */
export interface CampoFaltante {
  /** id del elemento al que hay que llevar a la persona. */
  id: string
  /** Cómo se llama el campo en la pantalla. */
  etiqueta: string
  /** Una línea que explique qué poner. */
  ayuda: string
}

/** Quita el anillo de todos los campos marcados. */
export function limpiarResaltados() {
  if (typeof document === "undefined") return
  document.querySelectorAll(`.${CLASE}`).forEach((el) => el.classList.remove(CLASE))
}

/**
 * Mueve la pantalla hasta el campo, lo marca y le da el foco.
 * Devuelve false si el campo no está en pantalla (por ejemplo, porque es de
 * otro paso del formulario).
 */
export function irAlCampo(id: string): boolean {
  if (typeof document === "undefined") return false

  const elemento = document.getElementById(id)
  if (!elemento) return false

  limpiarResaltados()

  // El anillo va alrededor de todo el campo (etiqueta, ayuda y control), no
  // solo del input: `data-campo` lo marca en los pasos del formulario.
  const marco = (elemento.closest("[data-campo]") as HTMLElement | null) ?? elemento
  marco.classList.add(CLASE)

  try {
    marco.scrollIntoView({ behavior: "smooth", block: "center" })
  } catch {
    marco.scrollIntoView()
  }

  // El foco va después del desplazamiento: si se hace antes, el navegador
  // salta de golpe y se pierde el movimiento suave.
  window.setTimeout(() => {
    const paraEscribir = elemento as HTMLElement
    try {
      paraEscribir.focus({ preventScroll: true })
    } catch {
      // Un contenedor no se puede enfocar y no pasa nada.
    }
  }, 400)

  const apagar = () => marco.classList.remove(CLASE)
  elemento.addEventListener("input", apagar, { once: true })
  elemento.addEventListener("change", apagar, { once: true })
  // Para los grupos de botones (sí/no), que no disparan "input".
  marco.addEventListener("click", apagar, { once: true })
  window.setTimeout(apagar, DURACION_MS)

  return true
}

// Convierte el <svg> del QR renderizado por qrcode.react en un PNG y lo
// descarga. Se usa en /inscripcion/exito y en /mi-qr.

const TAMANO_PNG = 400

export function descargarQRDesdeSVG(contenedor: HTMLElement | null, nombreArchivo: string) {
  const svg = contenedor?.querySelector("svg")
  if (!svg) return

  const svgData = new XMLSerializer().serializeToString(svg)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  const img = new Image()

  img.onload = () => {
    canvas.width = TAMANO_PNG
    canvas.height = TAMANO_PNG
    if (ctx) {
      // Fondo blanco: sin esto el PNG queda transparente y el QR no se lee
      // sobre fondos oscuros.
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, TAMANO_PNG, TAMANO_PNG)
      ctx.drawImage(img, 0, 0, TAMANO_PNG, TAMANO_PNG)
    }

    const link = document.createElement("a")
    link.download = nombreArchivo
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
}

/** "QR-GrandTeam-007.png" o "QR-GrandTeam-inscripcion.png" si no hay numero. */
export function nombreArchivoQR(numero: number | string | null | undefined): string {
  if (numero == null || numero === "") return "QR-GrandTeam-inscripcion.png"
  return `QR-GrandTeam-${String(numero).padStart(3, "0")}.png`
}

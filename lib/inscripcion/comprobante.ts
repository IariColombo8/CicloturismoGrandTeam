/**
 * Preparación del comprobante de pago en el navegador.
 *
 * Regla de oro: esto NUNCA lanza una excepción ni bloquea la inscripción. Un
 * comprobante de 30 MB, una foto HEIC del iPhone, un PDF gigante o un archivo
 * que el navegador no sabe leer tienen que terminar igual en una inscripción
 * guardada. Si el archivo no se puede mandar, la inscripción viaja con una
 * nota explicando por qué, y el equipo se lo pide a la persona.
 *
 * Las fotos se reducen acá (no hay límite de tamaño de entrada): una captura
 * de 20 MB llega al servidor como ~400 KB.
 */

/** Tope del cuerpo del request. Vercel corta los bodies grandes. */
const MAX_BASE64_BYTES = 3 * 1024 * 1024

const OBJETIVO_KB = 450
const ANCHOS = [1600, 1200, 900, 700]

export interface ComprobantePreparado {
  /** Data URL lista para enviar, o "" si no se pudo incluir el archivo. */
  base64: string
  /** Nombre original, para que el equipo sepa qué pedir. */
  nombreArchivo: string
  /** Peso original en bytes. */
  pesoOriginal: number
  /** Por qué quedó sin archivo. Vacío si viajó bien. */
  motivo: string
}

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`

function leerComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ""))
      reader.onerror = () => resolve("")
      reader.readAsDataURL(file)
    } catch {
      resolve("")
    }
  })
}

/**
 * Decodifica la imagen. Intenta primero createImageBitmap, que soporta más
 * formatos (HEIC en Safari) y no obliga a pasar el archivo entero a texto.
 */
async function decodificar(file: File): Promise<{ ancho: number; alto: number; dibujar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void } | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        ancho: bitmap.width,
        alto: bitmap.height,
        dibujar: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      }
    } catch {
      // Sigue por el camino clásico.
    }
  }

  const dataUrl = await leerComoDataUrl(file)
  if (!dataUrl) return null

  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.onload = () =>
        resolve({
          ancho: img.width,
          alto: img.height,
          dibujar: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
        })
      img.onerror = () => resolve(null)
      img.src = dataUrl
    } catch {
      resolve(null)
    }
  })
}

/** Comprime la imagen bajando ancho y calidad hasta que entre. */
async function comprimirImagen(file: File): Promise<string> {
  const fuente = await decodificar(file)
  if (!fuente) return ""

  const objetivo = Math.ceil(OBJETIVO_KB * 1024 * 1.37)

  for (const maxAncho of ANCHOS) {
    let ancho = fuente.ancho
    let alto = fuente.alto
    if (ancho > maxAncho) {
      alto = Math.max(1, Math.round((alto * maxAncho) / ancho))
      ancho = maxAncho
    }

    try {
      const canvas = document.createElement("canvas")
      canvas.width = ancho
      canvas.height = alto
      const ctx = canvas.getContext("2d")
      if (!ctx) continue
      fuente.dibujar(ctx, ancho, alto)

      for (const calidad of [0.8, 0.65, 0.5, 0.35]) {
        const base64 = canvas.toDataURL("image/jpeg", calidad)
        if (base64.length <= objetivo) return base64
        // Última chance: aunque no llegue al objetivo, si entra en el request
        // sirve igual.
        if (calidad === 0.35 && maxAncho === ANCHOS[ANCHOS.length - 1] && base64.length <= MAX_BASE64_BYTES) {
          return base64
        }
      }
    } catch {
      // Canvas sin memoria con fotos enormes: probamos un ancho menor.
    }
  }

  return ""
}

/**
 * Deja el comprobante listo para enviar. Nunca falla: si no se puede incluir
 * el archivo, devuelve `base64: ""` y el motivo.
 */
export async function prepararComprobante(file: File | null): Promise<ComprobantePreparado> {
  const base: ComprobantePreparado = {
    base64: "",
    nombreArchivo: file?.name || "",
    pesoOriginal: file?.size || 0,
    motivo: "",
  }

  if (!file) return { ...base, motivo: "La persona no adjuntó comprobante" }

  try {
    const tipo = (file.type || "").toLowerCase()
    const pareceImagen = tipo.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|gif|bmp|avif)$/i.test(file.name)

    if (pareceImagen) {
      const comprimido = await comprimirImagen(file)
      if (comprimido) return { ...base, base64: comprimido }
      // No se pudo decodificar (HEIC en Android, archivo dañado): si es
      // chico y de un tipo que el servidor acepta, va crudo.
      if (file.size <= MAX_BASE64_BYTES && /^image\/(jpeg|png|webp)$/.test(tipo)) {
        const crudo = await leerComoDataUrl(file)
        if (crudo) return { ...base, base64: crudo }
      }
      return {
        ...base,
        motivo: `No se pudo procesar la imagen (${file.name}, ${mb(file.size)}). Pedirle el comprobante por WhatsApp.`,
      }
    }

    if (tipo === "application/pdf" || /\.pdf$/i.test(file.name)) {
      if (file.size <= MAX_BASE64_BYTES) {
        const crudo = await leerComoDataUrl(file)
        if (crudo) return { ...base, base64: crudo }
      }
      return {
        ...base,
        motivo: `PDF de ${mb(file.size)}: demasiado grande para subirlo desde el formulario. Pedirle el comprobante por WhatsApp.`,
      }
    }

    return {
      ...base,
      motivo: `Archivo "${file.name}" (${mb(file.size)}) en un formato que no se puede subir. Pedirle el comprobante por WhatsApp.`,
    }
  } catch (error) {
    // Pase lo que pase, la inscripción sigue.
    const detalle = error instanceof Error ? error.message : "error desconocido"
    return { ...base, motivo: `No se pudo preparar el comprobante (${detalle}). Pedirle el comprobante por WhatsApp.` }
  }
}

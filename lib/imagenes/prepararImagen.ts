/**
 * Preparación de imágenes en el navegador (logos de sponsors, fotos de
 * alojamientos y premios).
 *
 * Misma regla que el comprobante de la inscripción: esto NUNCA lanza. Una foto
 * de 12 MB sacada con el celular, un HEIC de iPhone o un WEBP bajado de
 * Instagram tienen que terminar subidos igual. Si el navegador no puede
 * decodificar el archivo, se devuelve el original y que decida el servidor:
 * peor que subir una imagen grande es no poder cargar el sponsor.
 */

/** A partir de acá conviene comprimir. Por debajo va tal cual. */
const LIMITE_COMODO = 1.5 * 1024 * 1024

/** Techo real del bucket (10 MB). Dejamos margen. */
const LIMITE_DURO = 9 * 1024 * 1024

const ANCHOS = [1600, 1200, 900, 700]
const CALIDADES = [0.85, 0.7, 0.55, 0.4]

export interface ImagenPreparada {
  /** El archivo a subir: comprimido, o el original si no se pudo tocar. */
  archivo: File
  /** true si se redujo. Solo para avisar en pantalla. */
  comprimida: boolean
  /** Por qué no se pudo comprimir, si pasó. Nunca frena la subida. */
  aviso: string
}

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`

interface FuenteImagen {
  ancho: number
  alto: number
  dibujar: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

/** Decodifica con createImageBitmap (más formatos) y cae a <img> si no va. */
async function decodificar(file: File): Promise<FuenteImagen | null> {
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

  let url = ""
  try {
    url = URL.createObjectURL(file)
  } catch {
    return null
  }

  const fuente = await new Promise<FuenteImagen | null>((resolve) => {
    try {
      const img = new Image()
      img.onload = () => {
        resolve({
          ancho: img.naturalWidth || img.width,
          alto: img.naturalHeight || img.height,
          dibujar: (ctx: CanvasRenderingContext2D, w: number, h: number) =>
            ctx.drawImage(img, 0, 0, w, h),
        })
      }
      img.onerror = () => resolve(null)
      img.src = url
    } catch {
      resolve(null)
    }
  })

  try {
    URL.revokeObjectURL(url)
  } catch {
    /* da igual */
  }

  return fuente
}

function aBlob(canvas: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), tipo, calidad)
    } catch {
      resolve(null)
    }
  })
}

/**
 * Deja la imagen lista para subir. Nunca falla: en el peor caso devuelve el
 * archivo original con un aviso.
 */
export async function prepararImagen(file: File): Promise<ImagenPreparada> {
  const original: ImagenPreparada = { archivo: file, comprimida: false, aviso: "" }

  try {
    const tipo = (file.type || "").toLowerCase()

    // Los SVG son vectores: comprimirlos los rompería.
    if (tipo === "image/svg+xml" || /\.svg$/i.test(file.name)) return original

    // Un PNG chico (logo con transparencia) se sube tal cual: pasarlo por
    // canvas a JPEG le pondría fondo negro.
    if (file.size <= LIMITE_COMODO) return original

    const fuente = await decodificar(file)
    if (!fuente) {
      return {
        ...original,
        aviso:
          file.size > LIMITE_DURO
            ? `No se pudo reducir la imagen (${mb(file.size)}) en este dispositivo. Probá con una más liviana si falla la subida.`
            : "",
      }
    }

    // El PNG grande se conserva como PNG solo si no es una foto: si tiene
    // transparencia se nota. Simplificamos: todo lo pesado va a JPEG sobre
    // fondo blanco, que es lo que mejor se ve en las tarjetas del sitio.
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
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, ancho, alto)
        fuente.dibujar(ctx, ancho, alto)

        for (const calidad of CALIDADES) {
          const blob = await aBlob(canvas, "image/jpeg", calidad)
          if (!blob) continue
          if (blob.size <= LIMITE_COMODO || (blob.size < file.size && blob.size <= LIMITE_DURO)) {
            const nombre = file.name.replace(/\.[^.]+$/, "") || "imagen"
            return {
              archivo: new File([blob], `${nombre}.jpg`, { type: "image/jpeg" }),
              comprimida: true,
              aviso: "",
            }
          }
        }
      } catch {
        // Canvas sin memoria con fotos enormes: probamos un ancho menor.
      }
    }

    return {
      ...original,
      aviso: file.size > LIMITE_DURO ? `La imagen pesa ${mb(file.size)} y no se pudo reducir.` : "",
    }
  } catch (error) {
    // Pase lo que pase, se sube el original.
    return original
  }
}

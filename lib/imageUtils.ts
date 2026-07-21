function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"))
    reader.readAsDataURL(file)
  })
}

export const compressAndConvertToBase64 = async (file: File, maxSizeKB = 500): Promise<string> => {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("El comprobante supera los 5 MB")
  }

  // Los PDF no se rasterizan: se envían como Data URL y el servidor conserva su MIME.
  if (file.type === "application/pdf") {
    return readFileAsDataUrl(file)
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Formato de comprobante no permitido")
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen"))
          return
        }

        let width = img.width
        let height = img.height
        const maxWidth = 1200

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        let quality = 0.8
        let base64 = canvas.toDataURL("image/jpeg", quality)
        const maxBase64Length = Math.ceil(maxSizeKB * 1024 * 1.37)

        while (base64.length > maxBase64Length && quality > 0.1) {
          quality -= 0.1
          base64 = canvas.toDataURL("image/jpeg", quality)
        }

        resolve(base64)
      }

      img.onerror = () => reject(new Error("No se pudo cargar la imagen"))
      img.src = String(event.target?.result || "")
    }

    reader.onerror = () => reject(new Error("No se pudo leer el archivo"))
    reader.readAsDataURL(file)
  })
}

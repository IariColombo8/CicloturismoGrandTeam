export const compressAndConvertToBase64 = async (file: File, maxSizeKB = 500): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        // Calculate new dimensions (max 1200px width)
        let width = img.width
        let height = img.height
        const maxWidth = 1200

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)

        // Start with quality 0.8 and reduce if needed
        let quality = 0.8
        let base64 = canvas.toDataURL("image/jpeg", quality)

        // Reduce quality until file is under maxSizeKB
        while (base64.length > maxSizeKB * 1024 && quality > 0.1) {
          quality -= 0.1
          base64 = canvas.toDataURL("image/jpeg", quality)
        }

        resolve(base64)
      }

      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = event.target?.result as string
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}


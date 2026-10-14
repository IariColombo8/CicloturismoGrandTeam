"use client"

import ErrorPantalla from "@/components/ErrorPantalla"

/**
 * Error boundary de ultimo recurso: agarra lo que falla en el layout raiz
 * (providers, fuentes, etc), donde app/error.tsx ya no corre.
 * Reemplaza todo el documento, asi que lleva su propio <html>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#000" }}>
        <ErrorPantalla error={error} reset={reset} />
      </body>
    </html>
  )
}

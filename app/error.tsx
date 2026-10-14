"use client"

import ErrorPantalla from "@/components/ErrorPantalla"

/** Error boundary de las paginas: muestra el error en vez del cartel generico. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorPantalla error={error} reset={reset} />
}

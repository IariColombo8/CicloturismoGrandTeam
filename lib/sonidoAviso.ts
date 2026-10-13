// lib/sonidoAviso.ts
// Pitido corto para avisar en el panel que entro una inscripcion nueva.
// Se genera con WebAudio en vez de un mp3 para no sumar un asset ni una
// request mas al panel.

/**
 * Reproduce dos notas ascendentes (~0.3s en total).
 * No hace nada si el navegador no lo permite (por ejemplo, cuando el usuario
 * todavia no interactuo con la pagina): es un extra, no puede romper nada.
 */
export function reproducirAviso(): void {
  if (typeof window === "undefined") return

  try {
    const Contexto =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Contexto) return

    const ctx = new Contexto()
    const ahora = ctx.currentTime

    // Dos notas: La5 y Do#6.
    for (const [indice, frecuencia] of [880, 1108.73].entries()) {
      const osc = ctx.createOscillator()
      const volumen = ctx.createGain()

      osc.type = "sine"
      osc.frequency.value = frecuencia

      const inicio = ahora + indice * 0.14
      const fin = inicio + 0.13

      // Envolvente suave para que no suene como un click.
      volumen.gain.setValueAtTime(0.0001, inicio)
      volumen.gain.exponentialRampToValueAtTime(0.18, inicio + 0.02)
      volumen.gain.exponentialRampToValueAtTime(0.0001, fin)

      osc.connect(volumen)
      volumen.connect(ctx.destination)
      osc.start(inicio)
      osc.stop(fin + 0.02)
    }

    // Libera el contexto cuando termina el sonido.
    window.setTimeout(() => ctx.close().catch(() => undefined), 800)
  } catch {
    // Audio bloqueado por el navegador: se ignora.
  }
}

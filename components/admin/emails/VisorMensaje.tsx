"use client"

import { useEffect, useMemo, useRef, useState } from "react"

/**
 * Renderiza el cuerpo HTML de un email recibido dentro de un iframe con
 * sandbox. El HTML viene ya saneado del servidor (sanearHtmlEmail), pero el
 * iframe es la barrera real: sin allow-scripts ni allow-same-origin nada de lo
 * que llegue por correo puede tocar el panel ni leer la sesion.
 */
export default function VisorMensaje({ html, texto }: { html: string; texto: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [altura, setAltura] = useState(240)

  const documento = useMemo(() => {
    if (!html) return ""

    // CSP dentro del iframe: ni scripts ni frames, imagenes solo por http(s).
    return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data: cid:; style-src 'unsafe-inline'; font-src https: data:;">
<base target="_blank">
<style>
  html,body{margin:0;padding:0;background:#ffffff;}
  body{font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2937;word-break:break-word;}
  img{max-width:100%;height:auto;}
  table{max-width:100%;}
  a{color:#1d4ed8;}
</style></head><body>${html}</body></html>`
  }, [html])

  // El iframe no se auto-dimensiona: se mide el contenido y se ajusta la altura.
  useEffect(() => {
    if (!documento) return

    const iframe = iframeRef.current
    if (!iframe) return

    const medir = () => {
      try {
        const doc = iframe.contentDocument
        if (!doc?.body) return
        const alto = Math.max(doc.body.scrollHeight, doc.documentElement?.scrollHeight || 0)
        if (alto > 0) setAltura(Math.min(alto + 24, 4000))
      } catch {
        // Si el navegador bloquea el acceso al documento, queda la altura por defecto.
      }
    }

    iframe.addEventListener("load", medir)
    const reintento = window.setTimeout(medir, 350)

    return () => {
      iframe.removeEventListener("load", medir)
      window.clearTimeout(reintento)
    }
  }, [documento])

  if (!documento) {
    return (
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-zinc-300">
        {texto || "(mensaje sin contenido)"}
      </pre>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white">
      <iframe
        ref={iframeRef}
        title="Contenido del email"
        srcDoc={documento}
        sandbox=""
        referrerPolicy="no-referrer"
        className="w-full border-0"
        style={{ height: altura }}
      />
    </div>
  )
}

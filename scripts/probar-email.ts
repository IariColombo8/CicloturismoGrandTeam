// Envia un email de prueba usando las plantillas reales del repo, sin
// levantar el server de Next ni pasar por el panel. Sirve para iterar el
// diseño de los correos y verificar la conexion con Gmail.
//
// Uso:
//   npx tsx scripts/probar-email.ts                          -> confirmacion a GMAIL_SENDER
//   npx tsx scripts/probar-email.ts --para=alguien@mail.com
//   npx tsx scripts/probar-email.ts --plantilla=rechazo
//   npx tsx scripts/probar-email.ts --plantilla=generico

import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  // Los imports van despues de cargar .env.local: lib/google/oauth lee las
  // variables al ejecutarse.
  const { enviarEmail } = await import("../lib/google/gmail")
  const { templateConfirmacion, templateRechazo, templateGenerico } = await import(
    "../lib/email/templates"
  )

  const arg = (nombre: string): string | undefined =>
    process.argv.find((a) => a.startsWith(`--${nombre}=`))?.split("=").slice(1).join("=")

  const para = arg("para") || process.env.GMAIL_SENDER || ""
  const plantilla = arg("plantilla") || "confirmacion"

  if (!para) {
    console.error("Falta el destinatario: pasá --para=alguien@mail.com o definí GMAIL_SENDER")
    process.exit(1)
  }

  const render =
    plantilla === "rechazo"
      ? templateRechazo({
          nombreCompleto: "Juan Perez",
          motivo: "El comprobante de pago no se puede leer. Reenvialo en mejor calidad.",
        })
      : plantilla === "generico"
        ? templateGenerico({
            nombreCompleto: "Juan Perez",
            titulo: "Nos vemos el 8 de noviembre",
            mensaje:
              "Te recordamos que la acreditacion abre a las 7:00 en el camping El Viejo Molino.\n\nLleva tu codigo QR y un documento.",
            boton: { texto: "Ver el sitio", url: "https://grand-team.vercel.app" },
          })
        : templateConfirmacion({
            nombreCompleto: "Juan Perez",
            numeroInscripcion: 42,
            tokenQR: "prueba-token-qr-0000-1111",
          })

  console.log(`\nEnviando plantilla "${plantilla}" a ${para}...`)
  console.log(`Asunto: ${render.asunto}`)

  const resultado = await enviarEmail({
    para,
    asunto: render.asunto,
    html: render.html,
    texto: render.texto,
  })

  console.log(`\nEnviado. id=${resultado.id} threadId=${resultado.threadId}\n`)
}

main().catch((error) => {
  console.error(`\nFallo el envio: ${error instanceof Error ? error.message : error}\n`)
  process.exit(1)
})

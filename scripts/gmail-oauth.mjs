// Obtiene el GOOGLE_REFRESH_TOKEN de la cuenta de Gmail del evento.
//
// Uso:
//   npm run gmail:auth
//
// Requisitos en .env.local (los de Google Cloud Console, ver docs/gmail-setup.md):
//   GOOGLE_CLIENT_ID=...
//   GOOGLE_CLIENT_SECRET=...
//
// El script levanta un servidor local en http://localhost:5987/callback, abre
// el consentimiento de Google en el navegador y al volver imprime el refresh
// token para pegarlo en .env.local (y en Vercel).
//
// IMPORTANTE: en Google Cloud Console, el cliente OAuth debe tener
// http://localhost:5987/callback como "URI de redireccionamiento autorizado".

import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import { spawn } from "node:child_process"

const PUERTO = 5987
const REDIRECT_URI = `http://localhost:${PUERTO}/callback`

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
]

function leerEnvLocal() {
  try {
    return Object.fromEntries(
      readFileSync(".env.local", "utf8")
        .split(/\r?\n/)
        .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=")
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
        })
    )
  } catch {
    return {}
  }
}

const env = leerEnvLocal()
const clientId = process.env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error("\nFaltan GOOGLE_CLIENT_ID y/o GOOGLE_CLIENT_SECRET en .env.local")
  console.error("Creá las credenciales OAuth siguiendo docs/gmail-setup.md\n")
  process.exit(1)
}

const urlConsentimiento = new URL("https://accounts.google.com/o/oauth2/v2/auth")
urlConsentimiento.searchParams.set("client_id", clientId)
urlConsentimiento.searchParams.set("redirect_uri", REDIRECT_URI)
urlConsentimiento.searchParams.set("response_type", "code")
urlConsentimiento.searchParams.set("scope", SCOPES.join(" "))
// access_type=offline + prompt=consent garantizan que Google devuelva un
// refresh_token incluso si la cuenta ya habia autorizado la app antes.
urlConsentimiento.searchParams.set("access_type", "offline")
urlConsentimiento.searchParams.set("prompt", "consent")

function abrirNavegador(url) {
  const plataforma = process.platform
  try {
    if (plataforma === "win32") {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref()
    } else if (plataforma === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref()
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref()
    }
  } catch {
    // Si no se puede abrir, el usuario copia la URL a mano.
  }
}

async function canjearCodigo(code) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error_description || data.error || `HTTP ${res.status}`)
  }
  return data
}

async function obtenerCasilla(accessToken) {
  try {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json()
    return data.emailAddress || null
  } catch {
    return null
  }
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`)

  if (url.pathname !== "/callback") {
    res.writeHead(404).end("No encontrado")
    return
  }

  const error = url.searchParams.get("error")
  const code = url.searchParams.get("code")

  const responderHtml = (titulo, detalle, color) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
    res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${titulo}</title></head>
<body style="font-family:system-ui,sans-serif;background:#000;color:#fff;display:grid;place-items:center;height:100vh;margin:0;text-align:center">
<div><h1 style="color:${color};margin:0 0 12px">${titulo}</h1>
<p style="color:#aaa;max-width:460px;line-height:1.6">${detalle}</p></div>
</body></html>`)
  }

  if (error) {
    responderHtml("Autorizacion cancelada", `Google devolvio: ${error}`, "#f87171")
    console.error(`\nAutorizacion cancelada: ${error}\n`)
    servidor.close()
    process.exit(1)
  }

  if (!code) {
    res.writeHead(400).end("Falta el parametro code")
    return
  }

  try {
    const tokens = await canjearCodigo(code)
    const casilla = await obtenerCasilla(tokens.access_token)

    responderHtml(
      "Listo",
      "Ya podes cerrar esta pestaña y volver a la terminal: el refresh token se imprimio ahi.",
      "#ffd700"
    )

    console.log("\n" + "=".repeat(70))
    console.log("  AUTORIZACION COMPLETADA")
    console.log("=".repeat(70))
    if (casilla) console.log(`\n  Casilla autorizada: ${casilla}`)
    console.log("\n  Pegá estas lineas en .env.local (y en las Environment Variables de Vercel):\n")
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token || "(Google no devolvio refresh_token)"}`)
    if (casilla) console.log(`GMAIL_SENDER=${casilla}`)
    console.log(`GMAIL_SENDER_NAME=Grand Team Bike`)

    if (!tokens.refresh_token) {
      console.log(
        "\n  Google no devolvio refresh_token. Revocá el acceso de la app en\n" +
          "  https://myaccount.google.com/permissions y corré el script de nuevo."
      )
    }

    console.log("\n" + "=".repeat(70) + "\n")
  } catch (e) {
    responderHtml("Error al canjear el codigo", String(e.message || e), "#f87171")
    console.error(`\nError al canjear el codigo: ${e.message || e}\n`)
    servidor.close()
    process.exit(1)
  }

  servidor.close()
  process.exit(0)
})

servidor.listen(PUERTO, () => {
  console.log("\nAbriendo el consentimiento de Google en el navegador...")
  console.log("Si no se abre solo, copiá esta URL:\n")
  console.log(urlConsentimiento.toString() + "\n")
  console.log(`Esperando el callback en ${REDIRECT_URI} ...\n`)
  abrirNavegador(urlConsentimiento.toString())
})

servidor.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`\nEl puerto ${PUERTO} esta ocupado. Cerrá lo que lo use y reintentá.\n`)
  } else {
    console.error(`\nError del servidor local: ${e.message}\n`)
  }
  process.exit(1)
})

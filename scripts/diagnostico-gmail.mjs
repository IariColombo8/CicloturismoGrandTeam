// Diagnostico de la integracion con Gmail API.
// Verifica, sin levantar el server de Next:
//   1. que esten las variables en .env.local
//   2. que el refresh token siga sirviendo
//   3. que se pueda leer la bandeja
//   4. (opcional) que se pueda enviar
//
// Uso:
//   node scripts/diagnostico-gmail.mjs
//   node scripts/diagnostico-gmail.mjs --enviar          -> mail de prueba a GMAIL_SENDER
//   node scripts/diagnostico-gmail.mjs --enviar=otro@mail.com

import { readFileSync } from "node:fs"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const ok = (m) => console.log(`  OK    ${m}`)
const fail = (m) => console.log(`  FALLA ${m}`)

console.log("\n=== Diagnostico Gmail API ===\n")

// 1. Variables -------------------------------------------------------------
const requeridas = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GMAIL_SENDER"]
const faltantes = requeridas.filter((v) => !env[v])

if (faltantes.length) {
  fail(`faltan variables en .env.local: ${faltantes.join(", ")}`)
  console.log("\n  Corré `npm run gmail:auth` y pegá lo que imprime.\n")
  process.exit(1)
}
ok("variables de entorno completas")
console.log(`        remitente: ${env.GMAIL_SENDER} (${env.GMAIL_SENDER_NAME || "sin nombre"})`)

// 2. Access token ----------------------------------------------------------
let accessToken
try {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || data.error || `HTTP ${res.status}`)
  accessToken = data.access_token
  ok(`access token renovado (vence en ${data.expires_in}s)`)
} catch (e) {
  fail(`no se pudo renovar el access token: ${e.message}`)
  console.log(
    "\n  Si dice invalid_grant: la app OAuth quedo en modo Testing (el token vence\n" +
      "  a los 7 dias) o se revoco el acceso. Publicá la app y corré `npm run gmail:auth`.\n"
  )
  process.exit(1)
}

const api = async (path, init) => {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init?.headers || {}) },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`)
  return data
}

// 3. Perfil y lectura ------------------------------------------------------
try {
  const perfil = await api("/profile")
  ok(`casilla conectada: ${perfil.emailAddress}`)
  console.log(`        ${perfil.messagesTotal} mensajes, ${perfil.threadsTotal} hilos`)

  if (perfil.emailAddress.toLowerCase() !== env.GMAIL_SENDER.toLowerCase()) {
    fail(`GMAIL_SENDER (${env.GMAIL_SENDER}) no coincide con la casilla autorizada`)
  }
} catch (e) {
  fail(`no se pudo leer el perfil: ${e.message}`)
  process.exit(1)
}

try {
  const lista = await api("/threads?maxResults=3&labelIds=INBOX")
  const cantidad = (lista.threads || []).length
  ok(`lectura de la bandeja (${cantidad} hilo(s) de muestra)`)

  for (const t of lista.threads || []) {
    const hilo = await api(`/threads/${t.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`)
    const h = hilo.messages?.[0]?.payload?.headers || []
    const buscar = (n) => h.find((x) => x.name.toLowerCase() === n)?.value || "?"
    console.log(`        - ${buscar("from")}: ${buscar("subject")}`)
  }
} catch (e) {
  fail(`no se pudo listar la bandeja: ${e.message}`)
  console.log("\n  Si menciona scopes: faltan permisos. Repetí `npm run gmail:auth`.\n")
  process.exit(1)
}

// 4. Envio opcional --------------------------------------------------------
const argEnviar = process.argv.find((a) => a.startsWith("--enviar"))

if (argEnviar) {
  const destino = argEnviar.includes("=") ? argEnviar.split("=")[1] : env.GMAIL_SENDER

  const mensaje = [
    `From: ${env.GMAIL_SENDER_NAME || "Grand Team Bike"} <${env.GMAIL_SENDER}>`,
    `To: ${destino}`,
    "Subject: =?UTF-8?B?" +
      Buffer.from("Prueba de Gmail API - Grand Team Bike", "utf8").toString("base64") +
      "?=",
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    "<p>Si estás leyendo esto, la Gmail API del sitio quedó funcionando.</p>",
  ].join("\r\n")

  const raw = Buffer.from(mensaje, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  try {
    const res = await api("/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    })
    ok(`email de prueba enviado a ${destino} (id ${res.id})`)
  } catch (e) {
    fail(`no se pudo enviar: ${e.message}`)
    process.exit(1)
  }
} else {
  console.log("\n  (pasá --enviar para probar tambien el envio)")
}

console.log("\n=== Todo listo ===\n")

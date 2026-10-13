// Genera el par de claves VAPID para las notificaciones push.
// Se corre UNA sola vez: si se regeneran, todos los dispositivos suscriptos
// dejan de recibir notificaciones y hay que volver a activarlas.
//
// Uso:
//   npm run push:vapid
//
// Imprime las lineas para pegar en .env.local y en Vercel.

import { generateKeyPairSync } from "node:crypto"

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" })

const pub = publicKey.export({ format: "jwk" })
const priv = privateKey.export({ format: "jwk" })

// La clave publica VAPID es el punto EC sin comprimir: 0x04 || X || Y,
// codificado en base64url (lo que espera el navegador en applicationServerKey).
const clavePublica = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(pub.x, "base64url"),
  Buffer.from(pub.y, "base64url"),
]).toString("base64url")

const clavePrivada = priv.d

console.log("\n" + "=".repeat(70))
console.log("  CLAVES VAPID GENERADAS")
console.log("=".repeat(70))
console.log("\n  Pegá estas lineas en .env.local y en las Environment Variables de Vercel:\n")
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${clavePublica}`)
console.log(`VAPID_PRIVATE_KEY=${clavePrivada}`)
console.log(`VAPID_SUBJECT=mailto:grandteamcdelu@gmail.com`)
console.log(
  "\n  La publica lleva NEXT_PUBLIC_ a proposito (la necesita el navegador)." +
    "\n  La privada es SECRETA y solo la usa el servidor."
)
console.log("\n  No las regeneres: si cambian, cada dispositivo tiene que volver")
console.log("  a activar las notificaciones.")
console.log("\n" + "=".repeat(70) + "\n")

// Mide latencia real de las consultas tipicas del admin contra Supabase
import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function medir(nombre, fn, veces = 3) {
  const tiempos = []
  for (let i = 0; i < veces; i++) {
    const t0 = performance.now()
    await fn()
    tiempos.push(Math.round(performance.now() - t0))
  }
  console.log(`${nombre}: ${tiempos.join("ms, ")}ms`)
}

await medir("rol (select administradores)", () =>
  client.from("administradores").select("role").eq("email", "x@x.com").maybeSingle()
)
await medir("count inscripciones (head)", () =>
  client.from("inscripciones").select("*", { count: "exact", head: true })
)
await medir("4 counts en paralelo (dashboard)", () =>
  Promise.all([
    client.from("inscripciones").select("*", { count: "exact", head: true }),
    client.from("inscripciones").select("*", { count: "exact", head: true }).eq("estado", "pendiente"),
    client.from("inscripciones").select("*", { count: "exact", head: true }).eq("estado", "confirmada"),
    client.from("inscripciones").select("*", { count: "exact", head: true }).eq("estado", "rechazada"),
  ])
)
await medir("sponsors select *", () => client.from("sponsors").select("*"))
await medir("event_settings", () =>
  client.from("event_settings").select("*").eq("id", "eventSettings").maybeSingle()
)

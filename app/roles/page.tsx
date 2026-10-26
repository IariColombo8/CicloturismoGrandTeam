"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ClipboardList, HandHeart, Loader2, UserPlus } from "lucide-react"
import ResumenRoles from "@/components/roles/ResumenRoles"
import FiltrosRoles from "@/components/roles/FiltrosRoles"
import TarjetaRol from "@/components/roles/TarjetaRol"
import FormularioRol, {
  VALORES_VACIOS,
  datosDeValores,
  type ValoresRol,
} from "@/components/roles/FormularioRol"
import { useAjustesRoles } from "@/hooks/useAjustesRoles"
import {
  COLUMNAS_ROL,
  catalogoDeTareas,
  filtrarRoles,
  ordenarRoles,
  resumirRoles,
  type FiltroRoles,
  type RolEvento,
} from "@/lib/roles"

/**
 * /roles — quien hace que el dia del evento.
 *
 * La lista la ve cualquiera (se comparte el link por WhatsApp y se mira desde
 * el celular el dia del evento) y cualquiera puede sumarse a si mismo como
 * "pedaleo", "ayudo" o "ayudo y no pedaleo". Editar y borrar es cosa del panel
 * (/admin/roles): el alta publica entra por /api/roles/sumarse, que es lo
 * unico que puede escribir sin sesion.
 *
 * No esta en el menu a proposito: se llega por el link directo.
 */
export default function RolesPage() {
  const { toast } = useToast()
  const [roles, setRoles] = useState<RolEvento[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<FiltroRoles>({ texto: "", modo: "todos", tarea: "todas" })

  const [abierto, setAbierto] = useState(false)
  const [valores, setValores] = useState<ValoresRol>(VALORES_VACIOS)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    const { data, error: errorCarga } = await supabase
      .from("roles_evento")
      .select(COLUMNAS_ROL)
      .order("orden")

    if (errorCarga) {
      setError(errorCarga.message)
    } else {
      setError(null)
      setRoles((data ?? []) as unknown as RolEvento[])
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()

    // Se arma entre varios y al mismo tiempo: si alguien se suma desde su
    // celular, la lista aparece sin recargar.
    const canal = supabase
      .channel("roles-publico")
      .on("postgres_changes", { event: "*", schema: "public", table: "roles_evento" }, () => cargar())
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [cargar])

  const { ajustes } = useAjustesRoles()
  const catalogo = useMemo(() => catalogoDeTareas(ajustes, roles), [ajustes, roles])
  const ordenados = useMemo(() => ordenarRoles(roles), [roles])
  const resumen = useMemo(() => resumirRoles(roles, catalogo), [roles, catalogo])
  const visibles = useMemo(() => filtrarRoles(ordenados, filtro, catalogo), [ordenados, filtro, catalogo])
  const nombres = useMemo(() => roles.map((r) => r.nombre), [roles])

  const sumarme = async () => {
    if (!valores.nombre.trim()) {
      toast({ title: "Escribí tu nombre para sumarte", variant: "destructive" })
      return
    }

    setGuardando(true)
    try {
      const res = await fetch("/api/roles/sumarse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosDeValores(valores)),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // El error dice siempre el motivo real: un cartel generico deja a la
        // persona sin saber si quedo anotada.
        toast({
          title: "No pudimos guardarlo",
          description: data?.error || "Probá de nuevo en un rato.",
          variant: "destructive",
        })
        return
      }

      toast({ title: data?.mensaje || "Listo, quedaste en la lista" })
      setValores(VALORES_VACIOS)
      setAbierto(false)
      cargar()
    } catch {
      toast({
        title: "Sin conexión",
        description: "No pudimos guardarlo. Revisá la señal y probá de nuevo.",
        variant: "destructive",
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <Navbar />

      <section className="relative overflow-hidden pt-28 pb-8 sm:pt-32 sm:pb-12">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-yellow-400/10 blur-[120px]" />

        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-yellow-400">
              <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
              Día del evento
            </span>
            <h1 className="mt-4 text-3xl font-black text-white sm:text-5xl">
              Quién hace <span className="gradient-text">qué</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400 sm:text-base">
              La lista del equipo: quién pedalea, quién ayuda, quién ayuda sin pedalear y quién
              lleva familiares para dar una mano. Sumate vos mismo y después la vamos acomodando.
            </p>

            <Button
              onClick={() => setAbierto(true)}
              className="mt-6 w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 font-bold text-black hover:from-yellow-500 hover:to-yellow-700 sm:w-auto"
            >
              <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
              Sumarme a la lista
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          {cargando ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-yellow-400" aria-hidden="true" />
            </div>
          ) : (
            <>
              <ResumenRoles
                resumen={resumen}
                onElegirTarea={(tarea) => setFiltro((f) => ({ ...f, tarea }))}
              />

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  No pudimos cargar la lista: {error}
                </p>
              )}

              {roles.length > 0 && (
                <FiltrosRoles
                  filtro={filtro}
                  onChange={setFiltro}
                  tareasConGente={resumen.porTarea.map((t) => t.id)}
                  catalogo={catalogo}
                />
              )}

              {roles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 py-14 text-center">
                  <HandHeart className="mx-auto mb-3 h-8 w-8 text-zinc-600" aria-hidden="true" />
                  <p className="text-sm text-zinc-400">Todavía no hay nadie anotado.</p>
                  <p className="mt-1 text-xs text-zinc-600">Sé el primero: tocá “Sumarme a la lista”.</p>
                </div>
              ) : visibles.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">
                  Nadie coincide con ese filtro.
                </p>
              ) : (
                <>
                  <p className="text-xs text-zinc-500">
                    {visibles.length} de {roles.length} anotados
                  </p>
                  <div className="space-y-2.5">
                    {visibles.map((rol) => (
                      <TarjetaRol key={rol.id} rol={rol} catalogo={catalogo} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto border-zinc-800 bg-zinc-950 sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-white">Sumarme a la lista</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Decinos qué vas a hacer el día del evento. Después lo podemos acomodar entre todos.
            </DialogDescription>
          </DialogHeader>

          <FormularioRol
            valores={valores}
            onChange={setValores}
            nombresExistentes={nombres}
            tareas={catalogo}
            cupos={resumen.cupos}
          />

          <div className="flex flex-col gap-2 pt-2 sm:flex-row-reverse">
            <Button
              onClick={sumarme}
              disabled={guardando}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 font-bold text-black hover:from-yellow-500 hover:to-yellow-700 sm:w-auto"
            >
              {guardando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Guardando...
                </>
              ) : (
                "Sumarme"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setAbierto(false)}
              className="w-full border-zinc-700 text-zinc-300 hover:text-white sm:w-auto"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </main>
  )
}

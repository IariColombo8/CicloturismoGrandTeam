"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  BedDouble,
  Eye,
  EyeOff,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react"

interface Alojamiento {
  id: string
  nombre: string
  descripcion: string | null
  logo_url: string | null
  website: string | null
  telefono: string | null
  whatsapp: string | null
  direccion: string | null
  instagram: string | null
  activo: boolean
  orden: number
}

const ALOJAMIENTO_VACIO: Omit<Alojamiento, "id"> = {
  nombre: "",
  descripcion: "",
  logo_url: "",
  website: "",
  telefono: "",
  whatsapp: "",
  direccion: "",
  instagram: "",
  activo: true,
  orden: 0,
}

export default function AdminAlojamientosPage() {
  const { user, userRole, loading: authLoading } = useSupabaseContext()
  const [alojamientos, setAlojamientos] = useState<Alojamiento[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Partial<Alojamiento> | null>(null)
  const [esNuevo, setEsNuevo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const autorizado = userRole === "admin" || userRole === "grandteam"

  const cargar = useCallback(async () => {
    const { data, error: dbError } = await supabase
      .from("alojamientos")
      .select("*")
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true })

    if (dbError) {
      console.error("Error cargando alojamientos:", dbError)
      setError("No se pudieron cargar los alojamientos.")
    } else {
      setAlojamientos((data || []) as Alojamiento[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!autorizado || !user) {
      setLoading(false)
      return
    }
    cargar()
  }, [authLoading, autorizado, user, cargar])

  const abrirNuevo = () => {
    const maxOrden = alojamientos.reduce((max, a) => Math.max(max, a.orden ?? 0), -1)
    setEditando({ ...ALOJAMIENTO_VACIO, orden: maxOrden + 1 })
    setEsNuevo(true)
    setError(null)
  }

  const abrirEdicion = (alojamiento: Alojamiento) => {
    setEditando({ ...alojamiento })
    setEsNuevo(false)
    setError(null)
  }

  const cerrarModal = () => {
    setEditando(null)
    setError(null)
  }

  const subirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editando) return

    setSubiendoLogo(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("nombre", `alojamiento-${editando.nombre || "sin-nombre"}`)

      const res = await fetch("/api/sponsors/upload-logo", { method: "POST", body: formData })
      const result = await res.json()

      if (!res.ok) {
        setError(result.error || "No se pudo subir el logo.")
        return
      }

      setEditando({ ...editando, logo_url: result.url })
    } catch {
      setError("No se pudo subir el logo.")
    } finally {
      setSubiendoLogo(false)
      e.target.value = ""
    }
  }

  const guardar = async () => {
    if (!editando) return
    if (!editando.nombre?.trim()) {
      setError("El nombre es obligatorio.")
      return
    }

    setGuardando(true)
    setError(null)

    const payload = {
      nombre: editando.nombre.trim(),
      descripcion: editando.descripcion?.trim() || null,
      logo_url: editando.logo_url?.trim() || null,
      website: editando.website?.trim() || null,
      telefono: editando.telefono?.trim() || null,
      whatsapp: editando.whatsapp?.trim() || null,
      direccion: editando.direccion?.trim() || null,
      instagram: editando.instagram?.trim() || null,
      activo: editando.activo ?? true,
      orden: editando.orden ?? 0,
    }

    const { error: dbError } = esNuevo
      ? await supabase.from("alojamientos").insert(payload)
      : await supabase.from("alojamientos").update(payload).eq("id", editando.id!)

    setGuardando(false)

    if (dbError) {
      console.error("Error guardando alojamiento:", dbError)
      setError("No se pudo guardar el alojamiento.")
      return
    }

    cerrarModal()
    cargar()
  }

  const eliminar = async (alojamiento: Alojamiento) => {
    if (!window.confirm(`¿Eliminar el alojamiento "${alojamiento.nombre}"?`)) return

    const { error: dbError } = await supabase.from("alojamientos").delete().eq("id", alojamiento.id)
    if (dbError) {
      console.error("Error eliminando alojamiento:", dbError)
      setError("No se pudo eliminar el alojamiento.")
      return
    }
    cargar()
  }

  const alternarActivo = async (alojamiento: Alojamiento) => {
    await supabase
      .from("alojamientos")
      .update({ activo: !alojamiento.activo })
      .eq("id", alojamiento.id)
    cargar()
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
    )
  }

  if (!autorizado) {
    return (
      <div className="p-6">
        <p className="text-zinc-300">No tenés permisos para ver esta sección.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BedDouble className="w-6 h-6 text-yellow-400" aria-hidden="true" />
            Alojamientos
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Alojamientos bike friendly que se muestran en la landing, debajo de los sponsors.
          </p>
        </div>
        <Button onClick={abrirNuevo} className="bg-yellow-400 text-black hover:bg-yellow-500 font-bold">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo alojamiento
        </Button>
      </div>

      {error && !editando && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {alojamientos.length === 0 ? (
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardContent className="py-12 text-center text-zinc-400">
            Todavía no cargaste ningún alojamiento.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alojamientos.map((alojamiento) => (
            <Card key={alojamiento.id} className="bg-zinc-900/60 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center justify-between gap-2">
                  <span className="truncate">{alojamiento.nombre}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      alojamiento.activo
                        ? "bg-green-500/10 border-green-500/40 text-green-300"
                        : "bg-zinc-700/40 border-zinc-600 text-zinc-400"
                    }`}
                  >
                    {alojamiento.activo ? "Visible" : "Oculto"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="aspect-square w-full max-w-[140px] mx-auto rounded-lg bg-white p-2">
                  {alojamiento.logo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={alojamiento.logo_url}
                      alt={`Logo de ${alojamiento.nombre}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <ImageIcon className="w-8 h-8" aria-hidden="true" />
                    </div>
                  )}
                </div>

                {alojamiento.direccion && (
                  <p className="text-xs text-zinc-400 text-center">{alojamiento.direccion}</p>
                )}

                <div className="flex flex-wrap gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => abrirEdicion(alojamiento)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => alternarActivo(alojamiento)}>
                    {alojamiento.activo ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 mr-1" />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Mostrar
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-300 hover:text-red-200"
                    onClick={() => eliminar(alojamiento)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Borrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de alta / edicion */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-yellow-400/20 bg-zinc-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-yellow-400">
                {esNuevo ? "Nuevo alojamiento" : "Editar alojamiento"}
              </h2>
              <button
                type="button"
                onClick={cerrarModal}
                aria-label="Cerrar"
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={editando.nombre || ""}
                  onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                  placeholder="Hotel Ejemplo"
                />
              </div>

              <div>
                <Label htmlFor="website">Sitio web</Label>
                <Input
                  id="website"
                  value={editando.website || ""}
                  onChange={(e) => setEditando({ ...editando, website: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={editando.direccion || ""}
                  onChange={(e) => setEditando({ ...editando, direccion: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={editando.telefono || ""}
                    onChange={(e) => setEditando({ ...editando, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={editando.whatsapp || ""}
                    onChange={(e) => setEditando({ ...editando, whatsapp: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={editando.instagram || ""}
                  onChange={(e) => setEditando({ ...editando, instagram: e.target.value })}
                  placeholder="@usuario"
                />
              </div>

              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  rows={3}
                  value={editando.descripcion || ""}
                  onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="logo">Logo o foto (JPG/PNG, máx 2MB)</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Input id="logo" type="file" accept="image/jpeg,image/png" onChange={subirLogo} />
                  {subiendoLogo && <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />}
                </div>
                {editando.logo_url && (
                  <div className="mt-3 w-28 h-28 rounded-lg bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editando.logo_url}
                      alt="Vista previa del logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <Label htmlFor="orden">Orden</Label>
                  <Input
                    id="orden"
                    type="number"
                    value={editando.orden ?? 0}
                    onChange={(e) => setEditando({ ...editando, orden: Number(e.target.value) })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-300 pb-2">
                  <input
                    type="checkbox"
                    checked={editando.activo ?? true}
                    onChange={(e) => setEditando({ ...editando, activo: e.target.checked })}
                  />
                  Visible en la landing
                </label>
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={cerrarModal} disabled={guardando}>
                  Cancelar
                </Button>
                <Button
                  onClick={guardar}
                  disabled={guardando || subiendoLogo}
                  className="bg-yellow-400 text-black hover:bg-yellow-500 font-bold"
                >
                  {guardando ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

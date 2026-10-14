"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Eye,
  EyeOff,
  ImageIcon,
  Images,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react"
import {
  claveBorrador,
  listarBorradores,
  useBorradorFormulario,
} from "@/hooks/useBorradorFormulario"
import BannerBorrador, { fechaBorrador } from "@/components/admin/BannerBorrador"
import DialogoSalirSinGuardar from "@/components/admin/DialogoSalirSinGuardar"

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
  imagenes: string[] | null
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
  imagenes: [],
  activo: true,
  orden: 0,
}

// Maximo de fotos extra por alojamiento (ademas del logo).
const MAX_IMAGENES = 12

export default function AdminAlojamientosPage() {
  const { user, userRole, loading: authLoading } = useSupabaseContext()
  const [alojamientos, setAlojamientos] = useState<Alojamiento[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Partial<Alojamiento> | null>(null)
  const [esNuevo, setEsNuevo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const [subiendoImagenes, setSubiendoImagenes] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Borradores: una ficha con fotos lleva su tiempo, no se pierde al cerrar.
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const [borradoresPendientes, setBorradoresPendientes] = useState<Record<string, number>>({})
  // Como estaba el alojamiento al abrir el modal, para saber si hubo cambios.
  const referenciaRef = useRef("")

  const autorizado = userRole === "admin" || userRole === "grandteam"

  const claveActual = editando
    ? claveBorrador("alojamiento", esNuevo ? "nuevo" : editando.id || "nuevo")
    : null

  const hayCambios = useMemo(() => {
    if (!editando) return false
    return JSON.stringify(editando) !== referenciaRef.current
  }, [editando])

  const { borrador, guardarAhora, descartarBorrador, ocultarAviso } =
    useBorradorFormulario<Partial<Alojamiento>>({
      clave: claveActual,
      datos: editando,
      hayCambios,
    })

  const refrescarBorradores = useCallback(() => {
    setBorradoresPendientes(listarBorradores("alojamiento:"))
  }, [])

  useEffect(() => {
    refrescarBorradores()
  }, [refrescarBorradores])

  const borradorNuevo = borradoresPendientes[claveBorrador("alojamiento", "nuevo")]

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
    const inicial = { ...ALOJAMIENTO_VACIO, orden: maxOrden + 1 }
    referenciaRef.current = JSON.stringify(inicial)
    setEditando(inicial)
    setEsNuevo(true)
    setError(null)
  }

  const abrirEdicion = (alojamiento: Alojamiento) => {
    const inicial = { ...alojamiento, imagenes: alojamiento.imagenes ?? [] }
    referenciaRef.current = JSON.stringify(inicial)
    setEditando(inicial)
    setEsNuevo(false)
    setError(null)
  }

  const cerrarModal = () => {
    setEditando(null)
    setError(null)
    setConfirmarSalida(false)
    referenciaRef.current = ""
    refrescarBorradores()
  }

  // Cerrar con cambios sin guardar pregunta antes: guardar borrador, seguir o descartar.
  const intentarCerrar = () => {
    if (hayCambios) {
      setConfirmarSalida(true)
      return
    }
    cerrarModal()
  }

  const retomarBorrador = () => {
    if (!borrador) return
    setEditando(borrador.datos)
    ocultarAviso()
  }

  const guardarBorradorYSalir = () => {
    guardarAhora()
    cerrarModal()
  }

  const descartarYSalir = () => {
    descartarBorrador()
    cerrarModal()
  }

  // Escape cierra el modal, pero pasando por el aviso si hay cambios.
  useEffect(() => {
    if (!editando) return
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (confirmarSalida) {
        setConfirmarSalida(false)
        return
      }
      intentarCerrar()
    }
    window.addEventListener("keydown", alPresionar)
    return () => window.removeEventListener("keydown", alPresionar)
  })

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

  // Sube una o varias fotos a la galeria del alojamiento (se van agregando al final).
  const subirImagenes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || !editando) return

    const actuales = editando.imagenes ?? []
    const disponibles = MAX_IMAGENES - actuales.length

    if (disponibles <= 0) {
      setError(`Ya alcanzaste el maximo de ${MAX_IMAGENES} fotos.`)
      e.target.value = ""
      return
    }

    setSubiendoImagenes(true)
    setError(null)

    const subidas: string[] = []
    let errorSubida: string | null = null

    for (const file of files.slice(0, disponibles)) {
      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("nombre", editando.nombre || "alojamiento")

        const res = await fetch("/api/alojamientos/upload-imagen", {
          method: "POST",
          body: formData,
        })
        const result = await res.json()

        if (!res.ok) {
          errorSubida = result.error || `No se pudo subir "${file.name}".`
          continue
        }
        subidas.push(result.url)
      } catch {
        errorSubida = `No se pudo subir "${file.name}".`
      }
    }

    if (subidas.length > 0) {
      setEditando((prev) => (prev ? { ...prev, imagenes: [...(prev.imagenes ?? []), ...subidas] } : prev))
    }
    if (files.length > disponibles) {
      errorSubida = `Solo se subieron ${disponibles} fotos: el maximo es ${MAX_IMAGENES}.`
    }
    if (errorSubida) setError(errorSubida)

    setSubiendoImagenes(false)
    e.target.value = ""
  }

  const quitarImagen = (index: number) => {
    setEditando((prev) =>
      prev ? { ...prev, imagenes: (prev.imagenes ?? []).filter((_, i) => i !== index) } : prev,
    )
  }

  // Reordena la galeria: el orden del array es el orden en que se ve en la landing.
  const moverImagen = (index: number, direccion: -1 | 1) => {
    setEditando((prev) => {
      if (!prev) return prev
      const lista = [...(prev.imagenes ?? [])]
      const destino = index + direccion
      if (destino < 0 || destino >= lista.length) return prev
      ;[lista[index], lista[destino]] = [lista[destino], lista[index]]
      return { ...prev, imagenes: lista }
    })
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
      imagenes: editando.imagenes ?? [],
      activo: editando.activo ?? true,
      orden: editando.orden ?? 0,
    }

    const { error: dbError } = esNuevo
      ? await supabase.from("alojamientos").insert(payload)
      : await supabase.from("alojamientos").update(payload).eq("id", editando.id!)

    setGuardando(false)

    if (dbError) {
      console.error("Error guardando alojamiento:", dbError)
      // La galeria necesita la columna "imagenes" (migracion 20261012_alojamientos_imagenes.sql).
      setError(
        dbError.message?.includes("imagenes")
          ? "Falta la columna 'imagenes' en la tabla alojamientos. Corre la migracion 20261012_alojamientos_imagenes.sql en Supabase."
          : "No se pudo guardar el alojamiento.",
      )
      return
    }

    // Ya esta en la base: el borrador no tiene mas sentido.
    descartarBorrador()
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

      {/* Alojamiento nuevo que quedo a medio cargar */}
      {borradorNuevo && !editando && (
        <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="flex-1 text-sm text-yellow-400 font-semibold flex items-center gap-2">
            <RotateCcw className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            Tenés un alojamiento nuevo a medio cargar
            <span className="font-normal text-gray-400 text-xs">({fechaBorrador(borradorNuevo)})</span>
          </p>
          <Button
            size="sm"
            onClick={abrirNuevo}
            className="bg-yellow-400 text-black hover:bg-yellow-500 font-bold"
          >
            Retomar carga
          </Button>
        </div>
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
                  <span className="flex items-center gap-1.5">
                    {borradoresPendientes[claveBorrador("alojamiento", alojamiento.id)] && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-400/40 bg-yellow-400/10 text-yellow-300">
                        Sin guardar
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        alojamiento.activo
                          ? "bg-green-500/10 border-green-500/40 text-green-300"
                          : "bg-zinc-700/40 border-zinc-600 text-zinc-400"
                      }`}
                    >
                      {alojamiento.activo ? "Visible" : "Oculto"}
                    </span>
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

                <p className="flex items-center justify-center gap-1 text-[11px] text-zinc-500">
                  <Images className="w-3.5 h-3.5 text-yellow-400/70" aria-hidden="true" />
                  {(alojamiento.imagenes ?? []).length} foto
                  {(alojamiento.imagenes ?? []).length === 1 ? "" : "s"}
                </p>

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
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-lg font-bold text-yellow-400 truncate">
                  {esNuevo ? "Nuevo alojamiento" : "Editar alojamiento"}
                </h2>
                {hayCambios && (
                  <span className="text-[10px] text-yellow-400/80 border border-yellow-400/30 rounded-full px-2 py-0.5 whitespace-nowrap">
                    Sin guardar
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={intentarCerrar}
                aria-label="Cerrar"
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {borrador && (
              <BannerBorrador
                guardadoEn={borrador.guardadoEn}
                onRetomar={retomarBorrador}
                onDescartar={descartarBorrador}
                titulo={
                  esNuevo
                    ? "Tenias un alojamiento a medio cargar"
                    : "Tenias cambios sin guardar en este alojamiento"
                }
              />
            )}

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

              {/* Galeria de fotos: se muestran en el modal publico del alojamiento */}
              <div>
                <Label htmlFor="imagenes" className="flex items-center gap-2">
                  <Images className="w-4 h-4 text-yellow-400" aria-hidden="true" />
                  Fotos del alojamiento ({(editando.imagenes ?? []).length}/{MAX_IMAGENES})
                </Label>
                <p className="text-xs text-zinc-500 mt-1">
                  JPG, PNG, WEBP o AVIF (máx 6MB cada una). Podés seleccionar varias a la vez.
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <Input
                    id="imagenes"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={subirImagenes}
                    disabled={subiendoImagenes || (editando.imagenes ?? []).length >= MAX_IMAGENES}
                  />
                  {subiendoImagenes && <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />}
                </div>

                {(editando.imagenes ?? []).length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(editando.imagenes ?? []).map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => quitarImagen(index)}
                          aria-label={`Quitar foto ${index + 1}`}
                          className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-red-300 hover:text-red-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 flex justify-between bg-black/70 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => moverImagen(index, -1)}
                            disabled={index === 0}
                            aria-label={`Mover foto ${index + 1} a la izquierda`}
                            className="text-zinc-300 hover:text-yellow-400 disabled:opacity-30"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] text-zinc-400">{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => moverImagen(index, 1)}
                            disabled={index === (editando.imagenes ?? []).length - 1}
                            aria-label={`Mover foto ${index + 1} a la derecha`}
                            className="text-zinc-300 hover:text-yellow-400 disabled:opacity-30"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
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
                <Button variant="outline" onClick={intentarCerrar} disabled={guardando}>
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

          <DialogoSalirSinGuardar
            abierto={confirmarSalida}
            onSeguirEditando={() => setConfirmarSalida(false)}
            onGuardarYSalir={guardarBorradorYSalir}
            onDescartar={descartarYSalir}
            descripcion={
              esNuevo
                ? "Tenes un alojamiento a medio cargar. Podes guardarlo como borrador y completarlo despues."
                : "Tenes cambios sin guardar en este alojamiento. Podes guardarlos como borrador y completarlos despues."
            }
          />
        </div>
      )}
    </div>
  )
}

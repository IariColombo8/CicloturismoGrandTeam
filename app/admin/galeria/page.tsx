"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import NextImage from "next/image"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Images,
  Save,
  Plus,
  Trash2,
  Loader2,
  Upload,
  ArrowUp,
  ArrowDown,
  Aperture,
} from "lucide-react"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Foto {
  id: string
  url: string
  caption: string
  alt: string
}

interface Fotografo {
  id: string
  name: string
  link: string
  description: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2)
}

async function cargarContenido(): Promise<{ fotos: Foto[]; fotografos: Fotografo[] }> {
  const { data } = await supabase
    .from("content_settings")
    .select("data")
    .eq("id", "fotos")
    .maybeSingle()
  const raw = data?.data as { fotos?: Foto[]; fotografos?: Fotografo[] } | null
  // Compatibilidad con registros viejos sin id
  const fotos = (raw?.fotos ?? []).map((f) => ({ ...f, id: f.id || uid() }))
  const fotografos = (raw?.fotografos ?? []).map((f) => ({ ...f, id: f.id || uid() }))
  return { fotos, fotografos }
}

async function guardarContenido(fotos: Foto[], fotografos: Fotografo[]) {
  return supabase.from("content_settings").upsert({
    id: "fotos",
    data: { fotos, fotografos },
    updated_at: new Date().toISOString(),
  })
}

// ─── Pagina ───────────────────────────────────────────────────────────────────

export default function AdminGaleriaPage() {
  const router = useRouter()
  const { user, userRole, loading: authLoading } = useSupabaseContext()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fotos, setFotos] = useState<Foto[]>([])
  const [fotografos, setFotografos] = useState<Fotografo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const isAdmin = userRole === "admin"

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?returnUrl=/admin/galeria")
    else if (!authLoading && user && !isAdmin) router.push("/")
  }, [authLoading, user, isAdmin, router])

  useEffect(() => {
    cargarContenido().then(({ fotos, fotografos }) => {
      setFotos(fotos)
      setFotografos(fotografos)
      setLoading(false)
    })
  }, [])

  const agregarPorUrl = () =>
    setFotos((prev) => [...prev, { id: uid(), url: "", caption: "", alt: "" }])

  const eliminar = (id: string) => setFotos((prev) => prev.filter((f) => f.id !== id))

  const actualizar = (id: string, campo: keyof Foto, valor: string) =>
    setFotos((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))

  const mover = (index: number, delta: number) =>
    setFotos((prev) => {
      const destino = index + delta
      if (destino < 0 || destino >= prev.length) return prev
      const copia = [...prev]
      const [item] = copia.splice(index, 1)
      copia.splice(destino, 0, item)
      return copia
    })

  const agregarFotografo = () =>
    setFotografos((prev) => [...prev, { id: uid(), name: "", link: "", description: "" }])

  const eliminarFotografo = (id: string) =>
    setFotografos((prev) => prev.filter((f) => f.id !== id))

  const actualizarFotografo = (id: string, campo: keyof Fotografo, valor: string) =>
    setFotografos((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))

  const moverFotografo = (index: number, delta: number) =>
    setFotografos((prev) => {
      const destino = index + delta
      if (destino < 0 || destino >= prev.length) return prev
      const copia = [...prev]
      const [item] = copia.splice(index, 1)
      copia.splice(destino, 0, item)
      return copia
    })

  const subirArchivos = async (files: FileList) => {
    setUploading(true)
    const nuevas: Foto[] = []

    for (const file of Array.from(files)) {
      const body = new FormData()
      body.append("file", file)
      try {
        const res = await fetch("/api/galeria/upload", { method: "POST", body })
        const json = await res.json()
        if (!res.ok) {
          toast({
            title: `No se pudo subir ${file.name}`,
            description: json?.error ?? "Error desconocido",
            variant: "destructive",
          })
          continue
        }
        nuevas.push({
          id: uid(),
          url: json.url as string,
          caption: "",
          alt: "Grand Team Bike",
        })
      } catch {
        toast({
          title: `No se pudo subir ${file.name}`,
          description: "Error de red",
          variant: "destructive",
        })
      }
    }

    if (nuevas.length > 0) {
      setFotos((prev) => [...prev, ...nuevas])
      toast({
        title: `${nuevas.length} foto(s) subida(s)`,
        description: "Acordate de guardar los cambios.",
      })
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const guardar = async () => {
    const fotosValidas = fotos.filter((f) => f.url.trim() !== "")
    const fotografosValidos = fotografos.filter(
      (f) => f.name.trim() !== "" && f.link.trim() !== ""
    )
    setSaving(true)
    const { error } = await guardarContenido(fotosValidas, fotografosValidos)
    setSaving(false)
    if (error) {
      toast({ title: "Error al guardar", variant: "destructive" })
      return
    }
    setFotos(fotosValidas)
    setFotografos(fotografosValidos)
    toast({ title: "Galeria guardada", description: "Ya se ve en el sitio publico." })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 px-3 py-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Images className="w-8 h-8 text-yellow-400" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-yellow-400">Galeria</h1>
            <p className="text-sm text-gray-400">
              Fotos que se publican en la seccion #galeria del sitio.
            </p>
          </div>
        </div>

        <Tabs defaultValue="fotos" className="space-y-4">
          <TabsList className="bg-gray-800/50 border border-yellow-400/20">
            <TabsTrigger value="fotos" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              <Images className="w-4 h-4 mr-1.5" />Fotos destacadas
            </TabsTrigger>
            <TabsTrigger
              value="fotografos"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black"
            >
              <Aperture className="w-4 h-4 mr-1.5" />Fotógrafos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fotos">
        <Card className="bg-gray-800/50 border-yellow-400/20">
          <CardHeader>
            <CardTitle className="text-yellow-400">Fotos publicadas</CardTitle>
            <CardDescription className="text-gray-400">
              Subi imagenes (JPG, PNG, WEBP o AVIF, hasta 6MB) o pega una URL. El orden de la
              lista es el orden en que se muestran.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) subirArchivos(e.target.files)
                }}
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-yellow-400 text-black hover:bg-yellow-500 font-semibold"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Subiendo...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-1.5" />Subir fotos</>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={agregarPorUrl}
                className="border-yellow-400/30 text-yellow-400"
              >
                <Plus className="w-4 h-4 mr-1.5" />Agregar por URL
              </Button>
            </div>

            <div className="space-y-3">
              {fotos.map((foto, index) => (
                <div
                  key={foto.id}
                  className="flex flex-col sm:flex-row gap-3 p-3 bg-zinc-800 rounded-lg border border-zinc-700"
                >
                  <div className="relative w-full sm:w-32 h-28 sm:h-24 flex-shrink-0 rounded-md overflow-hidden bg-zinc-900 border border-zinc-700">
                    {foto.url ? (
                      <NextImage
                        src={foto.url}
                        alt={foto.alt || "Vista previa"}
                        fill
                        sizes="128px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <Input
                      value={foto.url}
                      onChange={(e) => actualizar(foto.id, "url", e.target.value)}
                      placeholder="URL de la foto"
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={foto.caption}
                        onChange={(e) => actualizar(foto.id, "caption", e.target.value)}
                        placeholder="Titulo (se ve al pasar el mouse)"
                        className="bg-zinc-900 border-zinc-700 text-white"
                      />
                      <Input
                        value={foto.alt}
                        onChange={(e) => actualizar(foto.id, "alt", e.target.value)}
                        placeholder="Texto alternativo (accesibilidad)"
                        className="bg-zinc-900 border-zinc-700 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-1 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => mover(index, -1)}
                      disabled={index === 0}
                      aria-label="Subir en el orden"
                      className="text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => mover(index, 1)}
                      disabled={index === fotos.length - 1}
                      aria-label="Bajar en el orden"
                      className="text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => eliminar(foto.id)}
                      aria-label="Eliminar foto"
                      className="text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {fotos.length === 0 && (
                <p className="text-zinc-500 text-sm py-6 text-center">
                  No hay fotos cargadas. El sitio muestra las fotos de respaldo.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="fotografos">
            <Card className="bg-gray-800/50 border-yellow-400/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">Fotógrafos del evento</CardTitle>
                <CardDescription className="text-gray-400">
                  Tarjetas con nombre, descripción opcional y link a su álbum externo (Google
                  Drive, Photos, etc.). No se suben imágenes acá, solo se linkea.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={agregarFotografo}
                  className="border-yellow-400/30 text-yellow-400"
                >
                  <Plus className="w-4 h-4 mr-1.5" />Agregar fotógrafo
                </Button>

                <div className="space-y-3">
                  {fotografos.map((fotografo, index) => (
                    <div
                      key={fotografo.id}
                      className="flex flex-col sm:flex-row gap-3 p-3 bg-zinc-800 rounded-lg border border-zinc-700"
                    >
                      <div className="flex-1 space-y-2">
                        <Input
                          value={fotografo.name}
                          onChange={(e) => actualizarFotografo(fotografo.id, "name", e.target.value)}
                          placeholder="Nombre del fotógrafo o estudio"
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                        <Input
                          value={fotografo.link}
                          onChange={(e) => actualizarFotografo(fotografo.id, "link", e.target.value)}
                          placeholder="Link al álbum completo (Drive, Photos, etc.)"
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                        <Textarea
                          value={fotografo.description}
                          onChange={(e) =>
                            actualizarFotografo(fotografo.id, "description", e.target.value)
                          }
                          placeholder="Descripción opcional"
                          className="bg-zinc-900 border-zinc-700 text-white min-h-[60px]"
                        />
                      </div>

                      <div className="flex sm:flex-col gap-1 justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => moverFotografo(index, -1)}
                          disabled={index === 0}
                          aria-label="Subir en el orden"
                          className="text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => moverFotografo(index, 1)}
                          disabled={index === fotografos.length - 1}
                          aria-label="Bajar en el orden"
                          className="text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarFotografo(fotografo.id)}
                          aria-label="Eliminar fotógrafo"
                          className="text-red-400 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {fotografos.length === 0 && (
                    <p className="text-zinc-500 text-sm py-6 text-center">
                      No hay fotógrafos cargados.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Button
          onClick={guardar}
          disabled={saving}
          className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700 font-semibold"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Guardar cambios</>
          )}
        </Button>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Image,
  Users,
  Mail,
  Save,
  Plus,
  Trash2,
  Loader2,
  LayoutDashboard,
} from "lucide-react"

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface Sponsor {
  id: string
  nombre: string
  logoUrl: string
  link: string
}

interface Foto {
  id: string
  url: string
  caption: string
  alt: string
}

interface ContactoData {
  email: string
  telefono: string
  direccion: string
  redesSociales: { instagram?: string; facebook?: string; whatsapp?: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2)
}

async function cargarSeccion(id: string) {
  const { data } = await supabase
    .from("content_settings")
    .select("data")
    .eq("id", id)
    .maybeSingle()
  return data?.data ?? {}
}

async function guardarSeccion(id: string, data: Record<string, unknown>) {
  return supabase
    .from("content_settings")
    .upsert({ id, data, updated_at: new Date().toISOString() })
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminContentPage() {
  const router = useRouter()
  const { user, userRole, loading: authLoading } = useSupabaseContext()
  const { toast } = useToast()

  const isAdmin = userRole === "admin"

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?returnUrl=/admin/content")
    else if (!authLoading && user && !isAdmin) router.push("/")
  }, [authLoading, user, isAdmin, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 px-3 py-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-yellow-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-yellow-400">Contenido del Sitio</h1>
        </div>

        <Tabs defaultValue="sponsors">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="sponsors" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              <Users className="w-4 h-4 mr-1.5" />
              Sponsors
            </TabsTrigger>
            <TabsTrigger value="fotos" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              <Image className="w-4 h-4 mr-1.5" />
              Fotos
            </TabsTrigger>
            <TabsTrigger value="contacto" className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black">
              <Mail className="w-4 h-4 mr-1.5" />
              Contacto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sponsors">
            <TabSponsors toast={toast} />
          </TabsContent>
          <TabsContent value="fotos">
            <TabFotos toast={toast} />
          </TabsContent>
          <TabsContent value="contacto">
            <TabContacto toast={toast} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ─── Tab: Sponsors ────────────────────────────────────────────────────────────

function TabSponsors({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarSeccion("sponsors").then((d) => {
      setSponsors((d as { sponsors?: Sponsor[] }).sponsors ?? [])
      setLoading(false)
    })
  }, [])

  const agregar = () => setSponsors((prev) => [...prev, { id: uid(), nombre: "", logoUrl: "", link: "" }])
  const eliminar = (id: string) => setSponsors((prev) => prev.filter((s) => s.id !== id))
  const actualizar = (id: string, campo: keyof Sponsor, valor: string) =>
    setSponsors((prev) => prev.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)))

  const guardar = async () => {
    setSaving(true)
    const { error } = await guardarSeccion("sponsors", { sponsors })
    setSaving(false)
    if (error) { toast({ title: "Error al guardar", variant: "destructive" }); return }
    toast({ title: "Sponsors guardados" })
  }

  if (loading) return <TabLoader />

  return (
    <Card className="bg-gray-800/50 border-yellow-400/20 mt-4">
      <CardHeader>
        <CardTitle className="text-yellow-400">Sponsors</CardTitle>
        <CardDescription className="text-gray-400">Administrá los logos y links de los sponsors del evento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {sponsors.map((sp) => (
            <div key={sp.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
              <Input value={sp.nombre} onChange={(e) => actualizar(sp.id, "nombre", e.target.value)} placeholder="Nombre del sponsor" className="bg-zinc-900 border-zinc-700 text-white" />
              <Input value={sp.logoUrl} onChange={(e) => actualizar(sp.id, "logoUrl", e.target.value)} placeholder="URL del logo" className="bg-zinc-900 border-zinc-700 text-white" />
              <div className="flex gap-2">
                <Input value={sp.link} onChange={(e) => actualizar(sp.id, "link", e.target.value)} placeholder="Link (https://...)" className="bg-zinc-900 border-zinc-700 text-white flex-1" />
                <Button type="button" variant="ghost" size="icon" onClick={() => eliminar(sp.id)} className="text-red-400 hover:bg-red-400/10 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {sponsors.length === 0 && <p className="text-zinc-500 text-sm py-4 text-center">No hay sponsors cargados</p>}
        </div>
        <Button type="button" variant="outline" onClick={agregar} className="border-yellow-400/30 text-yellow-400">
          <Plus className="w-4 h-4 mr-1.5" />Agregar sponsor
        </Button>
        <SaveButton onClick={guardar} saving={saving} />
      </CardContent>
    </Card>
  )
}

// ─── Tab: Fotos ───────────────────────────────────────────────────────────────

function TabFotos({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const [fotos, setFotos] = useState<Foto[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarSeccion("fotos").then((d) => {
      setFotos((d as { fotos?: Foto[] }).fotos ?? [])
      setLoading(false)
    })
  }, [])

  const agregar = () => setFotos((prev) => [...prev, { id: uid(), url: "", caption: "", alt: "" }])
  const eliminar = (id: string) => setFotos((prev) => prev.filter((f) => f.id !== id))
  const actualizar = (id: string, campo: keyof Foto, valor: string) =>
    setFotos((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))

  const guardar = async () => {
    setSaving(true)
    const { error } = await guardarSeccion("fotos", { fotos })
    setSaving(false)
    if (error) { toast({ title: "Error al guardar", variant: "destructive" }); return }
    toast({ title: "Fotos guardadas" })
  }

  if (loading) return <TabLoader />

  return (
    <Card className="bg-gray-800/50 border-yellow-400/20 mt-4">
      <CardHeader>
        <CardTitle className="text-yellow-400">Galería de Fotos</CardTitle>
        <CardDescription className="text-gray-400">Administrá las fotos que se muestran en la galería del sitio.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {fotos.map((foto) => (
            <div key={foto.id} className="p-3 bg-zinc-800 rounded-lg border border-zinc-700 space-y-2">
              <div className="flex gap-2">
                <Input value={foto.url} onChange={(e) => actualizar(foto.id, "url", e.target.value)} placeholder="URL de la foto" className="bg-zinc-900 border-zinc-700 text-white flex-1" />
                <Button type="button" variant="ghost" size="icon" onClick={() => eliminar(foto.id)} className="text-red-400 hover:bg-red-400/10 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input value={foto.caption} onChange={(e) => actualizar(foto.id, "caption", e.target.value)} placeholder="Leyenda" className="bg-zinc-900 border-zinc-700 text-white" />
                <Input value={foto.alt} onChange={(e) => actualizar(foto.id, "alt", e.target.value)} placeholder="Texto alternativo (accesibilidad)" className="bg-zinc-900 border-zinc-700 text-white" />
              </div>
            </div>
          ))}
          {fotos.length === 0 && <p className="text-zinc-500 text-sm py-4 text-center">No hay fotos cargadas</p>}
        </div>
        <Button type="button" variant="outline" onClick={agregar} className="border-yellow-400/30 text-yellow-400">
          <Plus className="w-4 h-4 mr-1.5" />Agregar foto
        </Button>
        <SaveButton onClick={guardar} saving={saving} />
      </CardContent>
    </Card>
  )
}

// ─── Tab: Contacto ────────────────────────────────────────────────────────────

function TabContacto({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const [data, setData] = useState<ContactoData>({
    email: "",
    telefono: "",
    direccion: "",
    redesSociales: { instagram: "", facebook: "", whatsapp: "" },
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarSeccion("contacto").then((d) => {
      setData((prev) => ({ ...prev, ...(d as Partial<ContactoData>) }))
      setLoading(false)
    })
  }, [])

  const guardar = async () => {
    setSaving(true)
    const { error } = await guardarSeccion("contacto", data as unknown as Record<string, unknown>)
    setSaving(false)
    if (error) { toast({ title: "Error al guardar", variant: "destructive" }); return }
    toast({ title: "Información de contacto guardada" })
  }

  if (loading) return <TabLoader />

  return (
    <Card className="bg-gray-800/50 border-yellow-400/20 mt-4">
      <CardHeader>
        <CardTitle className="text-yellow-400">Información de Contacto</CardTitle>
        <CardDescription className="text-gray-400">Datos de contacto que se muestran en el sitio.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-300">Email</Label>
            <Input value={data.email} onChange={(e) => setData((p) => ({ ...p, email: e.target.value }))} placeholder="contacto@grandteambike.com" className="bg-zinc-800 border-zinc-700 text-white" />
          </div>
          <div>
            <Label className="text-zinc-300">Teléfono</Label>
            <Input value={data.telefono} onChange={(e) => setData((p) => ({ ...p, telefono: e.target.value }))} placeholder="+54 9 3442 123456" className="bg-zinc-800 border-zinc-700 text-white" />
          </div>
        </div>
        <div>
          <Label className="text-zinc-300">Dirección</Label>
          <Input value={data.direccion} onChange={(e) => setData((p) => ({ ...p, direccion: e.target.value }))} placeholder="Concepción del Uruguay, Entre Ríos" className="bg-zinc-800 border-zinc-700 text-white" />
        </div>
        <div>
          <Label className="text-zinc-300 block mb-2">Redes Sociales</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-zinc-500 text-xs">Instagram</Label>
              <Input
                value={data.redesSociales.instagram ?? ""}
                onChange={(e) => setData((p) => ({ ...p, redesSociales: { ...p.redesSociales, instagram: e.target.value } }))}
                placeholder="@grandteambike"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-500 text-xs">Facebook</Label>
              <Input
                value={data.redesSociales.facebook ?? ""}
                onChange={(e) => setData((p) => ({ ...p, redesSociales: { ...p.redesSociales, facebook: e.target.value } }))}
                placeholder="GrandTeamBikeCdelU"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-500 text-xs">WhatsApp</Label>
              <Input
                value={data.redesSociales.whatsapp ?? ""}
                onChange={(e) => setData((p) => ({ ...p, redesSociales: { ...p.redesSociales, whatsapp: e.target.value } }))}
                placeholder="+54 9 3442 123456"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>
        </div>
        <SaveButton onClick={guardar} saving={saving} />
      </CardContent>
    </Card>
  )
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-16 mt-4">
      <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
    </div>
  )
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <Button
      onClick={onClick}
      disabled={saving}
      className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700 font-semibold"
    >
      {saving ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
      ) : (
        <><Save className="w-4 h-4 mr-2" />Guardar cambios</>
      )}
    </Button>
  )
}

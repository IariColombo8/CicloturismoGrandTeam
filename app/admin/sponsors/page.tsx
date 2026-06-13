"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Trophy, Medal, Award, Plus, Pencil, Trash2, X, Save,
  Loader2, Search, Eye, EyeOff, GripVertical, ImageIcon,
  Phone, Mail, Instagram, Facebook, Globe, MapPin, Clock,
} from "lucide-react"

interface Sponsor {
  id: string
  nombre: string
  nombre_comercial: string | null
  descripcion: string | null
  logo_url: string | null
  tier: "oro" | "plata" | "bronce"
  telefono: string | null
  email: string | null
  whatsapp: string | null
  direccion: string | null
  horario: string | null
  instagram: string | null
  facebook: string | null
  website: string | null
  categoria: string | null
  servicios: string[] | null
  activo: boolean
  orden: number
}

const EMPTY_SPONSOR: Omit<Sponsor, "id"> = {
  nombre: "",
  nombre_comercial: "",
  descripcion: "",
  logo_url: "",
  tier: "bronce",
  telefono: "",
  email: "",
  whatsapp: "",
  direccion: "",
  horario: "",
  instagram: "",
  facebook: "",
  website: "",
  categoria: "",
  servicios: [],
  activo: true,
  orden: 0,
}

const TIER_CONFIG = {
  oro: {
    label: "Oro",
    icon: Trophy,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/30",
    badge: "bg-yellow-400/20 text-yellow-400 border-yellow-400/30",
  },
  plata: {
    label: "Plata",
    icon: Medal,
    color: "text-zinc-300",
    bg: "bg-zinc-400/10 border-zinc-400/30",
    badge: "bg-zinc-400/20 text-zinc-300 border-zinc-500/30",
  },
  bronce: {
    label: "Bronce",
    icon: Award,
    color: "text-amber-600",
    bg: "bg-amber-700/10 border-amber-700/30",
    badge: "bg-amber-700/20 text-amber-500 border-amber-700/30",
  },
}

export default function AdminSponsorsPage() {
  const { user, userRole, loading: authLoading } = useSupabaseContext()
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTier, setFilterTier] = useState<string>("all")

  // Modal de edicion/creacion
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSponsor, setEditingSponsor] = useState<Partial<Sponsor> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [servicioInput, setServicioInput] = useState("")
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Confirmar eliminacion
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isAuthorized = userRole === "admin" || userRole === "grandteam"

  const fetchSponsors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("sponsors")
        .select("*")
        .order("tier", { ascending: true })
        .order("orden", { ascending: true })
        .order("nombre", { ascending: true })

      if (error) {
        console.error("Error cargando sponsors:", error)
      } else {
        setSponsors(data || [])
      }
    } catch (err) {
      console.error("Error inesperado cargando sponsors:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthorized || !user) {
      setLoading(false)
      return
    }
    fetchSponsors()

    const channel = supabase
      .channel("admin-sponsors")
      .on("postgres_changes", { event: "*", schema: "public", table: "sponsors" }, () => {
        fetchSponsors()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [authLoading, isAuthorized, user, fetchSponsors])

  // Filtrar sponsors
  const filtered = sponsors.filter((s) => {
    const matchTier = filterTier === "all" || s.tier === filterTier
    const matchSearch =
      !searchTerm.trim() ||
      s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.nombre_comercial || "").toLowerCase().includes(searchTerm.toLowerCase())
    return matchTier && matchSearch
  })

  const grouped = {
    oro: filtered.filter((s) => s.tier === "oro"),
    plata: filtered.filter((s) => s.tier === "plata"),
    bronce: filtered.filter((s) => s.tier === "bronce"),
  }

  // Abrir modal para nuevo sponsor
  const openNew = (tier: "oro" | "plata" | "bronce" = "bronce") => {
    const maxOrden = sponsors.filter((s) => s.tier === tier).reduce((max, s) => Math.max(max, s.orden), 0)
    setEditingSponsor({ ...EMPTY_SPONSOR, tier, orden: maxOrden + 1 })
    setIsNew(true)
    setServicioInput("")
    setModalOpen(true)
  }

  // Abrir modal para editar
  const openEdit = (sponsor: Sponsor) => {
    setEditingSponsor({ ...sponsor })
    setIsNew(false)
    setServicioInput("")
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingSponsor(null)
  }

  // Guardar sponsor
  const handleSave = async () => {
    if (!editingSponsor || !editingSponsor.nombre?.trim()) return
    setSaving(true)

    const payload = {
      nombre: editingSponsor.nombre,
      nombre_comercial: editingSponsor.nombre_comercial || null,
      descripcion: editingSponsor.descripcion || null,
      logo_url: editingSponsor.logo_url || null,
      tier: editingSponsor.tier || "bronce",
      telefono: editingSponsor.telefono || null,
      email: editingSponsor.email || null,
      whatsapp: editingSponsor.whatsapp || null,
      direccion: editingSponsor.direccion || null,
      horario: editingSponsor.horario || null,
      instagram: editingSponsor.instagram || null,
      facebook: editingSponsor.facebook || null,
      website: editingSponsor.website || null,
      categoria: editingSponsor.categoria || null,
      servicios: editingSponsor.servicios?.length ? editingSponsor.servicios : null,
      activo: editingSponsor.activo ?? true,
      orden: editingSponsor.orden ?? 0,
    }

    try {
      if (isNew) {
        const { error } = await supabase.from("sponsors").insert(payload)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("sponsors")
          .update(payload)
          .eq("id", editingSponsor.id)
        if (error) throw error
      }
      closeModal()
      fetchSponsors()
    } catch (err: any) {
      alert("Error al guardar: " + (err?.message || ""))
    } finally {
      setSaving(false)
    }
  }

  // Eliminar sponsor
  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const { error } = await supabase.from("sponsors").delete().eq("id", deleteId)
      if (error) throw error
      setDeleteId(null)
      fetchSponsors()
    } catch (err: any) {
      alert("Error al eliminar: " + (err?.message || ""))
    } finally {
      setDeleting(false)
    }
  }

  // Toggle activo
  const toggleActivo = async (sponsor: Sponsor) => {
    await supabase
      .from("sponsors")
      .update({ activo: !sponsor.activo })
      .eq("id", sponsor.id)
    fetchSponsors()
  }

  // Subir logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingSponsor) return

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("nombre", editingSponsor.nombre || "sponsor")

      const res = await fetch("/api/sponsors/upload-logo", {
        method: "POST",
        body: formData,
      })

      const result = await res.json()
      if (!res.ok) {
        alert(result.error || "Error al subir el logo")
        return
      }

      setEditingSponsor({ ...editingSponsor, logo_url: result.url })
    } catch (err) {
      alert("Error al subir el logo")
    } finally {
      setUploadingLogo(false)
      e.target.value = ""
    }
  }

  // Agregar servicio
  const addServicio = () => {
    if (!servicioInput.trim() || !editingSponsor) return
    setEditingSponsor({
      ...editingSponsor,
      servicios: [...(editingSponsor.servicios || []), servicioInput.trim()],
    })
    setServicioInput("")
  }

  const removeServicio = (index: number) => {
    if (!editingSponsor) return
    setEditingSponsor({
      ...editingSponsor,
      servicios: (editingSponsor.servicios || []).filter((_, i) => i !== index),
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
      </div>
    )
  }

  if (!isAuthorized) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black pt-20">
      {/* Header */}
      <div className="border-b border-yellow-400/20 bg-black/50 backdrop-blur-sm sticky top-20 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-white">
                <span className="gradient-text">Patrocinadores</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                {sponsors.length} sponsor{sponsors.length !== 1 ? "es" : ""} registrados
              </p>
            </div>
            <Button
              onClick={() => openNew()}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Nuevo Sponsor
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar sponsor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-700 text-white"
            />
          </div>
          <div className="flex gap-2">
            {["all", "oro", "plata", "bronce"].map((tier) => (
              <Button
                key={tier}
                variant={filterTier === tier ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterTier(tier)}
                className={
                  filterTier === tier
                    ? "bg-yellow-400 text-black hover:bg-yellow-500"
                    : "border-zinc-700 text-zinc-400 hover:text-white"
                }
              >
                {tier === "all" ? "Todos" : tier.charAt(0).toUpperCase() + tier.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats rapidos */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(["oro", "plata", "bronce"] as const).map((tier) => {
            const config = TIER_CONFIG[tier]
            const Icon = config.icon
            const count = sponsors.filter((s) => s.tier === tier && s.activo).length
            return (
              <Card key={tier} className={`${config.bg} border`}>
                <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                  <Icon className={`w-6 h-6 ${config.color}`} />
                  <div>
                    <div className={`text-xl sm:text-2xl font-black ${config.color}`}>{count}</div>
                    <div className="text-xs text-gray-400">{config.label}</div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Listado por tier */}
        {(["oro", "plata", "bronce"] as const).map((tier) => {
          const items = grouped[tier]
          if (items.length === 0 && filterTier !== "all" && filterTier !== tier) return null
          const config = TIER_CONFIG[tier]
          const Icon = config.icon

          return (
            <div key={tier} className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <h2 className={`text-lg font-bold ${config.color}`}>
                    Patrocinadores {config.label}
                  </h2>
                  <Badge className={config.badge}>{items.length}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openNew(tier)}
                  className="border-zinc-700 text-zinc-400 hover:text-white text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Agregar {config.label}
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg">
                  No hay sponsors {config.label.toLowerCase()}
                </div>
              ) : (
                <div className="grid gap-3">
                  {items.map((sponsor) => (
                    <Card
                      key={sponsor.id}
                      className={`bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 transition-all ${
                        !sponsor.activo ? "opacity-50" : ""
                      }`}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                          {/* Logo */}
                          <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                            {sponsor.logo_url ? (
                              <img
                                src={sponsor.logo_url}
                                alt={sponsor.nombre}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-zinc-600" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-white font-bold text-sm sm:text-base truncate">
                                {sponsor.nombre_comercial || sponsor.nombre}
                              </h3>
                              {!sponsor.activo && (
                                <Badge variant="outline" className="text-red-400 border-red-400/30 text-[10px]">
                                  Inactivo
                                </Badge>
                              )}
                            </div>
                            {sponsor.descripcion && (
                              <p className="text-zinc-400 text-xs sm:text-sm line-clamp-1 mt-0.5">
                                {sponsor.descripcion}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-zinc-500 text-xs">
                              {sponsor.telefono && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {sponsor.telefono}
                                </span>
                              )}
                              {sponsor.instagram && (
                                <span className="flex items-center gap-1">
                                  <Instagram className="w-3 h-3" /> IG
                                </span>
                              )}
                              {sponsor.whatsapp && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-green-500" /> WA
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleActivo(sponsor)}
                              title={sponsor.activo ? "Desactivar" : "Activar"}
                              className="text-zinc-400 hover:text-white h-8 w-8 p-0"
                            >
                              {sponsor.activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(sponsor)}
                              className="text-zinc-400 hover:text-yellow-400 h-8 w-8 p-0"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(sponsor.id)}
                              className="text-zinc-400 hover:text-red-400 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal Edicion/Creacion */}
      {modalOpen && editingSponsor && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={closeModal}>
            <div
              className="relative bg-zinc-900 rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl sm:mx-4 max-h-[90vh] overflow-y-auto border-t sm:border border-zinc-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header modal */}
              <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-bold text-white">
                  {isNew ? "Nuevo Sponsor" : "Editar Sponsor"}
                </h2>
                <button onClick={closeModal} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Tier */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Clasificacion *</label>
                  <div className="flex gap-2">
                    {(["oro", "plata", "bronce"] as const).map((t) => {
                      const c = TIER_CONFIG[t]
                      return (
                        <button
                          key={t}
                          onClick={() => setEditingSponsor({ ...editingSponsor, tier: t })}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-semibold transition-all ${
                            editingSponsor.tier === t
                              ? `${c.bg} ${c.color}`
                              : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          <c.icon className="w-4 h-4" />
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Datos basicos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Nombre *</label>
                    <Input
                      value={editingSponsor.nombre || ""}
                      onChange={(e) => setEditingSponsor({ ...editingSponsor, nombre: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Nombre del sponsor"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Nombre Comercial</label>
                    <Input
                      value={editingSponsor.nombre_comercial || ""}
                      onChange={(e) => setEditingSponsor({ ...editingSponsor, nombre_comercial: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Razon social o nombre comercial"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Descripcion</label>
                  <textarea
                    value={editingSponsor.descripcion || ""}
                    onChange={(e) => setEditingSponsor({ ...editingSponsor, descripcion: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-md p-2 text-sm min-h-[80px] resize-y"
                    placeholder="Descripcion del sponsor..."
                  />
                </div>

                {/* Logo upload */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Logo</label>
                  <div className="flex items-center gap-4">
                    {/* Preview */}
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                      {editingSponsor.logo_url ? (
                        <img
                          src={editingSponsor.logo_url}
                          alt="Preview"
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-zinc-600" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg cursor-pointer transition-colors text-sm text-zinc-300">
                        {uploadingLogo ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4" />
                            {editingSponsor.logo_url ? "Cambiar imagen" : "Subir imagen"}
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-zinc-500">
                        Solo archivos JPG o PNG (max 2MB)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Categoria</label>
                    <Input
                      value={editingSponsor.categoria || ""}
                      onChange={(e) => setEditingSponsor({ ...editingSponsor, categoria: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Ej: Equipamiento Deportivo"
                    />
                  </div>
                </div>

                {/* Contacto */}
                <div className="border-t border-zinc-800 pt-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-yellow-400" /> Contacto
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Telefono</label>
                      <Input
                        value={editingSponsor.telefono || ""}
                        onChange={(e) => setEditingSponsor({ ...editingSponsor, telefono: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        placeholder="+54 9 ..."
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">WhatsApp (solo numeros)</label>
                      <Input
                        value={editingSponsor.whatsapp || ""}
                        onChange={(e) => setEditingSponsor({ ...editingSponsor, whatsapp: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        placeholder="5493442123456"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Email</label>
                      <Input
                        value={editingSponsor.email || ""}
                        onChange={(e) => setEditingSponsor({ ...editingSponsor, email: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        placeholder="contacto@empresa.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Direccion</label>
                      <Input
                        value={editingSponsor.direccion || ""}
                        onChange={(e) => setEditingSponsor({ ...editingSponsor, direccion: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        placeholder="Calle 123, Ciudad"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-xs text-gray-400 mb-1 block">Horario</label>
                    <Input
                      value={editingSponsor.horario || ""}
                      onChange={(e) => setEditingSponsor({ ...editingSponsor, horario: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Lun a Vie: 9:00-18:00"
                    />
                  </div>
                </div>

                {/* Redes sociales */}
                <div className="border-t border-zinc-800 pt-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-yellow-400" /> Redes Sociales
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Instagram</label>
                      <Input
                        value={editingSponsor.instagram || ""}
                        onChange={(e) => setEditingSponsor({ ...editingSponsor, instagram: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Facebook</label>
                      <Input
                        value={editingSponsor.facebook || ""}
                        onChange={(e) => setEditingSponsor({ ...editingSponsor, facebook: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        placeholder="https://facebook.com/..."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-400 mb-1 block">Sitio Web</label>
                      <Input
                        value={editingSponsor.website || ""}
                        onChange={(e) => setEditingSponsor({ ...editingSponsor, website: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                {/* Servicios (solo oro y plata) */}
                {(editingSponsor.tier === "oro" || editingSponsor.tier === "plata") && (
                  <div className="border-t border-zinc-800 pt-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Servicios</h3>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={servicioInput}
                        onChange={(e) => setServicioInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addServicio())}
                        className="bg-zinc-800 border-zinc-700 text-white flex-1"
                        placeholder="Agregar servicio..."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addServicio}
                        className="border-zinc-700 text-zinc-400"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(editingSponsor.servicios || []).map((s, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 text-zinc-300 text-xs rounded-md border border-zinc-700"
                        >
                          {s}
                          <button onClick={() => removeServicio(i)} className="text-zinc-500 hover:text-red-400">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opciones */}
                <div className="border-t border-zinc-800 pt-4 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingSponsor.activo ?? true}
                      onChange={(e) => setEditingSponsor({ ...editingSponsor, activo: e.target.checked })}
                      className="rounded border-zinc-600"
                    />
                    Visible en la pagina
                  </label>
                  <div>
                    <label className="text-xs text-gray-400 mr-2">Orden</label>
                    <Input
                      type="number"
                      value={editingSponsor.orden ?? 0}
                      onChange={(e) => setEditingSponsor({ ...editingSponsor, orden: parseInt(e.target.value) || 0 })}
                      className="bg-zinc-800 border-zinc-700 text-white w-20 inline-block"
                    />
                  </div>
                </div>
              </div>

              {/* Footer modal */}
              <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-4 flex gap-3 justify-end">
                <Button variant="outline" onClick={closeModal} className="border-zinc-700 text-zinc-400">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !editingSponsor.nombre?.trim()}
                  className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  {isNew ? "Crear" : "Guardar"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Confirmar Eliminacion */}
      {deleteId && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={() => setDeleteId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 mx-4 max-w-sm w-full">
              <h3 className="text-white font-bold text-lg mb-2">Eliminar Sponsor</h3>
              <p className="text-zinc-400 text-sm mb-6">
                Esta accion no se puede deshacer. El sponsor sera eliminado permanentemente.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setDeleteId(null)} className="border-zinc-700 text-zinc-400">
                  Cancelar
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

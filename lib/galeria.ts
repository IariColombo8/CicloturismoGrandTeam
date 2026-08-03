import { createClient } from "@supabase/supabase-js"
import { getTeamPhotos, type GalleryImage } from "@/lib/teamPhotos"

// Cliente propio de servidor: `lib/supabase.ts` es "use client" y no sirve aca.
// Usa la clave anon (solo lectura publica de content_settings).
function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

interface FotoGuardada {
  url?: string
  caption?: string
  alt?: string
}

export interface FotografoGuardado {
  id?: string
  name?: string
  link?: string
  description?: string
}

export interface Fotografo {
  id: string
  name: string
  link: string
  description: string
}

/**
 * Fotos de la seccion #galeria. Prioridad:
 * 1. Fotos publicadas desde /admin/galeria (content_settings.id = "fotos")
 * 2. Fotos del equipo en public/fotos equipo
 * 3. [] -> el componente Gallery usa su respaldo interno
 */
export async function getGaleriaFotos(): Promise<GalleryImage[]> {
  try {
    const { data, error } = await createServerClient()
      .from("content_settings")
      .select("data")
      .eq("id", "fotos")
      .maybeSingle()

    if (error) throw error

    const fotos = (data?.data as { fotos?: FotoGuardada[] } | null)?.fotos ?? []
    const publicadas = fotos
      .filter((f): f is FotoGuardada & { url: string } => Boolean(f?.url?.trim()))
      .map((f, index) => ({
        url: f.url,
        alt: f.alt?.trim() || f.caption?.trim() || `Foto de la galeria ${index + 1}`,
        title: f.caption?.trim() || "Grand Team Bike",
      }))

    if (publicadas.length > 0) return publicadas
  } catch (error) {
    console.error("No se pudieron cargar las fotos de la galeria:", error)
  }

  return getTeamPhotos()
}

/**
 * Fotógrafos publicados desde /admin/galeria (content_settings.id = "fotos",
 * campo data.fotografos). Son tarjetas con link externo a su álbum
 * (Drive/Photos/etc.), no imágenes propias.
 */
export async function getGaleriaFotografos(): Promise<Fotografo[]> {
  try {
    const { data, error } = await createServerClient()
      .from("content_settings")
      .select("data")
      .eq("id", "fotos")
      .maybeSingle()

    if (error) throw error

    const fotografos = (data?.data as { fotografos?: FotografoGuardado[] } | null)?.fotografos ?? []
    return fotografos
      .filter((f): f is FotografoGuardado & { name: string; link: string } =>
        Boolean(f?.name?.trim() && f?.link?.trim())
      )
      .map((f, index) => ({
        id: f.id || `fotografo-${index}`,
        name: f.name.trim(),
        link: f.link.trim(),
        description: f.description?.trim() || "",
      }))
  } catch (error) {
    console.error("No se pudieron cargar los fotografos de la galeria:", error)
    return []
  }
}

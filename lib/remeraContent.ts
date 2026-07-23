// Contenido editorial de la sección Remera (compartido entre /admin/remera,
// la sección del home y la página pública /pedir-remera) para que los tres
// lugares muestren siempre el mismo contenido.

// Nombres de íconos lucide-react ya usados en el resto del sitio (remera,
// inscripción, sponsors) para que el admin pueda elegir un ícono por
// característica sin salirse del set visual del sitio.
export const REMERA_ICON_OPTIONS = [
  "BadgeCheck",
  "Ruler",
  "Truck",
  "CreditCard",
  "Shirt",
  "Tag",
  "Package",
  "MapPin",
  "CheckCircle",
  "Star",
  "Heart",
  "Award",
  "Clock",
  "Users",
  "ShieldCheck",
] as const

export type RemeraIconName = (typeof REMERA_ICON_OPTIONS)[number]

export interface JerseyFeature {
  id: string
  title: string
  description: string
  icon?: RemeraIconName
}

export interface RemeraContentData {
  badgeText: string
  title: string
  description: string
  imageUrl: string
  price: string
  callToActionTitle: string
  callToActionDescription: string
  aliasInfo: string
  features: JerseyFeature[]
  talles: string[]
  sizeChartImageUrl: string
  showSection: boolean
}

export const REMERA_DEFAULT_TALLES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"]

export const REMERA_CONTENT_DEFAULTS: RemeraContentData = {
  badgeText: "Merch oficial del evento",
  title: "Remera Grand Team Bike",
  description:
    "Llevate la remera oficial de la edición 2026. Elegí tu talle, adjuntá el comprobante y el equipo coordina la entrega con vos.",
  imageUrl: "/remera.png",
  price: "",
  callToActionTitle: "¿Querés tu remera?",
  callToActionDescription: "",
  aliasInfo: "",
  features: [
    { id: "f1", title: "Remera oficial", description: "Diseño exclusivo del evento Grand Team Bike 2026.", icon: "BadgeCheck" },
    { id: "f2", title: "Todos los talles", description: "Desde XS hasta 5XL para que le quede bien a todos.", icon: "Ruler" },
    { id: "f3", title: "Retiro o envío", description: "Retirala en el evento o recibila en tu domicilio.", icon: "Truck" },
    { id: "f4", title: "Pago simple", description: "Coordinás el pago por transferencia y adjuntás el comprobante.", icon: "CreditCard" },
  ],
  talles: REMERA_DEFAULT_TALLES,
  sizeChartImageUrl: "",
  showSection: true,
}

// Combina lo guardado en Supabase con los valores por defecto: un campo vacío
// o ausente en la base cae al valor que ya se muestra hoy en el sitio.
export function mergeRemeraContent(remote: Partial<RemeraContentData> | null | undefined): RemeraContentData {
  const r = remote ?? {}
  return {
    badgeText: r.badgeText || REMERA_CONTENT_DEFAULTS.badgeText,
    title: r.title || REMERA_CONTENT_DEFAULTS.title,
    description: r.description || REMERA_CONTENT_DEFAULTS.description,
    imageUrl: r.imageUrl || REMERA_CONTENT_DEFAULTS.imageUrl,
    price: r.price ?? REMERA_CONTENT_DEFAULTS.price,
    callToActionTitle: r.callToActionTitle || REMERA_CONTENT_DEFAULTS.callToActionTitle,
    callToActionDescription: r.callToActionDescription ?? REMERA_CONTENT_DEFAULTS.callToActionDescription,
    aliasInfo: r.aliasInfo ?? REMERA_CONTENT_DEFAULTS.aliasInfo,
    features: r.features && r.features.length > 0 ? r.features : REMERA_CONTENT_DEFAULTS.features,
    talles: r.talles && r.talles.length > 0 ? r.talles : REMERA_CONTENT_DEFAULTS.talles,
    sizeChartImageUrl: r.sizeChartImageUrl ?? REMERA_CONTENT_DEFAULTS.sizeChartImageUrl,
    showSection: r.showSection ?? REMERA_CONTENT_DEFAULTS.showSection,
  }
}

export function uid() {
  return Math.random().toString(36).slice(2)
}

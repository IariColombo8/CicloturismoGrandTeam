/**
 * Helpers de formateo numérico para Grand Team Bike 2026.
 * Centralizados acá para mantener consistencia en dashboard, gastos, stats.
 */

/**
 * Formatea un monto en pesos argentinos en forma compacta.
 * Ej: 10500000 → "$10,5M" · 25000 → "$25k" · 800 → "$800"
 */
export function formatCurrencyShort(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "$0"
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1).replace(".", ",")}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`
  return `${sign}$${abs}`
}

/**
 * Formatea un monto completo con separadores locales argentinos.
 * Ej: 10500000 → "$10.500.000"
 */
export function formatCurrency(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "$0"
  return `$${n.toLocaleString("es-AR")}`
}

/**
 * Formatea un número con separadores locales.
 */
export function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "0"
  return n.toLocaleString("es-AR")
}

/**
 * Formatea una fecha de Firestore (Timestamp o ISO string) a dd/mm/aaaa.
 */
export function formatDate(value: any): string {
  if (!value) return "-"
  try {
    if (typeof value === "object" && "seconds" in value) {
      return new Date(value.seconds * 1000).toLocaleDateString("es-AR")
    }
    return new Date(value).toLocaleDateString("es-AR")
  } catch {
    return "-"
  }
}

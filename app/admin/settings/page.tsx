import { redirect } from "next/navigation"

// /admin/settings redirige a /admin/configuraciones
// (ya es la página completa de configuración del evento)
export default function AdminSettingsPage() {
  redirect("/admin/configuraciones")
}

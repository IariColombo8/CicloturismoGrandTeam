"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Settings,
  ClipboardList,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  Bike,
  LogOut,
  Shirt,
  LayoutTemplate,
  QrCode,
  Handshake,
  LucideIcon,
} from "lucide-react"
import { useAdminLayout } from "./AdminLayoutContext"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: "/", label: "Volver al Inicio", icon: Home },
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/registro-inscripciones", label: "Inscripciones", icon: ClipboardList },
  { href: "/admin/check-in", label: "Check-in QR", icon: QrCode },
  { href: "/admin/remera", label: "Remeras", icon: Shirt },
  { href: "/admin/gastos", label: "Gastos", icon: DollarSign },
  { href: "/admin/ciclos", label: "Ciclos Provincia", icon: Bike },
  { href: "/admin/grandteam", label: "Grand Team", icon: Users },
  { href: "/admin/sponsors", label: "Sponsors", icon: Handshake },
  { href: "/admin/content", label: "Contenido", icon: LayoutTemplate },
  { href: "/admin/configuraciones", label: "Configuraciones", icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useAdminLayout()
  const { user } = useSupabaseContext()

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || ""
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join("")

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname?.startsWith(href)
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setMobileOpen(false)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <>
      {/* ─────── Botón hamburguesa (solo móvil) ───────
        Se oculta cuando el menú está abierto para no
        chocar con el header sticky del dashboard. */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Cerrar menú lateral" : "Abrir menú lateral"}
        aria-expanded={mobileOpen}
        aria-controls="admin-sidebar"
        className={[
          "md:hidden fixed top-[5.25rem] left-3 z-40",
          "h-10 w-10 grid place-items-center rounded-lg",
          "bg-zinc-900/90 backdrop-blur border border-yellow-400/30",
          "text-yellow-400 shadow-lg",
          "hover:bg-zinc-800 active:scale-95 transition-all",
          mobileOpen ? "opacity-0 pointer-events-none" : "opacity-100",
        ].join(" ")}
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* ─────── Overlay móvil ─────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-20 bg-black/70 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─────── Sidebar ─────── */}
      <aside
        id="admin-sidebar"
        aria-label="Navegación administración"
        className={[
          "fixed top-20 left-0 h-[calc(100dvh-5rem)] z-40",
          "bg-gradient-to-b from-zinc-900 via-black to-zinc-900",
          "border-r border-yellow-400/20",
          "transition-[transform,width] duration-300 ease-in-out motion-reduce:transition-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-20" : "md:w-64",
          "md:translate-x-0",
          "w-[80vw] max-w-72",
          "flex flex-col",
        ].join(" ")}
      >
        {/* Botón cerrar (solo móvil, dentro del aside) */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
          className="md:hidden absolute top-3 right-3 h-9 w-9 grid place-items-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Botón collapse (solo desktop) */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          aria-expanded={!collapsed}
          className="hidden md:flex absolute -right-3 top-6 w-6 h-6 bg-zinc-900 border border-yellow-400/30 rounded-full items-center justify-center text-yellow-400 hover:bg-zinc-800 transition-all"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
          ) : (
            <ChevronLeft className="w-3 h-3" aria-hidden="true" />
          )}
        </button>

        {/* Navegación */}
        <nav
          aria-label="Secciones de administración"
          className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto pt-14 md:pt-4"
        >
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center gap-3 rounded-lg transition-colors duration-150 text-sm",
                  "px-3 py-2.5 md:px-4 md:py-3",
                  collapsed ? "md:justify-center md:px-0" : "",
                  active
                    ? "bg-yellow-400/10 text-yellow-400 border-l-2 border-yellow-400"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent",
                ].join(" ")}
              >
                <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span
                  className={[
                    "font-medium truncate",
                    collapsed ? "md:hidden" : "",
                  ].join(" ")}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Footer: usuario + logout + branding */}
        <div className="border-t border-yellow-400/20 bg-zinc-900/50">
          {/* Info del usuario */}
          <div
            className={[
              "flex items-center gap-3 px-3 py-3 md:px-4",
              collapsed ? "md:justify-center md:px-0" : "",
            ].join(" ")}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-yellow-400/30 flex-shrink-0 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full border border-yellow-400/30 flex-shrink-0 bg-yellow-400/10 grid place-items-center text-yellow-400 text-xs font-bold">
                {initials || "?"}
              </div>
            )}
            <div
              className={[
                "min-w-0",
                collapsed ? "md:hidden" : "",
              ].join(" ")}
            >
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title={collapsed ? "Cerrar Sesión" : undefined}
            className={[
              "w-full flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-colors",
              "px-3 py-2.5 md:px-4 md:py-3 text-sm",
              collapsed ? "md:justify-center md:px-0" : "",
            ].join(" ")}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span
              className={[
                "font-medium",
                collapsed ? "md:hidden" : "",
              ].join(" ")}
            >
              Cerrar Sesión
            </span>
          </button>

          {!collapsed && (
            <div className="px-4 pb-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                Panel de Administración
              </p>
              <p className="text-sm font-semibold gradient-text">
                Grand Team Bike 2026
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

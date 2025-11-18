"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  LucideIcon
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  color: string
  hoverColor: string
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navItems: NavItem[] = [
    {
      href: "/",
      label: "Volver al Inicio",
      icon: Home,
      color: "text-blue-400",
      hoverColor: "hover:bg-blue-500/10"
    },
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      color: "text-yellow-400",
      hoverColor: "hover:bg-yellow-500/10"
    },
    {
      href: "/admin/registro-inscripciones",
      label: "Inscripciones",
      icon: ClipboardList,
      color: "text-green-400",
      hoverColor: "hover:bg-green-500/10"
    },
    {
      href: "/admin/gastos",
      label: "Gastos",
      icon: DollarSign,
      color: "text-purple-400",
      hoverColor: "hover:bg-purple-500/10"
    },
    {
      href: "/admin/grandteam",
      label: "Grand Team",
      icon: Users,
      color: "text-pink-400",
      hoverColor: "hover:bg-pink-500/10"
    },
    {
      href: "/admin/configuraciones",
      label: "Configuraciones",
      icon: Settings,
      color: "text-cyan-400",
      hoverColor: "hover:bg-cyan-500/10"
    },
  ]

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-24 left-4 z-50 md:hidden p-3 bg-zinc-900 border border-yellow-400/30 rounded-lg text-yellow-400 hover:bg-zinc-800 transition-all shadow-lg"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-20 left-0 h-[calc(100vh-5rem)] bg-gradient-to-b from-zinc-900 via-black to-zinc-900 border-r border-yellow-400/20 z-40
          transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "md:w-20" : "md:w-64"}
          md:translate-x-0
          w-64
        `}
      >
        {/* Collapse Button (Desktop only) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-6 w-6 h-6 bg-zinc-900 border border-yellow-400/30 rounded-full items-center justify-center text-yellow-400 hover:bg-zinc-800 transition-all"
          aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const IconComponent = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${active 
                    ? `bg-gradient-to-r from-yellow-400/20 to-transparent border-l-4 border-yellow-400 ${item.color}` 
                    : `text-gray-400 ${item.hoverColor} hover:text-white`
                  }
                  ${isCollapsed ? "md:justify-center" : ""}
                `}
                title={isCollapsed ? item.label : ""}
              >
                <IconComponent 
                  className={`w-5 h-5 flex-shrink-0 ${active ? item.color : ""}`} 
                />
                <span className={`font-medium ${isCollapsed ? "md:hidden" : ""}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Footer Info */}
        {!isCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-yellow-400/20 bg-zinc-900/50">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Panel de Administración</p>
              <p className="text-sm font-semibold gradient-text">Grand Team Bike 2026</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Spacer */}
      <div className={`${isCollapsed ? "md:ml-20" : "md:ml-64"} transition-all duration-300`} />
    </>
  )
}
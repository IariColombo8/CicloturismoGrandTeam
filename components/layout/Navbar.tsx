"use client"

import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, User, LayoutDashboard, LogOut, DollarSign, Settings, Home, ChevronDown, Shirt } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useSupabaseContext } from "@/components/providers/SupabaseProvider"
import { usePathname, useRouter } from "next/navigation"

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState("inicio")
  // Guard de hidratación: el resaltado de la sección activa depende de estado
  // del cliente (scroll/pathname). Hasta montar, renderizamos el estado base
  // (sin link activo) para que el primer render del cliente coincida con el
  // del servidor y no haya hydration mismatch.
  const [mounted, setMounted] = useState(false)
  const { user, userRole } = useSupabaseContext()
  const pathname = usePathname()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isAdminOrGrandTeam = userRole === "admin" || userRole === "grandteam"
  const isRemera = userRole === "remera"
  // Personal con acceso a admin (incluye rol acotado "remera")
  const isStaff = isAdminOrGrandTeam || isRemera
  const isInAdminPages = pathname?.startsWith("/admin")

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || ""

  // Marcamos montado tras la hidratación para habilitar el resaltado activo.
  useEffect(() => {
    setMounted(true)
  }, [])

  // Scroll listener optimizado con requestAnimationFrame
  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Click outside dropdown (solo aplica al dropdown de escritorio: dropdownRef
  // no envuelve el menu mobile, asi que en mobile esto se salta por completo
  // para no cerrar el dropdown mobile antes de que el tap en un link llegue
  // a disparar su evento click).
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen) return
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMobileMenuOpen])

  // Cerrar menu mobile al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setOpenDropdown(null)
  }, [pathname])

  // Scroll spy: resalta el link de la seccion visible (solo en la landing).
  // Banda central del viewport para decidir la seccion "activa".
  useEffect(() => {
    if (pathname !== "/") return
    const sectionIds = ["inicio", "nosotros", "pedir-remera", "detalles", "galeria", "patrocinadores", "contacto"]
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        }
      },
      { rootMargin: "-45% 0px -55% 0px", threshold: 0 }
    )
    sectionIds.forEach((id) => {
      document.querySelectorAll(`#${id}`).forEach((el) => observer.observe(el))
    })
    return () => observer.disconnect()
  }, [pathname])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setIsMobileMenuOpen(false)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Navegación a secciones de la portada desde cualquier ruta.
  const handleSectionClick = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault()
    setIsMobileMenuOpen(false)
    setOpenDropdown(null)

    if (pathname !== "/") {
      // En páginas como /inscripcion no existen estas secciones. Navegamos
      // primero a la portada y dejamos que el hash posicione el contenido.
      router.push(`/#${sectionId}`)
      return
    }

    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
      window.history.replaceState(null, "", `#${sectionId}`)
    }
  }

  const navLinks = useMemo(() => [
    { id: "inicio", label: "Inicio" },
    { id: "nosotros", label: "Sobre Nosotros" },
    { id: "pedir-remera", label: "Pedir Remera" },
    { id: "contacto", label: "Contacto" },
  ], [])

  // Sub-secciones agrupadas bajo el dropdown "Detalles"
  const detailsLinks = useMemo(() => [
    { id: "detalles", label: "Mapa" },
    { id: "galeria", label: "Galería" },
    { id: "patrocinadores", label: "Sponsors" },
  ], [])

  // Lista plana (para el dropdown "Volver a Inicio" en páginas de admin)
  const flatSectionLinks = useMemo(() => [
    { id: "inicio", label: "Inicio" },
    { id: "nosotros", label: "Sobre Nosotros" },
    { id: "pedir-remera", label: "Pedir Remera" },
    ...detailsLinks,
    { id: "contacto", label: "Contacto" },
  ], [detailsLinks])

  const adminLinks = useMemo(() => {
    // El rol "remera" solo administra la sección de remeras
    if (isRemera) {
      return [{ href: "/admin/remera", label: "Remera", icon: Shirt }]
    }
    return [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/gastos", label: "Gastos", icon: DollarSign },
      { href: "/admin/grandteam", label: "Grand Team", icon: User },
      { href: "/admin/configuraciones", label: "Configuraciones", icon: Settings },
    ]
  }, [isRemera])

  const toggleDropdown = useCallback((dropdown: string) => {
    setOpenDropdown((prev) => prev === dropdown ? null : dropdown)
  }, [])

  // Helpers de render para los links de la landing: unica fuente de markup
  // (desktop y mobile) con resaltado de la seccion activa via scroll spy.
  const isLinkActive = (id: string) => mounted && pathname === "/" && activeSection === id

  const renderDesktopLink = (link: { id: string; label: string }) => {
    const active = isLinkActive(link.id)
    return (
      <a
        key={link.id}
        href={`/#${link.id}`}
        onClick={(e) => handleSectionClick(e, link.id)}
        aria-current={active ? "true" : undefined}
        className={`${active ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-400 transition-colors duration-200 font-medium relative group cursor-pointer`}
      >
        {link.label}
        <span
          className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-300 ${active ? "w-full" : "w-0 group-hover:w-full"}`}
        ></span>
      </a>
    )
  }

  const renderMobileLink = (link: { id: string; label: string }) => {
    const active = isLinkActive(link.id)
    return (
      <a
        key={link.id}
        href={`/#${link.id}`}
        onClick={(e) => handleSectionClick(e, link.id)}
        aria-current={active ? "true" : undefined}
        className={`block ${active ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-400 py-3 transition-colors border-b border-zinc-800`}
      >
        {link.label}
      </a>
    )
  }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-gradient-to-r from-black via-zinc-900 to-yellow-900/20 backdrop-blur-lg shadow-lg shadow-yellow-500/10"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="relative w-12 h-12 transition-transform group-hover:scale-110 duration-300">
                <Image 
                  src="/logo.png" 
                  alt="Grand Team Bike Logo" 
                  fill 
                  className="object-contain"
                  priority
                />
              </div>
              <span className="hidden sm:block text-xl font-bold gradient-text">Grand Team Bike</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8" ref={dropdownRef}>
              {isStaff && isInAdminPages ? (
                // Vista admin en páginas de admin
                <>
                  <DropdownMenu
                    label="Volver a Inicio"
                    icon={<Home size={18} />}
                    isOpen={openDropdown === "inicio"}
                    onToggle={() => toggleDropdown("inicio")}
                  >
                    {flatSectionLinks.map((link) => (
                      <a
                        key={link.id}
                        href={`/#${link.id}`}
                        onClick={(e) => handleSectionClick(e, link.id)}
                        className="block px-4 py-3 text-gray-300 hover:bg-yellow-400/10 hover:text-yellow-400 transition-colors"
                      >
                        {link.label}
                      </a>
                    ))}
                  </DropdownMenu>

                  {adminLinks.map((link) => {
                    const IconComponent = link.icon
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 transition-colors duration-200 font-medium relative group"
                      >
                        <IconComponent size={18} />
                        {link.label}
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 group-hover:w-full transition-all duration-300"></span>
                      </Link>
                    )
                  })}
                </>
              ) : isStaff ? (
                // Vista admin en página principal
                <>
                  {renderDesktopLink(navLinks[0])}
                  {renderDesktopLink(navLinks[1])}
                  {renderDesktopLink(navLinks[2])}
                  <DropdownMenu
                    label="Detalles"
                    isOpen={openDropdown === "detalles"}
                    onToggle={() => toggleDropdown("detalles")}
                  >
                    {detailsLinks.map((link) => (
                      <a
                        key={link.id}
                        href={`/#${link.id}`}
                        onClick={(e) => handleSectionClick(e, link.id)}
                        className="block px-4 py-3 text-gray-300 hover:bg-yellow-400/10 hover:text-yellow-400 transition-colors"
                      >
                        {link.label}
                      </a>
                    ))}
                  </DropdownMenu>
                  {renderDesktopLink(navLinks[3])}

                  <DropdownMenu
                    label="Admin"
                    isOpen={openDropdown === "admin"}
                    onToggle={() => toggleDropdown("admin")}
                  >
                    {adminLinks.map((link) => {
                      const IconComponent = link.icon
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-yellow-400/10 hover:text-yellow-400 transition-colors"
                        >
                          <IconComponent size={18} />
                          {link.label}
                        </Link>
                      )
                    })}
                  </DropdownMenu>
                </>
              ) : (
                // Vista usuarios normales
                <>
                  {renderDesktopLink(navLinks[0])}
                  {renderDesktopLink(navLinks[1])}
                  {renderDesktopLink(navLinks[2])}
                  <DropdownMenu
                    label="Detalles"
                    isOpen={openDropdown === "detalles"}
                    onToggle={() => toggleDropdown("detalles")}
                  >
                    {detailsLinks.map((link) => (
                      <a
                        key={link.id}
                        href={`/#${link.id}`}
                        onClick={(e) => handleSectionClick(e, link.id)}
                        className="block px-4 py-3 text-gray-300 hover:bg-yellow-400/10 hover:text-yellow-400 transition-colors"
                      >
                        {link.label}
                      </a>
                    ))}
                  </DropdownMenu>
                  {renderDesktopLink(navLinks[3])}
                </>
              )}
            </div>

            {/* CTA Buttons Desktop */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                href="/inscripcion"
                className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black font-bold rounded-lg hover:scale-105 transition-transform duration-200 shadow-lg hover:shadow-yellow-500/50"
              >
                Inscribirme
              </Link>

              {user ? (
                <div className="flex items-center gap-2">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full border border-yellow-400/30 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full border border-yellow-400/30 bg-yellow-400/10 grid place-items-center text-yellow-400 text-xs font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="p-2.5 border-2 border-red-400 text-red-400 rounded-lg hover:bg-red-400 hover:text-white transition-all duration-200"
                    title="Cerrar Sesión"
                    aria-label="Cerrar sesión"
                  >
                    <LogOut size={20} />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="p-2.5 border-2 border-yellow-400 text-yellow-400 rounded-lg hover:bg-yellow-400 hover:text-black transition-all duration-200"
                  title="Iniciar Sesión"
                  aria-label="Iniciar sesión"
                >
                  <User size={20} />
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-all duration-300 ${
          isMobileMenuOpen ? "visible" : "invisible"
        }`}
      >
        {/* Overlay */}
        <div
          className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Menu Panel */}
        <div
          className={`absolute top-20 right-0 w-full max-w-sm h-[calc(100vh-5rem)] bg-gradient-to-b from-zinc-900 via-black to-zinc-900 border-l border-t border-yellow-400/20 shadow-2xl transform transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-full overflow-y-auto px-6 py-6 space-y-4">
            {isStaff && isInAdminPages ? (
              // Mobile admin en páginas admin
              <>
                <MobileDropdown
                  label="Volver a Inicio"
                  icon={<Home size={18} />}
                  isOpen={openDropdown === "inicio"}
                  onToggle={() => toggleDropdown("inicio")}
                >
                  {flatSectionLinks.map((link) => (
                    <a
                      key={link.id}
                      href={`/#${link.id}`}
                      onClick={(e) => handleSectionClick(e, link.id)}
                      className="block text-gray-400 hover:text-yellow-400 py-2 transition-colors text-sm pl-8"
                    >
                      {link.label}
                    </a>
                  ))}
                </MobileDropdown>

                {adminLinks.map((link) => {
                  const IconComponent = link.icon
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 py-3 transition-colors border-b border-zinc-800"
                    >
                      <IconComponent size={18} />
                      {link.label}
                    </Link>
                  )
                })}
              </>
            ) : isStaff ? (
              // Mobile admin en página principal
              <>
                {renderMobileLink(navLinks[0])}
                {renderMobileLink(navLinks[1])}
                {renderMobileLink(navLinks[2])}
                <MobileDropdown
                  label="Detalles"
                  isOpen={openDropdown === "detalles"}
                  onToggle={() => toggleDropdown("detalles")}
                >
                  {detailsLinks.map((link) => (
                    <a
                      key={link.id}
                      href={`/#${link.id}`}
                      onClick={(e) => handleSectionClick(e, link.id)}
                      className="block text-gray-400 hover:text-yellow-400 py-2 transition-colors text-sm pl-8"
                    >
                      {link.label}
                    </a>
                  ))}
                </MobileDropdown>
                {renderMobileLink(navLinks[3])}

                <MobileDropdown
                  label="Admin"
                  isOpen={openDropdown === "admin"}
                  onToggle={() => toggleDropdown("admin")}
                >
                  {adminLinks.map((link) => {
                    const IconComponent = link.icon
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 py-2 transition-colors text-sm pl-8"
                      >
                        <IconComponent size={18} />
                        {link.label}
                      </Link>
                    )
                  })}
                </MobileDropdown>
              </>
            ) : (
              // Mobile usuarios normales
              <>
                {renderMobileLink(navLinks[0])}
                {renderMobileLink(navLinks[1])}
                {renderMobileLink(navLinks[2])}
                <MobileDropdown
                  label="Detalles"
                  isOpen={openDropdown === "detalles"}
                  onToggle={() => toggleDropdown("detalles")}
                >
                  {detailsLinks.map((link) => (
                    <a
                      key={link.id}
                      href={`/#${link.id}`}
                      onClick={(e) => handleSectionClick(e, link.id)}
                      className="block text-gray-400 hover:text-yellow-400 py-2 transition-colors text-sm pl-8"
                    >
                      {link.label}
                    </a>
                  ))}
                </MobileDropdown>
                {renderMobileLink(navLinks[3])}
              </>
            )}

            <div className="pt-6 space-y-3">
              <Link
                href="/inscripcion"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full text-center px-6 py-3 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black font-bold rounded-lg shadow-lg hover:shadow-yellow-500/50 transition-all"
              >
                Inscribirme
              </Link>

              {user ? (
                <>
                  <div className="flex items-center gap-3 px-2 py-3 border-b border-zinc-800">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full border border-yellow-400/30 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full border border-yellow-400/30 bg-yellow-400/10 grid place-items-center text-yellow-400 text-sm font-bold">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{displayName}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 w-full px-6 py-3 border-2 border-red-400 text-red-400 rounded-lg hover:bg-red-400 hover:text-white transition-all"
                  >
                    <LogOut size={20} />
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="block w-full text-center px-6 py-3 border-2 border-yellow-400 text-yellow-400 rounded-lg hover:bg-yellow-400 hover:text-black transition-all"
                >
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Props compartidas por los dropdowns de desktop y mobile
interface DropdownProps {
  label: string
  icon?: ReactNode
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}

// Componente reutilizable para Dropdown Desktop
function DropdownMenu({ label, icon, isOpen, onToggle, children }: DropdownProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 transition-colors duration-200 font-medium relative group"
      >
        {icon}
        {label}
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 group-hover:w-full transition-all duration-300"></span>
      </button>
      {isOpen && (
        <div className="absolute top-full mt-2 w-56 bg-zinc-900 border border-yellow-400/20 rounded-lg shadow-xl overflow-hidden animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  )
}

// Componente reutilizable para Dropdown Mobile
function MobileDropdown({ label, icon, isOpen, onToggle, children }: DropdownProps) {
  return (
    <div className="border-b border-zinc-800">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-gray-300 hover:text-yellow-400 py-3 transition-colors"
      >
        <span className="flex items-center gap-2">
          {icon}
          {label}
        </span>
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <div className="pb-2 space-y-1">{children}</div>}
    </div>
  )
}
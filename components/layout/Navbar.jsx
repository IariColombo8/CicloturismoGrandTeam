"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, User, LayoutDashboard, LogOut, DollarSign, Settings, Home, ChevronDown } from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useFirebaseContext } from "@/components/providers/FirebaseProvider"
import { usePathname, useRouter } from "next/navigation"

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const { user, userRole } = useFirebaseContext()
  const pathname = usePathname()
  const router = useRouter()
  const dropdownRef = useRef(null)

  const isAdminOrGrandTeam = userRole === "admin" || userRole === "grandteam"
  const isInAdminPages = pathname?.startsWith("/admin")

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

  // Click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Cerrar menu mobile al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setOpenDropdown(null)
  }, [pathname])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      setIsMobileMenuOpen(false)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Función mejorada para navegación suave a secciones
  const handleSectionClick = (e, sectionId) => {
    e.preventDefault()
    setIsMobileMenuOpen(false)
    setOpenDropdown(null)

    // Si estamos en página de admin, primero ir a home
    if (isInAdminPages) {
      router.push("/")
      // Esperar a que se cargue la página y hacer scroll
      setTimeout(() => {
        const element = document.getElementById(sectionId)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 300)
    } else {
      // Si ya estamos en home, solo hacer scroll
      const element = document.getElementById(sectionId)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }
  }

  const navLinks = [
    { id: "inicio", label: "Inicio" },
    { id: "nosotros", label: "Sobre Nosotros" },
    { id: "detalles", label: "Detalles" },
    { id: "contacto", label: "Contacto" },
  ]

  const adminLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/gastos", label: "Gastos", icon: DollarSign },
    { href: "/admin/grandteam", label: "Grand Team", icon: User },
    { href: "/admin/configuraciones", label: "Configuraciones", icon: Settings },
  ]

  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown)
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
              {isAdminOrGrandTeam && isInAdminPages ? (
                // Vista admin en páginas de admin
                <>
                  <DropdownMenu
                    label="Volver a Inicio"
                    icon={<Home size={18} />}
                    isOpen={openDropdown === "inicio"}
                    onToggle={() => toggleDropdown("inicio")}
                  >
                    {navLinks.map((link) => (
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
              ) : isAdminOrGrandTeam ? (
                // Vista admin en página principal
                <>
                  {navLinks.map((link) => (
                    <a
                      key={link.id}
                      href={`/#${link.id}`}
                      onClick={(e) => handleSectionClick(e, link.id)}
                      className="text-gray-300 hover:text-yellow-400 transition-colors duration-200 font-medium relative group cursor-pointer"
                    >
                      {link.label}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 group-hover:w-full transition-all duration-300"></span>
                    </a>
                  ))}

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
                  {navLinks.map((link) => (
                    <a
                      key={link.id}
                      href={`/#${link.id}`}
                      onClick={(e) => handleSectionClick(e, link.id)}
                      className="text-gray-300 hover:text-yellow-400 transition-colors duration-200 font-medium relative group cursor-pointer"
                    >
                      {link.label}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 group-hover:w-full transition-all duration-300"></span>
                    </a>
                  ))}
                </>
              )}
            </div>

            {/* CTA Buttons Desktop */}
            <div className="hidden md:flex items-center space-x-4">
              {!isAdminOrGrandTeam && (
                <Link
                  href="/inscripcion"
                  className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black font-bold rounded-lg hover:scale-105 transition-transform duration-200 shadow-lg hover:shadow-yellow-500/50"
                >
                  Inscribirse
                </Link>
              )}

              {user ? (
                <button
                  onClick={handleLogout}
                  className="p-2.5 border-2 border-red-400 text-red-400 rounded-lg hover:bg-red-400 hover:text-white transition-all duration-200"
                  title="Cerrar Sesión"
                  aria-label="Cerrar sesión"
                >
                  <LogOut size={20} />
                </button>
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
            {isAdminOrGrandTeam && isInAdminPages ? (
              // Mobile admin en páginas admin
              <>
                <MobileDropdown
                  label="Volver a Inicio"
                  icon={<Home size={18} />}
                  isOpen={openDropdown === "inicio"}
                  onToggle={() => toggleDropdown("inicio")}
                >
                  {navLinks.map((link) => (
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
            ) : isAdminOrGrandTeam ? (
              // Mobile admin en página principal
              <>
                {navLinks.map((link) => (
                  <a
                    key={link.id}
                    href={`/#${link.id}`}
                    onClick={(e) => handleSectionClick(e, link.id)}
                    className="block text-gray-300 hover:text-yellow-400 py-3 transition-colors border-b border-zinc-800"
                  >
                    {link.label}
                  </a>
                ))}

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
                {navLinks.map((link) => (
                  <a
                    key={link.id}
                    href={`/#${link.id}`}
                    onClick={(e) => handleSectionClick(e, link.id)}
                    className="block text-gray-300 hover:text-yellow-400 py-3 transition-colors border-b border-zinc-800"
                  >
                    {link.label}
                  </a>
                ))}
              </>
            )}

            <div className="pt-6 space-y-3">
              {!isAdminOrGrandTeam && (
                <Link
                  href="/inscripcion"
                  className="block w-full text-center px-6 py-3 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black font-bold rounded-lg shadow-lg hover:shadow-yellow-500/50 transition-all"
                >
                  Inscribirse
                </Link>
              )}

              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 border-2 border-red-400 text-red-400 rounded-lg hover:bg-red-400 hover:text-white transition-all"
                >
                  <LogOut size={20} />
                  Cerrar Sesión
                </button>
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

// Componente reutilizable para Dropdown Desktop
function DropdownMenu({ label, icon, isOpen, onToggle, children }) {
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
function MobileDropdown({ label, icon, isOpen, onToggle, children }) {
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
"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X, User, LayoutDashboard, LogOut, DollarSign, Settings, Home, ChevronDown } from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useFirebaseContext } from "@/components/providers/FirebaseProvider"
import { usePathname } from "next/navigation"

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [openMobileDropdown, setOpenMobileDropdown] = useState(null)
  const { user, userRole } = useFirebaseContext()
  const pathname = usePathname()
  const dropdownRef = useRef(null)

  const isAdminOrGrandTeam = userRole === "admin" || userRole === "grandteam"
  const isInAdminPages = pathname?.startsWith("/admin")

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      setIsMobileMenuOpen(false)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const navLinks = [
    { href: "/#inicio", label: "Inicio" },
    { href: "/#nosotros", label: "Sobre Nosotros" },
    { href: "/#detalles", label: "Detalles" },
    { href: "/#contacto", label: "Contacto" },
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

  const toggleMobileDropdown = (dropdown) => {
    setOpenMobileDropdown(openMobileDropdown === dropdown ? null : dropdown)
  }

  return (
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
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative w-12 h-12 transition-transform group-hover:scale-110">
              <Image src="/logo.jpg" alt="Grand Team Bike Logo" fill className="object-contain" />
            </div>
            <span className="hidden sm:block text-xl font-bold gradient-text">Grand Team Bike</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8" ref={dropdownRef}>
            {isAdminOrGrandTeam && isInAdminPages ? (
              // Vista cuando está en páginas de admin
              <>
                {/* Dropdown "Volver a Inicio" */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown("inicio")}
                    className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 transition-colors duration-200 font-medium relative group"
                  >
                    <Home size={18} />
                    Volver a Inicio
                    <ChevronDown size={16} className={`transition-transform ${openDropdown === "inicio" ? "rotate-180" : ""}`} />
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 group-hover:w-full transition-all duration-300"></span>
                  </button>
                  {openDropdown === "inicio" && (
                    <div className="absolute top-full mt-2 w-56 bg-zinc-900 border border-yellow-400/20 rounded-lg shadow-xl overflow-hidden animate-fadeIn">
                      {navLinks.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          onClick={() => setOpenDropdown(null)}
                          className="block px-4 py-3 text-gray-300 hover:bg-yellow-400/10 hover:text-yellow-400 transition-colors"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Links de admin directos */}
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
              // Vista cuando está en la página principal siendo admin
              <>
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-gray-300 hover:text-yellow-400 transition-colors duration-200 font-medium relative group"
                  >
                    {link.label}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 group-hover:w-full transition-all duration-300"></span>
                  </a>
                ))}

                {/* Dropdown "Admin" */}
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown("admin")}
                    className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 transition-colors duration-200 font-medium relative group"
                  >
                    Admin
                    <ChevronDown size={16} className={`transition-transform ${openDropdown === "admin" ? "rotate-180" : ""}`} />
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 group-hover:w-full transition-all duration-300"></span>
                  </button>
                  {openDropdown === "admin" && (
                    <div className="absolute top-full mt-2 w-56 bg-zinc-900 border border-yellow-400/20 rounded-lg shadow-xl overflow-hidden animate-fadeIn">
                      {adminLinks.map((link) => {
                        const IconComponent = link.icon
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setOpenDropdown(null)}
                            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-yellow-400/10 hover:text-yellow-400 transition-colors"
                          >
                            <IconComponent size={18} />
                            {link.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Vista para usuarios normales
              <>
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-gray-300 hover:text-yellow-400 transition-colors duration-200 font-medium relative group"
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
                className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black font-bold rounded-lg hover:scale-105 transition-transform duration-200 btn-glow"
              >
                Inscribirse
              </Link>
            )}

            {user ? (
              <button
                onClick={handleLogout}
                className="p-2.5 border-2 border-red-400 text-red-400 rounded-lg hover:bg-red-400 hover:text-white transition-all duration-200"
                title="Cerrar Sesión"
              >
                <LogOut size={20} />
              </button>
            ) : (
              <Link
                href="/login"
                className="p-2.5 border-2 border-yellow-400 text-yellow-400 rounded-lg hover:bg-yellow-400 hover:text-black transition-all duration-200"
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
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-lg border-t border-yellow-400/20 animate-slideInRight">
          <div className="container mx-auto px-4 py-6 space-y-4">
            {isAdminOrGrandTeam && isInAdminPages ? (
              // Vista mobile cuando está en páginas de admin
              <>
                {/* Dropdown "Volver a Inicio" mobile */}
                <div>
                  <button
                    onClick={() => toggleMobileDropdown("inicio")}
                    className="flex items-center justify-between w-full text-gray-300 hover:text-yellow-400 py-2 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Home size={18} />
                      Volver a Inicio
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${openMobileDropdown === "inicio" ? "rotate-180" : ""}`} />
                  </button>
                  {openMobileDropdown === "inicio" && (
                    <div className="ml-6 mt-2 space-y-2">
                      {navLinks.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          onClick={() => {
                            setIsMobileMenuOpen(false)
                            setOpenMobileDropdown(null)
                          }}
                          className="block text-gray-400 hover:text-yellow-400 py-2 transition-colors text-sm"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Links de admin mobile */}
                {adminLinks.map((link) => {
                  const IconComponent = link.icon
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 text-gray-300 hover:text-yellow-400 py-2 transition-colors"
                    >
                      <IconComponent size={18} />
                      {link.label}
                    </Link>
                  )
                })}
              </>
            ) : isAdminOrGrandTeam ? (
              // Vista mobile cuando está en la página principal siendo admin
              <>
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-gray-300 hover:text-yellow-400 py-2 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}

                {/* Dropdown "Admin" mobile */}
                <div>
                  <button
                    onClick={() => toggleMobileDropdown("admin")}
                    className="flex items-center justify-between w-full text-gray-300 hover:text-yellow-400 py-2 transition-colors"
                  >
                    <span>Admin</span>
                    <ChevronDown size={16} className={`transition-transform ${openMobileDropdown === "admin" ? "rotate-180" : ""}`} />
                  </button>
                  {openMobileDropdown === "admin" && (
                    <div className="ml-6 mt-2 space-y-2">
                      {adminLinks.map((link) => {
                        const IconComponent = link.icon
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => {
                              setIsMobileMenuOpen(false)
                              setOpenMobileDropdown(null)
                            }}
                            className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 py-2 transition-colors text-sm"
                          >
                            <IconComponent size={18} />
                            {link.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Vista mobile para usuarios normales
              <>
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-gray-300 hover:text-yellow-400 py-2 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </>
            )}

            <div className="pt-4 space-y-3">
              {!isAdminOrGrandTeam && (
                <Link
                  href="/inscripcion"
                  className="block w-full text-center px-6 py-3 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 text-black font-bold rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
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
                  className="block w-full text-center px-6 py-3 border-2 border-yellow-400 text-yellow-400 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </nav>
  )
}
"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

interface AdminLayoutContextValue {
  /** Sidebar colapsado a íconos (solo desktop). */
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  /** Sidebar abierto como overlay (solo móvil). */
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

const AdminLayoutContext = createContext<AdminLayoutContextValue | null>(null)

const STORAGE_KEY = "admin-sidebar-collapsed"

export function AdminLayoutProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Persistencia del estado collapse en localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === "true") setCollapsedState(true)
    } catch {}
  }, [])

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v)
    try {
      localStorage.setItem(STORAGE_KEY, String(v))
    } catch {}
  }

  return (
    <AdminLayoutContext.Provider
      value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}
    >
      {children}
    </AdminLayoutContext.Provider>
  )
}

export function useAdminLayout() {
  const ctx = useContext(AdminLayoutContext)
  if (!ctx) {
    throw new Error(
      "useAdminLayout debe usarse dentro de <AdminLayoutProvider>"
    )
  }
  return ctx
}

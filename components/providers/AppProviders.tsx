"use client"

import type { ReactNode } from "react"
import { Analytics } from "@vercel/analytics/next"
import { SupabaseProvider } from "@/components/providers/SupabaseProvider"
import { Toaster } from "@/components/ui/toaster"
import AvisoVersion from "@/components/AvisoVersion"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SupabaseProvider>
      {children}
      <Toaster />
      {/* Registra el Service Worker (sitio sin internet + notificaciones) y
          avisa si la persona quedó con una versión vieja del sitio. */}
      <AvisoVersion />
      <Analytics />
    </SupabaseProvider>
  )
}

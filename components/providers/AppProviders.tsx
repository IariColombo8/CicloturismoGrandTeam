"use client"

import type { ReactNode } from "react"
import { Analytics } from "@vercel/analytics/next"
import { SupabaseProvider } from "@/components/providers/SupabaseProvider"
import { Toaster } from "@/components/ui/toaster"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SupabaseProvider>
      {children}
      <Toaster />
      <Analytics />
    </SupabaseProvider>
  )
}

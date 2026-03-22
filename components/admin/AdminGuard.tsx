"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useFirebaseContext } from "@/components/providers/FirebaseProvider"
import { Loader2 } from "lucide-react"

// Rutas que requieren rol "admin" exclusivamente
const ADMIN_ONLY_ROUTES = ["/admin/configuraciones"]

interface AdminGuardProps {
  children: React.ReactNode
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, userRole, loading } = useFirebaseContext()

  const isAdminOnlyRoute = ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route))
  const allowedRoles = isAdminOnlyRoute ? ["admin"] : ["admin", "grandteam"]

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push(`/login?returnUrl=${pathname}`)
      return
    }

    if (userRole && !allowedRoles.includes(userRole)) {
      router.push("/")
    }
  }, [user, userRole, loading, router, pathname, allowedRoles])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
          <p className="text-gray-400 text-sm">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!user || !userRole || !allowedRoles.includes(userRole)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
          <p className="text-gray-400 text-sm">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

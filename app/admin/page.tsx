"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/admin/dashboard")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-yellow-400 text-lg animate-pulse">Redirigiendo al dashboard...</div>
    </div>
  )
}

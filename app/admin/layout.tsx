"use client"

import AdminSidebar from "@/components/admin/AdminSidebar"
import Navbar from "@/components/layout/Navbar"
import {
  AdminLayoutProvider,
  useAdminLayout,
} from "@/components/admin/AdminLayoutContext"

function AdminMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useAdminLayout()
  return (
    <main
      className={[
        "flex-1 w-full overflow-x-hidden pt-20 pb-12",
        "transition-[margin] duration-300 ease-in-out motion-reduce:transition-none",
        // En desktop el sidebar es fixed y le damos margin al main.
        // En móvil el sidebar es overlay → sin margin.
        collapsed ? "md:ml-20" : "md:ml-64",
      ].join(" ")}
    >
      {children}
    </main>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <Navbar />
      <AdminLayoutProvider>
        <div className="flex">
          <AdminSidebar />
          <AdminMain>{children}</AdminMain>
        </div>
      </AdminLayoutProvider>
    </div>
  )
}

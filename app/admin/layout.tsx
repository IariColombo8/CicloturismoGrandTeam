import AdminSidebar from "@/components/admin/AdminSidebar"
import Navbar from "@/components/layout/Navbar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <Navbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 pt-20">
          {children}
        </main>
      </div>
    </div>
  )
}
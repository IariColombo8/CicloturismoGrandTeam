"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase" // Updated import path from @/firebase.config to @/lib/firebase
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Lock, Mail, Bike } from "lucide-react"

export default function GrandTeamLoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        router.push("/grand-team/dashboard")
      }
    })
    return () => unsubscribe()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast({
        title: "Acceso concedido",
        description: "Bienvenido al panel Grand Team",
      })
      router.push("/grand-team/dashboard")
    } catch (error: any) {
      console.error("[v0] Login error:", error)
      toast({
        title: "Error de autenticación",
        description: "Email o contraseña incorrectos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-400/10 rounded-full flex items-center justify-center">
            <Bike className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            Panel <span className="gradient-text">Grand Team</span>
          </h1>
          <p className="text-gray-400">Gestión del evento y participantes</p>
        </div>

        {/* Login Card */}
        <Card className="bg-black/50 border-yellow-400/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Acceso Grand Team</CardTitle>
            <CardDescription className="text-gray-400">Ingresa tus credenciales de equipo</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="team@grandteambike.com"
                    className="bg-zinc-900 border-yellow-400/30 text-white pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-zinc-900 border-yellow-400/30 text-white pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:scale-105 transition-transform font-bold"
              >
                {isLoading ? "Verificando..." : "Acceder"}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
              <p className="text-sm text-gray-400">
                <strong className="text-yellow-400">Panel exclusivo</strong> para miembros del equipo organizador.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import { Component, type ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[v0] Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center p-4">
          <Card className="bg-black/50 border-red-500/30 backdrop-blur-sm max-w-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                Error de Conexión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400">Hubo un problema al conectar con Firebase. Por favor verifica:</p>
              <ul className="list-disc list-inside text-gray-400 text-sm space-y-2">
                <li>El dominio está autorizado en Firebase Console</li>
                <li>Las reglas de Firestore están configuradas correctamente</li>
                <li>La configuración de Firebase es válida</li>
              </ul>
              <Button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full bg-gradient-to-r from-yellow-400 to-amber-600 text-black"
              >
                Intentar de Nuevo
              </Button>
              {this.state.error && (
                <details className="text-xs text-gray-500">
                  <summary className="cursor-pointer">Detalles del error</summary>
                  <pre className="mt-2 p-2 bg-zinc-900 rounded overflow-auto">{this.state.error.toString()}</pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

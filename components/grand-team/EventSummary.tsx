import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MapPin, Clock, Info } from "lucide-react"

export default function EventSummary() {
  return (
    <Card className="bg-gradient-to-br from-zinc-900 to-black border-yellow-400/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-yellow-400" />
          Resumen del Evento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-yellow-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Fecha del Evento</p>
              <p className="text-white font-semibold">15 de Marzo, 2025</p>
              <p className="text-xs text-gray-500">Salida: 6:00 AM</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-yellow-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Punto de Salida</p>
              <p className="text-white font-semibold">Plaza Central</p>
              <p className="text-xs text-gray-500">300km recorrido total</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-yellow-400/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Duración Estimada</p>
              <p className="text-white font-semibold">12 horas</p>
              <p className="text-xs text-gray-500">Llegada: 6:00 PM aprox.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

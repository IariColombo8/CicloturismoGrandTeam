"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Search } from "lucide-react"

interface PersonalInfoStepProps {
  formData: any
  updateFormData: (data: any) => void
  onDNIBlur?: (dni: string) => void
  buscandoDNI?: boolean
}

export default function PersonalInfoStep({ formData, updateFormData, onDNIBlur, buscandoDNI }: PersonalInfoStepProps) {
  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-yellow-400">Información Personal</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-gray-300">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => updateFormData({ nombre: e.target.value })}
              placeholder="Juan Carlos"
              className="bg-zinc-900 border-yellow-400/30 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apellido" className="text-gray-300">
              Apellido <span className="text-red-500">*</span>
            </Label>
            <Input
              id="apellido"
              value={formData.apellido}
              onChange={(e) => updateFormData({ apellido: e.target.value })}
              placeholder="Pérez González"
              className="bg-zinc-900 border-yellow-400/30 text-white"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dni" className="text-gray-300">
              DNI/Cédula <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="dni"
                value={formData.dni}
                onChange={(e) => updateFormData({ dni: e.target.value })}
                onBlur={(e) => onDNIBlur?.(e.target.value)}
                placeholder="Ingresá tu DNI y se buscarán tus datos"
                className="bg-zinc-900 border-yellow-400/30 text-white pr-10"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {buscandoDNI ? (
                  <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">Al salir del campo, se buscarán tus datos automáticamente</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaNacimiento" className="text-gray-300">
              Fecha de Nacimiento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fechaNacimiento"
              type="date"
              value={formData.fechaNacimiento}
              onChange={(e) => updateFormData({ fechaNacimiento: e.target.value })}
              className="bg-zinc-900 border-yellow-400/30 text-white"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData({ email: e.target.value })}
              placeholder="ejemplo@gmail.com"
              className="bg-zinc-900 border-yellow-400/30 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono" className="text-gray-300">
              Teléfono <span className="text-red-500">*</span>
            </Label>
            <Input
              id="telefono"
              type="tel"
              value={formData.telefono}
              onChange={(e) => updateFormData({ telefono: e.target.value })}
              placeholder="+54 9 3442 123456"
              className="bg-zinc-900 border-yellow-400/30 text-white"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="paisTelefono" className="text-gray-300">
              País <span className="text-red-500">*</span>
            </Label>
            <Input
              id="paisTelefono"
              value={formData.paisTelefono}
              onChange={(e) => updateFormData({ paisTelefono: e.target.value })}
              placeholder="Argentina"
              className="bg-zinc-900 border-yellow-400/30 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="localidad" className="text-gray-300">
              Localidad <span className="text-red-500">*</span>
            </Label>
            <Input
              id="localidad"
              value={formData.localidad}
              onChange={(e) => updateFormData({ localidad: e.target.value })}
              placeholder="Concepción del Uruguay"
              className="bg-zinc-900 border-yellow-400/30 text-white"
              required
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4 pt-6 border-t border-yellow-400/20">
        <h3 className="text-lg font-semibold text-yellow-400">Contacto de Emergencia</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombreEmergencia" className="text-gray-300">
              Nombre Completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nombreEmergencia"
              value={formData.nombreEmergencia}
              onChange={(e) => updateFormData({ nombreEmergencia: e.target.value })}
              placeholder="María Pérez"
              className="bg-zinc-900 border-yellow-400/30 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefonoEmergencia" className="text-gray-300">
              Teléfono <span className="text-red-500">*</span>
            </Label>
            <Input
              id="telefonoEmergencia"
              type="tel"
              value={formData.telefonoEmergencia}
              onChange={(e) => updateFormData({ telefonoEmergencia: e.target.value })}
              placeholder="+54 9 3442 123456"
              className="bg-zinc-900 border-yellow-400/30 text-white"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="relacionEmergencia" className="text-gray-300">
            Relación (Madre, Padre, Esposo/a, etc.)
          </Label>
          <Input
            id="relacionEmergencia"
            value={formData.relacionEmergencia}
            onChange={(e) => updateFormData({ relacionEmergencia: e.target.value })}
            placeholder="Esposa"
            className="bg-zinc-900 border-yellow-400/30 text-white"
          />
        </div>
      </div>
    </div>
  )
}
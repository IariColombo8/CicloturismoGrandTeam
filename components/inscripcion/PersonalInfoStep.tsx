"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PersonalInfoStepProps {
  formData: any
  updateFormData: (data: any) => void
}

export default function PersonalInfoStep({ formData, updateFormData }: PersonalInfoStepProps) {
  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-yellow-400">Información Personal</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombres" className="text-gray-300">
              Nombres <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nombres"
              value={formData.nombres}
              onChange={(e) => updateFormData({ nombres: e.target.value })}
              placeholder="Juan Carlos"
              className="bg-zinc-900 border-yellow-400/30 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apellidos" className="text-gray-300">
              Apellidos <span className="text-red-500">*</span>
            </Label>
            <Input
              id="apellidos"
              value={formData.apellidos}
              onChange={(e) => updateFormData({ apellidos: e.target.value })}
              placeholder="Pérez González"
              className="bg-zinc-900 border-yellow-400/30 text-white"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cedula" className="text-gray-300">
              DNI/Cédula <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cedula"
              value={formData.cedula}
              onChange={(e) => updateFormData({ cedula: e.target.value })}
              placeholder="1234567890"
              className="bg-zinc-900 border-yellow-400/30 text-white"
              required
            />
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
            <Label htmlFor="pais" className="text-gray-300">
              País <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pais"
              value={formData.pais}
              onChange={(e) => updateFormData({ pais: e.target.value })}
              placeholder="Argentina"
              className="bg-zinc-900 border-yellow-400/30 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ciudad" className="text-gray-300">
              Ciudad <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ciudad"
              value={formData.ciudad}
              onChange={(e) => updateFormData({ ciudad: e.target.value })}
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
"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AlertCircle } from "lucide-react"

interface CategoryStepProps {
  formData: any
  updateFormData: (data: any) => void
}

export default function CategoryStep({ formData, updateFormData }: CategoryStepProps) {
  return (
    <div className="space-y-6">
      {/* Experience Question */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-yellow-400">Experiencia en Ciclismo</h3>

        <div className="space-y-3">
          <Label className="text-gray-300">
            ¿Ha recorrido 50 km antes? <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={formData.haRecorridoDistancia}
            onValueChange={(value) => updateFormData({ haRecorridoDistancia: value })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="distancia-si" className="border-yellow-400 text-yellow-400" />
              <Label htmlFor="distancia-si" className="text-white cursor-pointer">
                Sí
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="distancia-no" className="border-yellow-400 text-yellow-400" />
              <Label htmlFor="distancia-no" className="text-white cursor-pointer">
                No
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Warning message */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-300">
              <strong className="text-orange-400">Importante:</strong> Recorrido de 50 km es una distancia larga y
              cansadora para personas que no están acostumbradas. Se recomienda tener experiencia previa en recorridos
              similares.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tallaCamiseta" className="text-gray-300">
            Talla de Camiseta <span className="text-red-500">*</span>
          </Label>
          <Select value={formData.tallaCamiseta} onValueChange={(value) => updateFormData({ tallaCamiseta: value })}>
            <SelectTrigger className="bg-zinc-900 border-yellow-400/30 text-white">
              <SelectValue placeholder="Selecciona tu talla" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-yellow-400/30">
              <SelectItem value="xs">XS - Extra Small</SelectItem>
              <SelectItem value="s">S - Small</SelectItem>
              <SelectItem value="m">M - Medium</SelectItem>
              <SelectItem value="l">L - Large</SelectItem>
              <SelectItem value="xl">XL - Extra Large</SelectItem>
              <SelectItem value="xxl">XXL - Double Extra Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Medical Information */}
      <div className="space-y-4 pt-6 border-t border-yellow-400/20">
        <h3 className="text-lg font-semibold text-yellow-400">Información Médica</h3>

        <div className="space-y-2">
          <Label htmlFor="tipoSangre" className="text-gray-300">
            Tipo de Sangre <span className="text-red-500">*</span>
          </Label>
          <Select value={formData.tipoSangre} onValueChange={(value) => updateFormData({ tipoSangre: value })}>
            <SelectTrigger className="bg-zinc-900 border-yellow-400/30 text-white">
              <SelectValue placeholder="Selecciona tu tipo de sangre" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-yellow-400/30">
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A-">A-</SelectItem>
              <SelectItem value="B+">B+</SelectItem>
              <SelectItem value="B-">B-</SelectItem>
              <SelectItem value="AB+">AB+</SelectItem>
              <SelectItem value="AB-">AB-</SelectItem>
              <SelectItem value="O+">O+</SelectItem>
              <SelectItem value="O-">O-</SelectItem>
              <SelectItem value="Desconocido">Desconocido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alergias */}
        <div className="space-y-3">
          <Label className="text-gray-300">
            ¿Tiene alergias? <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={formData.tieneAlergias}
            onValueChange={(value) => {
              updateFormData({ tieneAlergias: value })
              if (value === "no") {
                updateFormData({ alergias: "" })
              }
            }}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="alergias-si" className="border-yellow-400 text-yellow-400" />
              <Label htmlFor="alergias-si" className="text-white cursor-pointer">
                Sí
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="alergias-no" className="border-yellow-400 text-yellow-400" />
              <Label htmlFor="alergias-no" className="text-white cursor-pointer">
                No
              </Label>
            </div>
          </RadioGroup>

          {formData.tieneAlergias === "si" && (
            <Textarea
              id="alergias"
              value={formData.alergias}
              onChange={(e) => updateFormData({ alergias: e.target.value })}
              placeholder="Describe tus alergias"
              className="bg-zinc-900 border-yellow-400/30 text-white min-h-[80px]"
              required
            />
          )}
        </div>

        {/* Problemas de salud */}
        <div className="space-y-3">
          <Label className="text-gray-300">
            ¿Tiene problemas de salud? <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={formData.tieneProblemasSalud}
            onValueChange={(value) => {
              updateFormData({ tieneProblemasSalud: value })
              if (value === "no") {
                updateFormData({ condicionesMedicas: "" })
              }
            }}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="salud-si" className="border-yellow-400 text-yellow-400" />
              <Label htmlFor="salud-si" className="text-white cursor-pointer">
                Sí
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="salud-no" className="border-yellow-400 text-yellow-400" />
              <Label htmlFor="salud-no" className="text-white cursor-pointer">
                No
              </Label>
            </div>
          </RadioGroup>

          {formData.tieneProblemasSalud === "si" && (
            <Textarea
              id="condicionesMedicas"
              value={formData.condicionesMedicas}
              onChange={(e) => updateFormData({ condicionesMedicas: e.target.value })}
              placeholder="Describe tus condiciones médicas (diabetes, asma, etc.)"
              className="bg-zinc-900 border-yellow-400/30 text-white min-h-[80px]"
              required
            />
          )}
        </div>

        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
          <p className="text-sm text-gray-300">
            <strong className="text-yellow-400">Nota:</strong> Esta información es confidencial y solo se utilizará en
            caso de emergencia médica durante el evento.
          </p>
        </div>
      </div>
    </div>
  )
}
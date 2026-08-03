"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AlertCircle } from "lucide-react"

interface CategoryStepProps {
  formData: any
  updateFormData: (data: any) => void
  gruposGuardados?: string[]
}

// Semilla local: grupos conocidos que sirven de fallback si la lista de la
// base de datos todavía está vacía o no cargó a tiempo.
const GRUPOS_SEMILLA = [
  "Grand Team Bike CdelU",
  "Kamikaze MTB",
  "Empujando Límites",
  "Xtralarge Team",
  "Chicas Trek",
]

const SIN_GRUPO = "Sin grupo"

export default function CategoryStep({ formData, updateFormData, gruposGuardados = [] }: CategoryStepProps) {
  const [grupoOpen, setGrupoOpen] = useState(false)

  const todosLosGrupos = [...new Set([...GRUPOS_SEMILLA, ...gruposGuardados])]
  const q = formData.grupoCiclistas.toLowerCase().trim()

  const opcionesFiltradas = q
    ? todosLosGrupos.filter((g) => g.toLowerCase().includes(q))
    : todosLosGrupos

  const mostrarSinGrupo = !q || SIN_GRUPO.toLowerCase().includes(q)

  const exactMatch = todosLosGrupos.some((g) => g.toLowerCase() === q) || q === SIN_GRUPO.toLowerCase()
  const sugerido =
    !exactMatch && q.length >= 3 ? todosLosGrupos.find((g) => g.toLowerCase().includes(q)) : null

  return (
    <div className="space-y-6">
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
              <Label htmlFor="distancia-si" className="text-white cursor-pointer">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="distancia-no" className="border-yellow-400 text-yellow-400" />
              <Label htmlFor="distancia-no" className="text-white cursor-pointer">No</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300">
            <strong className="text-orange-400">Importante:</strong> El recorrido de 50 km es exigente para personas
            que no están acostumbradas. Se recomienda experiencia previa en distancias similares.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="grupoCiclistas" className="text-gray-300">
            Grupo de ciclistas <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="grupoCiclistas"
              value={formData.grupoCiclistas}
              onChange={(e) => {
                updateFormData({ grupoCiclistas: e.target.value })
                setGrupoOpen(true)
              }}
              onFocus={() => setGrupoOpen(true)}
              onBlur={() => setTimeout(() => setGrupoOpen(false), 150)}
              placeholder="Escribí o seleccioná tu grupo"
              className="bg-zinc-900 border-yellow-400/30 text-white"
              autoComplete="off"
              required
            />
            {grupoOpen && (
              <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-yellow-400/30 rounded-md shadow-lg max-h-[220px] overflow-y-auto p-1">
                {sugerido && (
                  <div className="border-b border-zinc-700 mb-1 pb-1">
                    <p className="text-xs text-gray-500 px-2 pt-1">¿Quisiste decir?</p>
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1.5 text-sm font-medium text-yellow-400 hover:bg-yellow-400/10 rounded"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        updateFormData({ grupoCiclistas: sugerido })
                        setGrupoOpen(false)
                      }}
                    >
                      → {sugerido}
                    </button>
                  </div>
                )}
                {mostrarSinGrupo && (
                  <button
                    type="button"
                    className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-zinc-800 rounded"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      updateFormData({ grupoCiclistas: SIN_GRUPO })
                      setGrupoOpen(false)
                    }}
                  >
                    {SIN_GRUPO}
                  </button>
                )}
                {opcionesFiltradas.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-zinc-800 rounded"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      updateFormData({ grupoCiclistas: g })
                      setGrupoOpen(false)
                    }}
                  >
                    {g}
                  </button>
                ))}
                {q && opcionesFiltradas.length === 0 && !mostrarSinGrupo && (
                  <p className="text-xs text-gray-500 px-2 py-2">
                    No se encontraron grupos. Se guardará &quot;{formData.grupoCiclistas}&quot; al inscribirte.
                  </p>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Escribí el nombre de tu grupo o elegí uno de la lista. Si no existe, se guarda automáticamente. Si no pertenecés a ninguno, elegí “Sin grupo”.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-yellow-400/20">
        <h3 className="text-lg font-semibold text-yellow-400">Información Médica</h3>

        <div className="space-y-2">
          <Label htmlFor="grupoSanguineo" className="text-gray-300">
            Grupo Sanguíneo <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.grupoSanguineo}
            onValueChange={(value) => updateFormData({ grupoSanguineo: value.toUpperCase() })}
          >
            <SelectTrigger className="bg-zinc-900 border-yellow-400/30 text-white">
              <SelectValue placeholder="Seleccioná tu grupo sanguíneo" />
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
              <SelectItem value="DESCONOCIDO">Desconocido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-gray-300">
            ¿Es celíaco/a? <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={formData.esCeliaco}
            onValueChange={(value) => updateFormData({ esCeliaco: value })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="celiaco-si" className="border-yellow-400 text-yellow-400" />
              <Label htmlFor="celiaco-si" className="text-white cursor-pointer">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="celiaco-no" className="border-yellow-400 text-yellow-400" />
              <Label htmlFor="celiaco-no" className="text-white cursor-pointer">No</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-gray-300">
            ¿Tiene alergias? <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={formData.tieneAlergias}
            onValueChange={(value) =>
              updateFormData({ tieneAlergias: value, ...(value === "no" ? { alergias: "" } : {}) })
            }
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="alergias-si" className="border-yellow-400 text-yellow-400" />
              <Label htmlFor="alergias-si" className="text-white cursor-pointer">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="alergias-no" className="border-yellow-400 text-yellow-400" />
              <Label htmlFor="alergias-no" className="text-white cursor-pointer">No</Label>
            </div>
          </RadioGroup>

          {formData.tieneAlergias === "si" && (
            <Textarea
              id="alergias"
              value={formData.alergias}
              onChange={(e) => updateFormData({ alergias: e.target.value })}
              placeholder="Describí tus alergias"
              className="bg-zinc-900 border-yellow-400/30 text-white min-h-[80px]"
              required
            />
          )}
        </div>

        <div className="space-y-3">
          <Label className="text-gray-300">
            ¿Tiene problemas de salud? <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={formData.tieneProblemasSalud}
            onValueChange={(value) =>
              updateFormData({
                tieneProblemasSalud: value,
                ...(value === "no" ? { condicionSalud: "" } : {}),
              })
            }
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="si" id="salud-si" className="border-yellow-400 text-yellow-400" />
              <Label htmlFor="salud-si" className="text-white cursor-pointer">Sí</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="salud-no" className="border-yellow-400 text-yellow-400" />
              <Label htmlFor="salud-no" className="text-white cursor-pointer">No</Label>
            </div>
          </RadioGroup>

          {formData.tieneProblemasSalud === "si" && (
            <Textarea
              id="condicionSalud"
              value={formData.condicionSalud}
              onChange={(e) => updateFormData({ condicionSalud: e.target.value })}
              placeholder="Describí tus condiciones médicas, medicación o indicaciones importantes"
              className="bg-zinc-900 border-yellow-400/30 text-white min-h-[80px]"
              required
            />
          )}
        </div>

        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
          <p className="text-sm text-gray-300">
            <strong className="text-yellow-400">Nota:</strong> Esta información es confidencial y solo se utilizará
            ante una emergencia médica durante el evento.
          </p>
        </div>
      </div>
    </div>
  )
}

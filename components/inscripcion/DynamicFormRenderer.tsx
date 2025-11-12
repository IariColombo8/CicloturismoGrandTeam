"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { FormField } from "@/types/form-builder"
import { Upload, FileCheck } from "lucide-react"

interface DynamicFormRendererProps {
  fields: FormField[]
  formData: Record<string, any>
  updateFormData: (data: Record<string, any>) => void
}

export default function DynamicFormRenderer({ fields, formData, updateFormData }: DynamicFormRendererProps) {
  const [fileNames, setFileNames] = useState<Record<string, string>>({})

  const handleFileChange = (fieldId: string, file: File | null) => {
    if (file) {
      updateFormData({ [fieldId]: file })
      setFileNames((prev) => ({ ...prev, [fieldId]: file.name }))
    }
  }

  const renderField = (field: FormField) => {
    const fieldId = field.id
    const value = formData[fieldId] || ""

    switch (field.type) {
      case "text":
      case "email":
      case "number":
      case "date":
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId} className="text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type={field.type}
              value={value}
              onChange={(e) => updateFormData({ [fieldId]: e.target.value })}
              placeholder={field.placeholder || ""}
              className="bg-zinc-900 border-yellow-400/30 text-white"
              required={field.required}
            />
          </div>
        )

      case "textarea":
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId} className="text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={fieldId}
              value={value}
              onChange={(e) => updateFormData({ [fieldId]: e.target.value })}
              placeholder={field.placeholder || ""}
              className="bg-zinc-900 border-yellow-400/30 text-white min-h-[100px]"
              required={field.required}
            />
          </div>
        )

      case "select":
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId} className="text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select value={value} onValueChange={(val) => updateFormData({ [fieldId]: val })}>
              <SelectTrigger className="bg-zinc-900 border-yellow-400/30 text-white">
                <SelectValue placeholder={field.placeholder || "Selecciona una opción"} />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-yellow-400/30">
                {field.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case "radio":
        return (
          <div key={fieldId} className="space-y-2">
            <Label className="text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup value={value} onValueChange={(val) => updateFormData({ [fieldId]: val })}>
              {field.options.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option}
                    id={`${fieldId}-${option}`}
                    className="border-yellow-400/50 text-yellow-400"
                  />
                  <Label htmlFor={`${fieldId}-${option}`} className="text-gray-300 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case "checkbox":
        return (
          <div key={fieldId} className="space-y-2">
            <Label className="text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {field.options.map((option) => {
                const isChecked = Array.isArray(value) && value.includes(option)
                return (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${fieldId}-${option}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const currentValues = Array.isArray(value) ? value : []
                        const newValues = checked
                          ? [...currentValues, option]
                          : currentValues.filter((v: string) => v !== option)
                        updateFormData({ [fieldId]: newValues })
                      }}
                      className="border-yellow-400/50 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-black"
                    />
                    <Label htmlFor={`${fieldId}-${option}`} className="text-gray-300 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>
        )

      case "file":
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId} className="text-gray-300">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="relative">
              <input
                id={fieldId}
                type="file"
                onChange={(e) => handleFileChange(fieldId, e.target.files?.[0] || null)}
                className="hidden"
                accept="image/*,.pdf"
              />
              <label
                htmlFor={fieldId}
                className="flex items-center justify-center gap-3 p-4 bg-zinc-900 border-2 border-dashed border-yellow-400/30 rounded-lg cursor-pointer hover:border-yellow-400/50 hover:bg-zinc-800/50 transition-all"
              >
                {fileNames[fieldId] ? (
                  <>
                    <FileCheck className="w-5 h-5 text-green-500" />
                    <span className="text-white text-sm">{fileNames[fieldId]}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-400 text-sm">{field.placeholder || "Haz clic para subir archivo"}</span>
                  </>
                )}
              </label>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Sort fields by order
  const sortedFields = [...fields].sort((a, b) => a.order - b.order)

  return <div className="space-y-6">{sortedFields.map((field) => renderField(field))}</div>
}

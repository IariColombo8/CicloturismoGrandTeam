export type FieldType = "text" | "textarea" | "email" | "number" | "date" | "select" | "radio" | "checkbox" | "file"

export interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  required: boolean
  options: string[]
  order: number
}

export interface FormConfig {
  year: number
  title: string
  description: string
  fields: FormField[]
  active: boolean
  updatedAt: any
}

export interface FormData {
  [key: string]: any
}

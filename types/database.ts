export interface Database {
  public: {
    Tables: {
      administradores: {
        Row: {
          id: string
          auth_user_id: string | null
          email: string
          display_name: string | null
          photo_url: string | null
          role: "admin" | "grandteam" | "usuario"
          login_method: "google" | "email" | null
          created_at: string
          last_login: string
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          email: string
          display_name?: string | null
          photo_url?: string | null
          role?: "admin" | "grandteam" | "usuario"
          login_method?: "google" | "email" | null
          created_at?: string
          last_login?: string
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          email?: string
          display_name?: string | null
          photo_url?: string | null
          role?: "admin" | "grandteam" | "usuario"
          login_method?: "google" | "email" | null
          created_at?: string
          last_login?: string
        }
      }
      inscripciones: {
        Row: {
          id: string
          numero_inscripcion: number
          nombres: string
          apellidos: string
          cedula: string
          email: string
          telefono: string
          fecha_nacimiento: string | null
          pais: string | null
          ciudad: string | null
          nombre_emergencia: string | null
          telefono_emergencia: string | null
          relacion_emergencia: string | null
          ha_recorrido_distancia: string | null
          talla_camiseta: string | null
          tipo_sangre: string | null
          tiene_alergias: string | null
          alergias: string | null
          tiene_problemas_salud: string | null
          condiciones_medicas: string | null
          metodo_pago: string
          numero_referencia: string | null
          comprobante_base64: string | null
          estado: "pendiente" | "confirmada" | "rechazada"
          aprobado_por_admin: boolean
          nota_estado: string | null
          fecha_inscripcion: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          numero_inscripcion: number
          nombres: string
          apellidos: string
          cedula: string
          email: string
          telefono: string
          fecha_nacimiento?: string | null
          pais?: string | null
          ciudad?: string | null
          nombre_emergencia?: string | null
          telefono_emergencia?: string | null
          relacion_emergencia?: string | null
          ha_recorrido_distancia?: string | null
          talla_camiseta?: string | null
          tipo_sangre?: string | null
          tiene_alergias?: string | null
          alergias?: string | null
          tiene_problemas_salud?: string | null
          condiciones_medicas?: string | null
          metodo_pago?: string
          numero_referencia?: string | null
          comprobante_base64?: string | null
          estado?: "pendiente" | "confirmada" | "rechazada"
          aprobado_por_admin?: boolean
          nota_estado?: string | null
          fecha_inscripcion?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          numero_inscripcion?: number
          nombres?: string
          apellidos?: string
          cedula?: string
          email?: string
          telefono?: string
          fecha_nacimiento?: string | null
          pais?: string | null
          ciudad?: string | null
          nombre_emergencia?: string | null
          telefono_emergencia?: string | null
          relacion_emergencia?: string | null
          ha_recorrido_distancia?: string | null
          talla_camiseta?: string | null
          tipo_sangre?: string | null
          tiene_alergias?: string | null
          alergias?: string | null
          tiene_problemas_salud?: string | null
          condiciones_medicas?: string | null
          metodo_pago?: string
          numero_referencia?: string | null
          comprobante_base64?: string | null
          estado?: "pendiente" | "confirmada" | "rechazada"
          aprobado_por_admin?: boolean
          nota_estado?: string | null
          fecha_inscripcion?: string
          created_at?: string
          updated_at?: string
        }
      }
      participantes: {
        Row: {
          id: string
          nombre: string
          apellido: string
          dni: string
          email: string | null
          telefono: string | null
          categoria: string | null
          provincia: string | null
          numero_inscripcion: number | null
          estado: "pendiente" | "confirmada" | "rechazada" | "aprobado"
          precio: string | null
          fecha_inscripcion: string
          checked_in: boolean
          checked_in_at: string | null
          checked_in_by: string | null
          token_qr: string | null
          grupo_sanguineo: string | null
          talla_camiseta: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          apellido: string
          dni: string
          email?: string | null
          telefono?: string | null
          categoria?: string | null
          provincia?: string | null
          numero_inscripcion?: number | null
          estado?: "pendiente" | "confirmada" | "rechazada" | "aprobado"
          precio?: string | null
          fecha_inscripcion?: string
          checked_in?: boolean
          checked_in_at?: string | null
          checked_in_by?: string | null
          token_qr?: string | null
          grupo_sanguineo?: string | null
          talla_camiseta?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          apellido?: string
          dni?: string
          email?: string | null
          telefono?: string | null
          categoria?: string | null
          provincia?: string | null
          numero_inscripcion?: number | null
          estado?: "pendiente" | "confirmada" | "rechazada" | "aprobado"
          precio?: string | null
          fecha_inscripcion?: string
          checked_in?: boolean
          checked_in_at?: string | null
          checked_in_by?: string | null
          token_qr?: string | null
          grupo_sanguineo?: string | null
          talla_camiseta?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      eventos: {
        Row: {
          id: string
          nombre: string | null
          fecha: string | null
          ubicacion: string | null
          recorrido: string | null
          cupo_maximo: number
          costo_inscripcion: number
          alias_transferencia: string | null
          datos_transferencia: string | null
          hora_largada: string | null
          punto_encuentro: string | null
          incluye: string[]
          redes_sociales: Record<string, string>
          telefono_contacto: string | null
          email_contacto: string | null
          inscripciones_abiertas: boolean
          categoria: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nombre?: string | null
          fecha?: string | null
          ubicacion?: string | null
          recorrido?: string | null
          cupo_maximo?: number
          costo_inscripcion?: number
          alias_transferencia?: string | null
          datos_transferencia?: string | null
          hora_largada?: string | null
          punto_encuentro?: string | null
          incluye?: string[]
          redes_sociales?: Record<string, string>
          telefono_contacto?: string | null
          email_contacto?: string | null
          inscripciones_abiertas?: boolean
          categoria?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string | null
          fecha?: string | null
          ubicacion?: string | null
          recorrido?: string | null
          cupo_maximo?: number
          costo_inscripcion?: number
          alias_transferencia?: string | null
          datos_transferencia?: string | null
          hora_largada?: string | null
          punto_encuentro?: string | null
          incluye?: string[]
          redes_sociales?: Record<string, string>
          telefono_contacto?: string | null
          email_contacto?: string | null
          inscripciones_abiertas?: boolean
          categoria?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      gastos: {
        Row: {
          id: string
          descripcion: string
          monto: number
          categoria: "equipamiento" | "premios" | "logistica" | "marketing" | "alimentacion" | "otro"
          estado: "pendiente" | "aprobado" | "rechazado"
          fecha: string
          comprobante: string | null
          creado_por: string
          rol_creador: string | null
          aprobado_por: string | null
          fecha_aprobacion: string | null
          motivo_rechazo: string | null
          evento_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          descripcion: string
          monto: number
          categoria: "equipamiento" | "premios" | "logistica" | "marketing" | "alimentacion" | "otro"
          estado?: "pendiente" | "aprobado" | "rechazado"
          fecha?: string
          comprobante?: string | null
          creado_por: string
          rol_creador?: string | null
          aprobado_por?: string | null
          fecha_aprobacion?: string | null
          motivo_rechazo?: string | null
          evento_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          descripcion?: string
          monto?: number
          categoria?: "equipamiento" | "premios" | "logistica" | "marketing" | "alimentacion" | "otro"
          estado?: "pendiente" | "aprobado" | "rechazado"
          fecha?: string
          comprobante?: string | null
          creado_por?: string
          rol_creador?: string | null
          aprobado_por?: string | null
          fecha_aprobacion?: string | null
          motivo_rechazo?: string | null
          evento_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      counters: {
        Row: {
          id: string
          count: number
        }
        Insert: {
          id: string
          count?: number
        }
        Update: {
          id?: string
          count?: number
        }
      }
      event_settings: {
        Row: {
          id: string
          cupo_maximo: number
          precio: number
          costo_inscripcion: number | null
          metodo_pago: string
          inscripciones_abiertas: boolean
          current_year: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cupo_maximo?: number
          precio?: number
          costo_inscripcion?: number | null
          metodo_pago?: string
          inscripciones_abiertas?: boolean
          current_year?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cupo_maximo?: number
          precio?: number
          costo_inscripcion?: number | null
          metodo_pago?: string
          inscripciones_abiertas?: boolean
          current_year?: number
          created_at?: string
          updated_at?: string
        }
      }
      remera: {
        Row: {
          id: string
          dni: string
          nombre: string
          telefono: string | null
          items: RemeraItem[]
          tiene_comprobante: boolean
          comprobante_url: string | null
          esta_registrado: boolean
          envio_tipo: "retiro" | "envio"
          direccion: string | null
          estado: "pendiente" | "entregado"
          alias_pago: string | null
          fecha_solicitud: string
          updated_at: string
        }
        Insert: {
          id?: string
          dni: string
          nombre: string
          telefono?: string | null
          items?: RemeraItem[]
          tiene_comprobante?: boolean
          comprobante_url?: string | null
          esta_registrado?: boolean
          envio_tipo?: "retiro" | "envio"
          direccion?: string | null
          estado?: "pendiente" | "entregado"
          alias_pago?: string | null
          fecha_solicitud?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dni?: string
          nombre?: string
          telefono?: string | null
          items?: RemeraItem[]
          tiene_comprobante?: boolean
          comprobante_url?: string | null
          esta_registrado?: boolean
          envio_tipo?: "retiro" | "envio"
          direccion?: string | null
          estado?: "pendiente" | "entregado"
          alias_pago?: string | null
          fecha_solicitud?: string
          updated_at?: string
        }
      }
      content_settings: {
        Row: {
          id: string
          data: Record<string, unknown>
          updated_at: string
        }
        Insert: {
          id: string
          data?: Record<string, unknown>
          updated_at?: string
        }
        Update: {
          id?: string
          data?: Record<string, unknown>
          updated_at?: string
        }
      }
    }
    Functions: {
      next_inscription_number: {
        Args: { p_year?: string }
        Returns: number
      }
    }
  }
}

// Sub-tipos
export interface RemeraItem {
  talle: string
  cantidad: number
}

export const TALLES_DISPONIBLES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] as const
export type Talle = typeof TALLES_DISPONIBLES[number]

// Tipos de conveniencia
export type Administrador = Database["public"]["Tables"]["administradores"]["Row"]
export type Inscripcion = Database["public"]["Tables"]["inscripciones"]["Row"]
export type Participante = Database["public"]["Tables"]["participantes"]["Row"]
export type Evento = Database["public"]["Tables"]["eventos"]["Row"]
export type Gasto = Database["public"]["Tables"]["gastos"]["Row"]
export type Counter = Database["public"]["Tables"]["counters"]["Row"]
export type EventSettings = Database["public"]["Tables"]["event_settings"]["Row"]
export type Remera = Database["public"]["Tables"]["remera"]["Row"]
export type ContentSettings = Database["public"]["Tables"]["content_settings"]["Row"]

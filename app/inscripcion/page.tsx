"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { compressAndConvertToBase64 } from "@/lib/imageUtils"
import { emailService } from "@/lib/emailService"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react"
import PersonalInfoStep from "@/components/inscripcion/PersonalInfoStep"
import CategoryStep from "@/components/inscripcion/CategoryStep"
import PaymentStep from "@/components/inscripcion/PaymentStep"
import ReviewStep from "@/components/inscripcion/ReviewStep"
import Navbar from "@/components/layout/Navbar"

// ──────────────────────────────────────────────────────────────
// Persistencia del draft en localStorage
// El File del comprobante NO se serializa (no es JSON-friendly).
// ──────────────────────────────────────────────────────────────
const DRAFT_KEY = "inscripcion-draft-v1"
const DRAFT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14 // 14 días

const defaultFormData = {
  // Personal Info
  nombres: "",
  apellidos: "",
  cedula: "",
  email: "",
  telefono: "",
  fechaNacimiento: "",
  pais: "",
  ciudad: "",

  // Emergency Contact
  nombreEmergencia: "",
  telefonoEmergencia: "",
  relacionEmergencia: "",

  // Category
  haRecorridoDistancia: "",
  tallaCamiseta: "",
  tipoSangre: "",
  tieneAlergias: "",
  alergias: "",
  tieneProblemasSalud: "",
  condicionesMedicas: "",

  // Payment
  metodoPago: "transferencia",
  numeroReferencia: "",
  comprobanteFile: null as File | null,
}

function loadDraft(): { data: typeof defaultFormData; step: number; savedAt: number } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Expirar drafts viejos para que no aparezcan "borradores zombi".
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS) {
      localStorage.removeItem(DRAFT_KEY)
      return null
    }
    return {
      data: { ...defaultFormData, ...(parsed.data || {}), comprobanteFile: null },
      step: parsed.step || 1,
      savedAt: parsed.savedAt,
    }
  } catch {
    return null
  }
}

export default function InscripcionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Detectamos si hay un draft persistido y mostramos banner.
  const [hasDraft, setHasDraft] = useState<{ savedAt: number; step: number } | null>(null)
  const draftLoadedRef = useRef(false)
  const [eventConfig, setEventConfig] = useState({
    costoInscripcion: 0,
    aliasTransferencia: "",
    datosTransferencia: ""
  })
  
  const [formData, setFormData] = useState(defaultFormData)

  // Cargar draft del localStorage en el primer mount.
  useEffect(() => {
    if (draftLoadedRef.current) return
    draftLoadedRef.current = true
    const draft = loadDraft()
    if (draft) {
      // No restauramos automáticamente: mostramos un banner y dejamos
      // que el usuario decida (mejor UX que sobreescribir silenciosamente).
      setHasDraft({ savedAt: draft.savedAt, step: draft.step })
    }
  }, [])

  // Guardar draft cada vez que cambian los datos. Excluimos el File
  // del comprobante (no es serializable a JSON).
  useEffect(() => {
    if (typeof window === "undefined") return
    // Solo guardamos si hay algo cargado, para no crear drafts vacíos.
    const { comprobanteFile, ...serializable } = formData
    const hasContent = Object.values(serializable).some(
      (v) => typeof v === "string" && v.length > 0 && v !== "transferencia"
    )
    if (!hasContent) return
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          data: serializable,
          step: currentStep,
          savedAt: Date.now(),
        })
      )
    } catch {
      // Silenciar quota errors
    }
  }, [formData, currentStep])

  const restoreDraft = () => {
    const draft = loadDraft()
    if (draft) {
      setFormData(draft.data)
      setCurrentStep(draft.step)
      toast({
        title: "Borrador restaurado",
        description: "Continuamos donde lo dejaste. Revisá los datos antes de enviar.",
      })
    }
    setHasDraft(null)
  }

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {}
    setHasDraft(null)
  }

  useEffect(() => {
    const loadEventConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("eventos")
          .select("*")
          .eq("id", "2026")
          .maybeSingle()

        if (!error && data) {
          setEventConfig({
            costoInscripcion: data.costo_inscripcion || 0,
            aliasTransferencia: data.alias_transferencia || "",
            datosTransferencia: data.datos_transferencia || ""
          })
        }
      } catch (error) {
        console.error("Error loading event config:", error)
      }
    }
    
    loadEventConfig()
  }, [])

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  const steps = [
    { number: 1, title: "Información Personal", icon: "👤" },
    { number: 2, title: "Información Adicional", icon: "🚴" },
    { number: 3, title: "Pago", icon: "💳" },
    { number: 4, title: "Revisión", icon: "✓" },
  ]

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.nombres &&
          formData.apellidos &&
          formData.cedula &&
          formData.email &&
          formData.telefono &&
          formData.fechaNacimiento &&
          formData.pais &&
          formData.ciudad &&
          formData.nombreEmergencia &&
          formData.telefonoEmergencia
        )
      case 2:
        const alergiasValid = formData.tieneAlergias === "no" || 
                             (formData.tieneAlergias === "si" && formData.alergias)
        const saludValid = formData.tieneProblemasSalud === "no" || 
                          (formData.tieneProblemasSalud === "si" && formData.condicionesMedicas)
        
        return !!(
          formData.haRecorridoDistancia &&
          formData.tallaCamiseta &&
          formData.tipoSangre &&
          formData.tieneAlergias &&
          alergiasValid &&
          formData.tieneProblemasSalud &&
          saludValid
        )
      case 3:
        return !!(formData.numeroReferencia && formData.comprobanteFile)
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast({
        title: "Campos incompletos",
        description: "Por favor completa todos los campos obligatorios.",
        variant: "destructive",
      })
      return
    }
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const getNextInscriptionNumber = async () => {
    try {
      const { data, error } = await supabase.rpc("next_inscription_number", { p_year: "2026" })
      if (error) throw error
      return data as number
    } catch (error) {
      console.error("Error getting inscription number:", error)
      throw error
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      let comprobanteBase64 = ""

      if (formData.comprobanteFile) {
        toast({
          title: "Procesando imagen...",
          description: "Comprimiendo el comprobante de pago.",
        })
        comprobanteBase64 = await compressAndConvertToBase64(formData.comprobanteFile, 500)
      }

      const inscriptionNumber = await getNextInscriptionNumber()
      const paddedNumber = String(inscriptionNumber).padStart(3, "0")
      const customDocId = `Inscripciones_2026 - ${paddedNumber}-${formData.nombres} ${formData.apellidos}`

      const inscripcionData = {
        id: customDocId,
        numero_inscripcion: inscriptionNumber,
        // Personal info
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        cedula: formData.cedula,
        email: formData.email,
        telefono: formData.telefono,
        fecha_nacimiento: formData.fechaNacimiento,
        pais: formData.pais,
        ciudad: formData.ciudad,

        // Emergency contact
        nombre_emergencia: formData.nombreEmergencia,
        telefono_emergencia: formData.telefonoEmergencia,
        relacion_emergencia: formData.relacionEmergencia || "",

        // Additional info
        ha_recorrido_distancia: formData.haRecorridoDistancia,
        talla_camiseta: formData.tallaCamiseta,
        tipo_sangre: formData.tipoSangre,
        tiene_alergias: formData.tieneAlergias,
        alergias: formData.tieneAlergias === "si" ? formData.alergias : "",
        tiene_problemas_salud: formData.tieneProblemasSalud,
        condiciones_medicas: formData.tieneProblemasSalud === "si" ? formData.condicionesMedicas : "",

        // Payment
        metodo_pago: "transferencia",
        numero_referencia: formData.numeroReferencia,
        comprobante_base64: comprobanteBase64,

        // Metadata
        estado: "pendiente" as const,
        fecha_inscripcion: new Date().toISOString(),
        aprobado_por_admin: false,
      }

      const { error } = await supabase.from("inscripciones").insert(inscripcionData)
      if (error) throw error

      // Crear registro en participantes con token QR para check-in
      const tokenQR = crypto.randomUUID()
      const { error: partError } = await supabase.from("participantes").insert({
        nombre: formData.nombres,
        apellido: formData.apellidos,
        dni: formData.cedula,
        email: formData.email,
        telefono: formData.telefono,
        categoria: formData.tallaCamiseta,
        provincia: formData.ciudad,
        numero_inscripcion: inscriptionNumber,
        estado: "pendiente",
        talla_camiseta: formData.tallaCamiseta,
        grupo_sanguineo: formData.tipoSangre,
        token_qr: tokenQR,
      })

      if (partError) {
        console.error("Error creando participante:", partError)
      }

      // Enviar email de confirmacion con QR
      try {
        await emailService.sendConfirmationEmail({
          email: formData.email,
          nombreCompleto: `${formData.nombres} ${formData.apellidos}`,
          numeroInscripcion: String(inscriptionNumber),
          talleRemera: formData.tallaCamiseta,
          tokenQR: tokenQR,
          ubicacion: "Concepcion del Uruguay, Entre Rios",
        })
      } catch (emailError) {
        console.error("Error enviando email:", emailError)
      }

      // Limpiar draft para no ofrecer restaurarlo en el siguiente intento.
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {}

      toast({
        title: "¡Inscripción exitosa!",
        description: "Tu solicitud ha sido enviada. Recibirás un correo con tu código QR.",
      })

      router.push("/inscripcion/exito")
    } catch (error) {
      console.error("Error submitting inscription:", error)
      toast({
        title: "Error",
        description: "Hubo un problema al enviar tu inscripción. Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <Navbar />

      <div className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Banner de draft existente */}
          {hasDraft && (
            <div className="mb-6 bg-gradient-to-r from-yellow-400/10 to-amber-600/10 border border-yellow-400/30 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-yellow-400 font-semibold text-sm sm:text-base flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  Encontramos una inscripción a medio completar
                </p>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">
                  Quedaste en el paso {hasDraft.step}/4 ·{" "}
                  {new Date(hasDraft.savedAt).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={discardDraft}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white border border-zinc-700 hover:bg-zinc-800 transition-colors"
                >
                  Empezar de cero
                </button>
                <button
                  type="button"
                  onClick={restoreDraft}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:brightness-110 transition-all"
                >
                  Retomar
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              Formulario de <span className="gradient-text">Inscripción</span>
            </h1>
            <p className="text-gray-400 text-lg">Completa los siguientes pasos para asegurar tu lugar en el evento</p>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <Progress value={progress} className="h-2 mb-6" />
            <div className="grid grid-cols-4 gap-2">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className={`text-center transition-all ${currentStep >= step.number ? "opacity-100" : "opacity-40"}`}
                >
                  <div
                    className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center text-xl font-bold transition-all ${
                      currentStep > step.number
                        ? "bg-green-500 text-white"
                        : currentStep === step.number
                          ? "bg-gradient-to-r from-yellow-400 to-amber-600 text-black"
                          : "bg-zinc-800 text-gray-500"
                    }`}
                  >
                    {currentStep > step.number ? <CheckCircle2 className="w-6 h-6" /> : step.number}
                  </div>
                  <p className="text-xs text-gray-400 hidden sm:block">{step.title}</p>
                </div>
              ))}
            </div>
            {/* Título del paso actual en móvil (los otros se ocultan arriba) */}
            <p className="sm:hidden text-center text-sm text-yellow-400 font-semibold mt-3">
              Paso {currentStep}/4 · {steps[currentStep - 1].title}
            </p>
          </div>

          {/* Form Card */}
          <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-2xl">{steps[currentStep - 1].title}</CardTitle>
              <CardDescription className="text-gray-400">
                {currentStep === 1 && "Proporciona tu información personal y de contacto de emergencia"}
                {currentStep === 2 && "Información adicional sobre experiencia y salud"}
                {currentStep === 3 && "Completa el pago y sube tu comprobante"}
                {currentStep === 4 && "Revisa toda tu información antes de enviar"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Step Content */}
              {currentStep === 1 && <PersonalInfoStep formData={formData} updateFormData={updateFormData} />}
              {currentStep === 2 && <CategoryStep formData={formData} updateFormData={updateFormData} />}
              {currentStep === 3 && <PaymentStep formData={formData} updateFormData={updateFormData} eventConfig={eventConfig} />}
              {currentStep === 4 && <ReviewStep formData={formData} eventConfig={eventConfig} />}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-yellow-400/20">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400 hover:text-black bg-transparent"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>

                {currentStep < totalSteps ? (
                  <Button
                    onClick={handleNext}
                    className="bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:scale-105 transition-transform"
                  >
                    Siguiente
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:scale-105 transition-transform"
                  >
                    {isSubmitting ? "Enviando..." : "Enviar Inscripción"}
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
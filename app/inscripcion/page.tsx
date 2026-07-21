"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { compressAndConvertToBase64 } from "@/lib/imageUtils"
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
  nombre: "",
  apellido: "",
  dni: "",
  email: "",
  telefono: "",
  fechaNacimiento: "",
  paisTelefono: "",
  localidad: "",

  // Emergency Contact
  nombreEmergencia: "",
  telefonoEmergencia: "",
  relacionEmergencia: "",

  // Category
  haRecorridoDistancia: "",
  talleRemera: "",
  grupoSanguineo: "",
  tieneAlergias: "",
  alergias: "",
  tieneProblemasSalud: "",
  condicionSalud: "",

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
  const [buscandoDNI, setBuscandoDNI] = useState(false)
  const ultimoDniBuscadoRef = useRef<string>("")

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

  // Autocompletado por DNI: al salir del campo, busca una inscripción previa
  // con ese DNI y precarga los datos personales para que el usuario solo
  // tenga que revisar/actualizar lo que cambió.
  const lookupDni = async (dniRaw: string) => {
    const dni = dniRaw.trim()
    if (!/^\d{7,8}$/.test(dni) || dni === ultimoDniBuscadoRef.current) return
    ultimoDniBuscadoRef.current = dni

    setBuscandoDNI(true)
    try {
      const res = await fetch(`/api/lookup-participant?dni=${encodeURIComponent(dni)}`)
      if (!res.ok) return
      const result = await res.json()
      if (result.found && result.data) {
        setFormData((prev) => ({ ...prev, ...result.data, dni: prev.dni }))
        toast({
          title: result.isEdicion ? "Ya estás inscripto este año" : "Datos encontrados",
          description: result.isEdicion
            ? "Cargamos tus datos para que los edites. Revisá que esté todo correcto."
            : "Precargamos tu información de una inscripción anterior. Revisá que esté todo correcto.",
        })
      }
    } catch (error) {
      console.error("Error buscando DNI:", error)
    } finally {
      setBuscandoDNI(false)
    }
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
          formData.nombre &&
          formData.apellido &&
          formData.dni &&
          formData.email &&
          formData.telefono &&
          formData.fechaNacimiento &&
          formData.paisTelefono &&
          formData.localidad &&
          formData.nombreEmergencia &&
          formData.telefonoEmergencia
        )
      case 2:
        const alergiasValid = formData.tieneAlergias === "no" ||
                             (formData.tieneAlergias === "si" && formData.alergias)
        const saludValid = formData.tieneProblemasSalud === "no" ||
                          (formData.tieneProblemasSalud === "si" && formData.condicionSalud)

        return !!(
          formData.haRecorridoDistancia &&
          formData.talleRemera &&
          formData.grupoSanguineo &&
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

      const { comprobanteFile, metodoPago, ...datosInscripcion } = formData

      const res = await fetch("/api/inscripcion/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...datosInscripcion, comprobanteBase64 }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "No se pudo guardar la inscripción")
      }

      await res.json()

      // El email de confirmación con QR se envía cuando el admin aprueba
      // la inscripción (cambia el estado a "Confirmada"), no acá.

      // Limpiar draft para no ofrecer restaurarlo en el siguiente intento.
      try {
        localStorage.removeItem(DRAFT_KEY)
      } catch {}

      toast({
        title: "¡Inscripción exitosa!",
        description: "Tu solicitud ha sido enviada. Te avisaremos por correo cuando esté confirmada.",
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
            <h1 className="font-heading text-h2 text-white mb-4">
              Formulario de <span className="gradient-text">Inscripción</span>
            </h1>
            <p className="text-gray-300 text-body-fluid">Completa los siguientes pasos para asegurar tu lugar en el evento</p>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <Progress value={progress} className="h-2 mb-6" />
            <div className="grid grid-cols-4 gap-2">
              {steps.map((step) => {
                // Solo los pasos ya completados son clickeables (volver atrás
                // sin perder datos). No se permite saltar hacia adelante sin
                // pasar la validación de cada paso.
                const isCompleted = currentStep > step.number
                const isCurrent = currentStep === step.number
                return (
                  <button
                    type="button"
                    key={step.number}
                    onClick={() => isCompleted && setCurrentStep(step.number)}
                    disabled={!isCompleted}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Paso ${step.number}: ${step.title}${isCompleted ? " (completado, volver)" : ""}`}
                    className={`text-center transition-all ${currentStep >= step.number ? "opacity-100" : "opacity-40"} ${
                      isCompleted ? "cursor-pointer hover:opacity-80" : "cursor-default"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center text-xl font-bold transition-all ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isCurrent
                            ? "bg-gradient-to-r from-yellow-400 to-amber-600 text-black"
                            : "bg-zinc-800 text-gray-500"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : step.number}
                    </div>
                    <p className="text-xs text-gray-400 hidden sm:block">{step.title}</p>
                  </button>
                )
              })}
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
              {currentStep === 1 && (
                <PersonalInfoStep
                  formData={formData}
                  updateFormData={updateFormData}
                  onDNIBlur={lookupDni}
                  buscandoDNI={buscandoDNI}
                />
              )}
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
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { prepararComprobante, type ComprobantePreparado } from "@/lib/inscripcion/comprobante"
import { enviarInscripcion, guardarInscripcionPendiente, vigilarPendientes } from "@/lib/inscripcion/envio"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react"
import PersonalInfoStep from "@/components/inscripcion/PersonalInfoStep"
import CategoryStep from "@/components/inscripcion/CategoryStep"
import PaymentStep from "@/components/inscripcion/PaymentStep"
import ReviewStep from "@/components/inscripcion/ReviewStep"
import MedallasBanner from "@/components/inscripcion/MedallasBanner"
import Navbar from "@/components/layout/Navbar"
import { DATOS_TRANSFERENCIA_VACIOS, datosDesdeEvento } from "@/lib/transferencia"

// ──────────────────────────────────────────────────────────────
// Persistencia del draft en localStorage
// El File del comprobante NO se serializa (no es JSON-friendly).
// ──────────────────────────────────────────────────────────────
const DRAFT_KEY = "inscripcion-draft-v2"
const LEGACY_DRAFT_KEY = "inscripcion-draft-v1"
const DRAFT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14 // 14 días

const defaultFormData = {
  // Personal Info
  nombre: "",
  apellido: "",
  dni: "",
  email: "",
  telefono: "",
  fechaNacimiento: "",
  pais: "Argentina",
  localidad: "",

  // Emergency Contact
  nombreEmergencia: "",
  telefonoEmergencia: "",
  relacionEmergencia: "",

  // Category
  haRecorridoDistancia: "",
  grupoCiclistas: "",
  grupoSanguineo: "",
  esCeliaco: "",
  tieneAlergias: "",
  alergias: "",
  tieneProblemasSalud: "",
  condicionSalud: "",

  // Payment
  metodoPago: "transferencia",
  numeroReferencia: "",
  comprobanteFile: null as File | null,
}

function hasMeaningfulDraftData(data: Record<string, unknown>): boolean {
  return Object.entries(data).some(([key, value]) => {
    const defaultValue = defaultFormData[key as keyof typeof defaultFormData]
    return typeof value === "string" && value.trim() !== "" && value !== defaultValue
  })
}

function loadDraft(): { data: typeof defaultFormData; step: number; savedAt: number } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY) || localStorage.getItem(LEGACY_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Expirar drafts viejos para que no aparezcan "borradores zombi".
    if (
      !parsed?.savedAt ||
      Date.now() - parsed.savedAt > DRAFT_MAX_AGE_MS ||
      !parsed.data ||
      !hasMeaningfulDraftData(parsed.data)
    ) {
      localStorage.removeItem(DRAFT_KEY)
      localStorage.removeItem(LEGACY_DRAFT_KEY)
      return null
    }
    return {
      data: {
        ...defaultFormData,
        ...(parsed.data || {}),
        // Compatibilidad defensiva con un borrador anterior.
        pais: parsed.data?.pais || parsed.data?.paisTelefono || defaultFormData.pais,
        comprobanteFile: null,
      },
      step: Math.min(Math.max(Number(parsed.step) || 1, 1), 4),
      savedAt: parsed.savedAt,
    }
  } catch {
    return null
  }
}

export default function InscripcionPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Detectamos si hay un draft persistido y mostramos banner.
  const [hasDraft, setHasDraft] = useState<{ savedAt: number; step: number } | null>(null)
  const draftLoadedRef = useRef(false)
  // Evita que el formulario vacío sobrescriba el borrador antes de que
  // la persona elija Retomar o Empezar de cero.
  const canPersistDraftRef = useRef(false)
  const [eventConfig, setEventConfig] = useState({
    costoInscripcion: 0,
    aliasTransferencia: "",
    datosTransferencia: "",
    transferencia: DATOS_TRANSFERENCIA_VACIOS
  })
  
  const [formData, setFormData] = useState(defaultFormData)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [buscandoDNI, setBuscandoDNI] = useState(false)
  const ultimoDniBuscadoRef = useRef<string>("")
  const [gruposGuardados, setGruposGuardados] = useState<string[]>([])

  // El comprobante se comprime apenas se elige, mientras la persona sigue
  // llenando el formulario. Así el envío no espera nada y una foto de 20 MB
  // no bloquea nada.
  const [estadoComprobante, setEstadoComprobante] = useState<"vacio" | "preparando" | "listo" | "aviso">("vacio")
  const [avisoComprobante, setAvisoComprobante] = useState("")
  const comprobanteRef = useRef<Promise<ComprobantePreparado> | null>(null)

  // La inscripción quedó guardada en el teléfono porque no había conexión.
  // No se puede navegar a la pantalla de éxito (sin internet el navegador
  // mostraría su propio error), así que se confirma acá mismo.
  const [guardadaSinEnviar, setGuardadaSinEnviar] = useState(false)
  const [yaSeEnvio, setYaSeEnvio] = useState(false)

  const elegirComprobante = (file: File | null) => {
    if (!file) {
      comprobanteRef.current = null
      setEstadoComprobante("vacio")
      setAvisoComprobante("")
      return
    }

    setEstadoComprobante("preparando")
    setAvisoComprobante("")

    const tarea = prepararComprobante(file)
    comprobanteRef.current = tarea
    tarea.then((resultado) => {
      // Si mientras tanto eligió otro archivo, ese manda.
      if (comprobanteRef.current !== tarea) return
      setAvisoComprobante(resultado.motivo)
      setEstadoComprobante(resultado.motivo ? "aviso" : "listo")
    })
  }

  // La pantalla de éxito se precarga al llegar al último paso: así la
  // navegación posterior al envío no necesita red.
  useEffect(() => {
    if (currentStep === 4) router.prefetch("/inscripcion/exito")
  }, [currentStep, router])

  // Si quedó alguna inscripción sin enviar (se cortó internet justo al
  // mandarla), se reintenta sola en segundo plano.
  useEffect(
    () =>
      vigilarPendientes((enviadas) => {
        if (enviadas > 0) setYaSeEnvio(true)
      }),
    [],
  )

  // Cargar draft del localStorage en el primer mount.
  useEffect(() => {
    if (draftLoadedRef.current) return
    draftLoadedRef.current = true
    const draft = loadDraft()
    if (draft) {
      // No restauramos automáticamente: mostramos un banner y dejamos
      // que el usuario decida. Mientras tanto, no persistimos el estado
      // vacío inicial para no pisar el borrador existente.
      setHasDraft({ savedAt: draft.savedAt, step: draft.step })
      return
    }
    canPersistDraftRef.current = true
  }, [])

  // Guardar draft cada vez que cambian los datos. Excluimos el File
  // del comprobante (no es serializable a JSON).
  useEffect(() => {
    if (typeof window === "undefined" || !canPersistDraftRef.current) return
    // Solo guardamos cambios reales respecto del formulario inicial. Así
    // valores por defecto como "Argentina" no crean ni pisan borradores.
    const { comprobanteFile, ...serializable } = formData
    const hasContent = hasMeaningfulDraftData(serializable)
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
    canPersistDraftRef.current = true
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
      localStorage.removeItem(LEGACY_DRAFT_KEY)
    } catch {}
    canPersistDraftRef.current = true
    setFormData(defaultFormData)
    setCurrentStep(1)
    setHasDraft(null)
  }

  // Autocompletado por DNI con debounce: busca apenas se completan 7 u 8 dígitos,
  // sin exigir Enter, blur ni un botón adicional.
  useEffect(() => {
    const dni = formData.dni.replace(/\D/g, "")

    if (!/^\d{7,8}$/.test(dni)) {
      ultimoDniBuscadoRef.current = ""
      setBuscandoDNI(false)
      return
    }

    if (dni === ultimoDniBuscadoRef.current) return

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      ultimoDniBuscadoRef.current = dni
      setBuscandoDNI(true)

      try {
        const res = await fetch(`/api/lookup-participant?dni=${encodeURIComponent(dni)}`, {
          signal: controller.signal,
        })
        if (!res.ok) return

        const result = await res.json()
        if (result.found && result.data) {
          setFormData((prev) => ({ ...prev, ...result.data, dni: prev.dni }))
          toast({
            title: result.isEdicion ? "Ya estás inscripto este año" : "Datos encontrados",
            description: result.isEdicion
              ? "Cargamos tus datos para que los revises o actualices."
              : "Precargamos tu información de una inscripción anterior. Revisá que esté correcta.",
          })
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error buscando DNI:", error)
        }
      } finally {
        if (!controller.signal.aborted) setBuscandoDNI(false)
      }
    }, 450)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [formData.dni, toast])

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
            datosTransferencia: data.datos_transferencia || "",
            // Banco / alias / CBU / titular por separado, para la tarjeta con
            // un boton de copiar en cada dato.
            transferencia: datosDesdeEvento(data)
          })
        }
      } catch (error) {
        console.error("Error loading event config:", error)
      }
    }
    
    loadEventConfig()
  }, [])

  // Grupos de ciclistas cargados una sola vez para alimentar el combo
  // autocompletable del paso 2. Se guardan en content_settings.id = "grupos".
  useEffect(() => {
    const loadGrupos = async () => {
      try {
        const { data } = await supabase
          .from("content_settings")
          .select("data")
          .eq("id", "grupos")
          .maybeSingle()

        const lista = (data as { data?: { lista?: string[] } } | null)?.data?.lista
        if (Array.isArray(lista)) setGruposGuardados(lista)
      } catch (error) {
        console.error("Error cargando grupos de ciclistas:", error)
      }
    }

    loadGrupos()
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


  /** Qué falta, con el nombre que ve la persona en pantalla. */
  const camposFaltantes = (step: number): string[] => {
    const falta: string[] = []
    const pedir = (valor: unknown, nombre: string) => {
      if (!valor) falta.push(nombre)
    }

    if (step === 1) {
      pedir(formData.dni, "DNI")
      pedir(formData.nombre, "nombre")
      pedir(formData.apellido, "apellido")
      pedir(formData.fechaNacimiento, "fecha de nacimiento")
      pedir(formData.email, "email")
      pedir(formData.telefono, "teléfono")
      pedir(formData.localidad, "ciudad")
      pedir(formData.nombreEmergencia, "contacto de emergencia")
      pedir(formData.telefonoEmergencia, "teléfono de emergencia")
    }

    if (step === 2) {
      pedir(formData.haRecorridoDistancia, "si recorriste 50 km antes")
      pedir(formData.grupoCiclistas, "grupo de ciclistas")
      pedir(formData.grupoSanguineo, "grupo sanguíneo")
      pedir(formData.esCeliaco, "si sos celíaco/a")
      pedir(formData.tieneAlergias, "si tenés alergias")
      if (formData.tieneAlergias === "si") pedir(formData.alergias, "cuáles son tus alergias")
      pedir(formData.tieneProblemasSalud, "si tenés problemas de salud")
      if (formData.tieneProblemasSalud === "si") pedir(formData.condicionSalud, "cuál es tu condición de salud")
    }

    if (step === 3) {
      pedir(formData.numeroReferencia, "nombre de quien transfirió")
      pedir(formData.comprobanteFile, "comprobante de pago")
    }

    return falta
  }

  const handleNext = () => {
    const falta = camposFaltantes(currentStep)
    if (falta.length > 0) {
      const lista = falta.length > 3 ? `${falta.slice(0, 3).join(", ")} y ${falta.length - 3} más` : falta.join(", ")
      toast({
        title: falta.length === 1 ? "Falta un dato" : "Faltan algunos datos",
        description: `Completá ${lista} para seguir.`,
      })
      return
    }
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  /**
   * Envío de la inscripción. La regla es que nadie se quede sin inscribirse:
   *
   * - El comprobante ya viene comprimido (o con una nota que explica por qué
   *   no se pudo) y nunca interrumpe el envío.
   * - Si no hay internet o el servidor contesta mal, la inscripción queda
   *   guardada en el teléfono y se reintenta sola.
   * - En los dos casos la persona termina en la pantalla de éxito.
   */
  const handleSubmit = async () => {
    if (!aceptaTerminos) {
      toast({
        title: "Falta aceptar el deslinde de responsabilidad",
        description: "Leé y aceptá el deslinde de responsabilidad para terminar tu inscripción.",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // El archivo se empezó a preparar al elegirlo; acá solo se espera si
      // todavía está en eso.
      let comprobante: ComprobantePreparado = {
        base64: "",
        nombreArchivo: "",
        pesoOriginal: 0,
        motivo: "La persona no adjuntó comprobante",
      }
      try {
        const tarea = comprobanteRef.current ?? (formData.comprobanteFile ? prepararComprobante(formData.comprobanteFile) : null)
        if (tarea) comprobante = await tarea
      } catch {
        comprobante = { ...comprobante, motivo: "No se pudo preparar el comprobante. Pedírselo por WhatsApp." }
      }

      const { comprobanteFile, metodoPago, ...datosInscripcion } = formData

      const { resultado, respuesta } = await enviarInscripcion({
        ...datosInscripcion,
        comprobanteBase64: comprobante.base64,
        comprobanteNota: comprobante.motivo
          ? `${comprobante.motivo}${comprobante.nombreArchivo ? ` (archivo: ${comprobante.nombreArchivo})` : ""}`
          : "",
      })

      // Datos para la pantalla final.
      try {
        sessionStorage.setItem(
          "inscripcion_exito",
          JSON.stringify({
            token: (respuesta.tokenQR as string) || null,
            nombre: `${formData.nombre} ${formData.apellido}`.trim(),
            numero: (respuesta.numeroInscripcion as number) || null,
            pendiente: resultado === "en-cola",
          })
        )
      } catch {}

      // El email de confirmación con QR se envía cuando el admin aprueba
      // la inscripción (cambia el estado a "Confirmada"), no acá.

      // Limpiar draft para no ofrecer restaurarlo en el siguiente intento.
      try {
        localStorage.removeItem(DRAFT_KEY)
        localStorage.removeItem(LEGACY_DRAFT_KEY)
      } catch {}

      if (resultado === "en-cola") {
        // Sin internet no se puede cargar ninguna página: el navegador
        // mostraría su propio cartel de error. La confirmación se da acá
        // mismo, con lo que ya está en pantalla.
        setGuardadaSinEnviar(true)
        return
      }

      // Navegación del lado del cliente: la pantalla de éxito ya se precargó
      // al llegar al paso 4, así que entra incluso con una conexión que se
      // cayó justo después de enviar.
      setYaSeEnvio(true)
      router.push("/inscripcion/exito")

      // Si por lo que sea no llegó a cambiar de página, se confirma acá para
      // que nadie se quede mirando el formulario sin saber si se envió.
      window.setTimeout(() => setGuardadaSinEnviar(true), 3_000)
    } catch (error) {
      // Red de seguridad: si algo inesperado explota, la inscripción igual
      // queda guardada para reintentar y la persona ve la pantalla de éxito.
      console.error("Error inesperado al enviar la inscripción:", error)
      try {
        const { comprobanteFile: _archivo, metodoPago: _metodo, ...datos } = formData
        await guardarInscripcionPendiente(
          {
            ...datos,
            comprobanteBase64: "",
            comprobanteNota: "Se guardó sin comprobante por un fallo del navegador.",
          },
          error instanceof Error ? error.message : "error desconocido",
        )
      } catch {}
      // Se confirma en esta misma pantalla: no sabemos si hay red para
      // cargar otra página.
      setGuardadaSinEnviar(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Inscripción cargada pero sin conexión para enviarla: se confirma acá,
  // sin pedirle al navegador que cargue otra página.
  if (guardadaSinEnviar) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
        <Navbar />
        <div className="container mx-auto flex items-center justify-center px-4 py-24 sm:px-6">
          <Card className="w-full max-w-xl border-yellow-400/30 bg-black/60 backdrop-blur-sm">
            <CardContent className="p-6 text-center sm:p-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle2 className="h-9 w-9 text-green-500" aria-hidden="true" />
              </div>

              <h1 className="mb-3 text-2xl font-black text-white sm:text-3xl">
                {yaSeEnvio ? (
                  <>
                    ¡Inscripción <span className="gradient-text">enviada</span>!
                  </>
                ) : (
                  <>
                    Inscripción <span className="gradient-text">guardada</span>
                  </>
                )}
              </h1>

              {yaSeEnvio ? (
                <p className="text-base leading-relaxed text-gray-300">
                  Ya la recibimos. El equipo revisa el pago y te llega el correo de confirmación con tu código QR en
                  las próximas 24-48 horas.
                </p>
              ) : (
                <>
                  <p className="text-base leading-relaxed text-gray-200">
                    <strong className="text-yellow-400">Tus datos quedaron guardados en este teléfono.</strong> Ahora
                    mismo la conexión no alcanza para enviarlos, así que los mandamos nosotros en cuanto vuelva
                    internet.
                  </p>
                  <p className="mt-4 text-sm text-gray-400">
                    No tenés que cargar nada de nuevo. Dejá esta pestaña abierta, o volvé a entrar al sitio más tarde
                    desde este mismo teléfono y se envía sola.
                  </p>
                </>
              )}

              <div className="mt-7 border-t border-yellow-400/20 pt-6">
                <Button
                  type="button"
                  onClick={() => window.location.assign("/")}
                  className="w-full bg-gradient-to-r from-yellow-400 to-amber-600 text-black sm:w-auto"
                >
                  Volver al inicio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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

          <MedallasBanner />

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
                  buscandoDNI={buscandoDNI}
                />
              )}
              {currentStep === 2 && (
                <CategoryStep formData={formData} updateFormData={updateFormData} gruposGuardados={gruposGuardados} />
              )}
              {currentStep === 3 && (
                <PaymentStep
                  formData={formData}
                  updateFormData={updateFormData}
                  eventConfig={eventConfig}
                  onComprobante={elegirComprobante}
                  estadoComprobante={estadoComprobante}
                  avisoComprobante={avisoComprobante}
                />
              )}
              {currentStep === 4 && (
                <ReviewStep
                  formData={formData}
                  eventConfig={eventConfig}
                  aceptaTerminos={aceptaTerminos}
                  onAceptaTerminosChange={setAceptaTerminos}
                />
              )}

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
                    disabled={isSubmitting || !aceptaTerminos}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
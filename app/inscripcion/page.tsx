"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { serverTimestamp, doc, setDoc, runTransaction, getDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { compressAndConvertToBase64 } from "@/lib/imageUtils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import PersonalInfoStep from "@/components/inscripcion/PersonalInfoStep"
import CategoryStep from "@/components/inscripcion/CategoryStep"
import PaymentStep from "@/components/inscripcion/PaymentStep"
import ReviewStep from "@/components/inscripcion/ReviewStep"
import Navbar from "@/components/layout/Navbar"

export default function InscripcionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inscripcionesAbiertas, setInscripcionesAbiertas] = useState(true)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [participanteExistente, setParticipanteExistente] = useState(false)
  const [buscandoDNI, setBuscandoDNI] = useState(false)
  const [activeYear, setActiveYear] = useState("")
  const [eventConfig, setEventConfig] = useState({
    costoInscripcion: 0,
    aliasTransferencia: "",
    datosTransferencia: ""
  })
  
  const [formData, setFormData] = useState({
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
  })

  useEffect(() => {
    const loadEventConfig = async () => {
      try {
        // Buscar el evento activo con inscripciones abiertas
        const eventosSnapshot = await getDocs(collection(db, "eventos"))
        let foundActive = false

        // Ordenar por año descendente para encontrar el más reciente activo
        const eventos = eventosSnapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => Number(b.id) - Number(a.id))

        for (const evento of eventos) {
          if (evento.inscripcionesAbiertas === true) {
            setActiveYear(evento.id)
            setEventConfig({
              costoInscripcion: evento.costoInscripcion || 0,
              aliasTransferencia: evento.aliasTransferencia || "",
              datosTransferencia: evento.datosTransferencia || ""
            })
            setInscripcionesAbiertas(true)
            foundActive = true
            break
          }
        }

        if (!foundActive) {
          // No hay evento con inscripciones abiertas
          setInscripcionesAbiertas(false)
          // Usar el año más reciente como referencia
          if (eventos.length > 0) {
            setActiveYear(eventos[0].id)
          }
        }
      } catch (error) {
        console.error("Error loading event config:", error)
      } finally {
        setLoadingConfig(false)
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

  const buscarParticipantePorDNI = async (dni: string) => {
    if (!dni || dni.length < 6) return

    setBuscandoDNI(true)
    try {
      const participanteRef = doc(db, "Participantes", dni)
      const participanteSnap = await getDoc(participanteRef)

      if (participanteSnap.exists()) {
        const data = participanteSnap.data()
        setParticipanteExistente(true)

        // Verificar si ya se inscribió este año
        if (data.años?.[activeYear]) {
          toast({
            title: "Ya inscripto",
            description: `Este DNI ya tiene una inscripción registrada para ${activeYear}.`,
            variant: "destructive",
          })
          setBuscandoDNI(false)
          return
        }

        // Autocompletar con datos existentes
        setFormData((prev) => ({
          ...prev,
          nombre: data.nombre || prev.nombre,
          apellido: data.apellido || prev.apellido,
          email: data.email || prev.email,
          telefono: data.telefono || prev.telefono,
          fechaNacimiento: data.fechaNacimiento || prev.fechaNacimiento,
          paisTelefono: data.paisTelefono || prev.paisTelefono,
          localidad: data.localidad || prev.localidad,
          nombreEmergencia: data.nombreEmergencia || prev.nombreEmergencia,
          telefonoEmergencia: data.telefonoEmergencia || prev.telefonoEmergencia,
          relacionEmergencia: data.relacionEmergencia || prev.relacionEmergencia,
          talleRemera: data.talleRemera || prev.talleRemera,
          grupoSanguineo: data.grupoSanguineo || prev.grupoSanguineo,
          tieneAlergias: data.tieneAlergias || prev.tieneAlergias,
          alergias: data.alergias || prev.alergias,
          tieneProblemasSalud: data.tieneProblemasSalud || prev.tieneProblemasSalud,
          condicionSalud: data.condicionSalud || prev.condicionSalud,
        }))

        toast({
          title: "Participante encontrado",
          description: "Se completaron los datos automáticamente. Verificá que estén correctos.",
        })
      } else {
        setParticipanteExistente(false)
      }
    } catch (error) {
      console.error("Error buscando participante:", error)
    } finally {
      setBuscandoDNI(false)
    }
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

  const getNextInscriptionNumber = async () => {
    const counterDocRef = doc(db, "counters", `inscripciones_${activeYear}`)

    try {
      const newNumber = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterDocRef)

        let currentCount = 0
        if (counterDoc.exists()) {
          currentCount = counterDoc.data().count || 0
        }

        const newCount = currentCount + 1
        transaction.set(counterDocRef, { count: newCount }, { merge: true })

        return newCount
      })

      return newNumber
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
      let imagenBase64 = ""

      if (formData.comprobanteFile) {
        toast({
          title: "Procesando imagen...",
          description: "Comprimiendo el comprobante de pago.",
        })
        imagenBase64 = await compressAndConvertToBase64(formData.comprobanteFile, 500)
      }

      const inscriptionNumber = await getNextInscriptionNumber()
      const paddedNumber = String(inscriptionNumber).padStart(3, "0")
      const customDocId = `Inscripciones_${activeYear} - ${paddedNumber}-${formData.nombre} ${formData.apellido}`

      const inscripcionData = {
        // Personal info
        nombre: formData.nombre,
        apellido: formData.apellido,
        dni: formData.dni,
        email: formData.email,
        telefono: formData.telefono,
        fechaNacimiento: formData.fechaNacimiento,
        paisTelefono: formData.paisTelefono,
        localidad: formData.localidad,

        // Emergency contact
        nombreEmergencia: formData.nombreEmergencia,
        telefonoEmergencia: formData.telefonoEmergencia,
        relacionEmergencia: formData.relacionEmergencia || "",

        // Additional info
        haRecorridoDistancia: formData.haRecorridoDistancia,
        talleRemera: formData.talleRemera,
        grupoSanguineo: formData.grupoSanguineo,
        tieneAlergias: formData.tieneAlergias,
        alergias: formData.tieneAlergias === "si" ? formData.alergias : "",
        tieneProblemasSalud: formData.tieneProblemasSalud,
        condicionSalud: formData.tieneProblemasSalud === "si" ? formData.condicionSalud : "",

        // Payment
        metodoPago: "transferencia",
        numeroReferencia: formData.numeroReferencia,
        imagenBase64,

        // Metadata
        numeroInscripcion: inscriptionNumber,
        estado: "pendiente",
        fechaInscripcion: serverTimestamp(),
        aprobadoPorAdmin: false,
      }

      await setDoc(doc(db, "Participantes", customDocId), inscripcionData)

      // Guardar/actualizar en colección Participantes con DNI como ID
      const participanteRef = doc(db, "Participantes", formData.dni)
      const participanteSnap = await getDoc(participanteRef)

      if (participanteSnap.exists()) {
        // Participante existente: solo agregar el año activo
        await updateDoc(participanteRef, {
          [`años.${activeYear}`]: {
            estado: "pendiente",
            numeroInscripcion: inscriptionNumber,
          },
          // Actualizar datos personales por si cambiaron
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          telefono: formData.telefono,
          fechaNacimiento: formData.fechaNacimiento,
          paisTelefono: formData.paisTelefono,
          localidad: formData.localidad,
          nombreEmergencia: formData.nombreEmergencia,
          telefonoEmergencia: formData.telefonoEmergencia,
          relacionEmergencia: formData.relacionEmergencia || "",
          talleRemera: formData.talleRemera,
          grupoSanguineo: formData.grupoSanguineo,
          tieneAlergias: formData.tieneAlergias,
          alergias: formData.tieneAlergias === "si" ? formData.alergias : "",
          tieneProblemasSalud: formData.tieneProblemasSalud,
          condicionSalud: formData.tieneProblemasSalud === "si" ? formData.condicionSalud : "",
          ultimaActualizacion: serverTimestamp(),
        })
      } else {
        // Participante nuevo: crear documento completo
        await setDoc(participanteRef, {
          nombre: formData.nombre,
          apellido: formData.apellido,
          dni: formData.dni,
          email: formData.email,
          telefono: formData.telefono,
          fechaNacimiento: formData.fechaNacimiento,
          paisTelefono: formData.paisTelefono,
          localidad: formData.localidad,
          nombreEmergencia: formData.nombreEmergencia,
          telefonoEmergencia: formData.telefonoEmergencia,
          relacionEmergencia: formData.relacionEmergencia || "",
          talleRemera: formData.talleRemera,
          grupoSanguineo: formData.grupoSanguineo,
          tieneAlergias: formData.tieneAlergias,
          alergias: formData.tieneAlergias === "si" ? formData.alergias : "",
          tieneProblemasSalud: formData.tieneProblemasSalud,
          condicionSalud: formData.tieneProblemasSalud === "si" ? formData.condicionSalud : "",
          años: {
            [activeYear]: {
              estado: "pendiente",
              numeroInscripcion: inscriptionNumber,
            },
          },
          creadoEn: serverTimestamp(),
          ultimaActualizacion: serverTimestamp(),
        })
      }

      toast({
        title: "¡Inscripción exitosa!",
        description: "Tu solicitud ha sido enviada. Recibirás un correo de confirmación pronto.",
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

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-yellow-400 text-lg animate-pulse">Cargando...</div>
        </div>
      </div>
    )
  }

  if (!inscripcionesAbiertas) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
        <Navbar />
        <div className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
              Inscripciones <span className="text-red-500">Cerradas</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Las inscripciones para este evento no están disponibles en este momento.
              Por favor, vuelve a intentarlo más tarde o contactanos para más información.
            </p>
            <Button
              onClick={() => router.push("/")}
              className="bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:scale-105 transition-transform"
            >
              Volver al Inicio
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <Navbar />

      <div className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
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
              {currentStep === 1 && <PersonalInfoStep formData={formData} updateFormData={updateFormData} onDNIBlur={buscarParticipantePorDNI} buscandoDNI={buscandoDNI} />}
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
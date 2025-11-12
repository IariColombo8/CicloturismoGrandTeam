"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { serverTimestamp, doc, setDoc, runTransaction, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { compressAndConvertToBase64 } from "@/lib/imageUtils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react"
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
  const [eventConfig, setEventConfig] = useState({
    costoInscripcion: 0,
    aliasTransferencia: "",
    datosTransferencia: ""
  })
  
  const [formData, setFormData] = useState({
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
  })

  useEffect(() => {
    const loadEventConfig = async () => {
      try {
        const docRef = doc(db, "eventos", "2026")
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data()
          setEventConfig({
            costoInscripcion: data.costoInscripcion || 0,
            aliasTransferencia: data.aliasTransferencia || "",
            datosTransferencia: data.datosTransferencia || ""
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
    const counterDocRef = doc(db, "counters", "inscripciones_2026")

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
        // Personal info
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        cedula: formData.cedula,
        email: formData.email,
        telefono: formData.telefono,
        fechaNacimiento: formData.fechaNacimiento,
        pais: formData.pais,
        ciudad: formData.ciudad,

        // Emergency contact
        nombreEmergencia: formData.nombreEmergencia,
        telefonoEmergencia: formData.telefonoEmergencia,
        relacionEmergencia: formData.relacionEmergencia || "",

        // Additional info
        haRecorridoDistancia: formData.haRecorridoDistancia,
        tallaCamiseta: formData.tallaCamiseta,
        tipoSangre: formData.tipoSangre,
        tieneAlergias: formData.tieneAlergias,
        alergias: formData.tieneAlergias === "si" ? formData.alergias : "",
        tieneProblemasSalud: formData.tieneProblemasSalud,
        condicionesMedicas: formData.tieneProblemasSalud === "si" ? formData.condicionesMedicas : "",

        // Payment
        metodoPago: "transferencia",
        numeroReferencia: formData.numeroReferencia,
        comprobanteBase64,

        // Metadata
        numeroInscripcion: inscriptionNumber,
        estado: "pendiente",
        fechaInscripcion: serverTimestamp(),
        aprobadoPorAdmin: false,
      }

      await setDoc(doc(db, "inscripciones", customDocId), inscripcionData)
      console.log("Inscription saved successfully:", customDocId)

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
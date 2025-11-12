"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Mail, Phone, MapPin, Send } from "lucide-react"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"

export default function ContactoPage() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    mensaje: "",
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Email service integration commented out for now
      // await emailService.sendContactEmail(formData)

      toast({
        title: "Mensaje enviado",
        description: "Gracias por contactarnos. Te responderemos pronto.",
      })

      // Reset form
      setFormData({
        nombre: "",
        email: "",
        telefono: "",
        mensaje: "",
      })
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <Navbar />

      <div className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              Contáctanos <span className="gradient-text">Hoy</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              ¿Tienes preguntas sobre el evento? Estamos aquí para ayudarte
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Contact Form */}
            <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Envíanos un mensaje</CardTitle>
                <CardDescription className="text-gray-400">
                  Completa el formulario y nos pondremos en contacto contigo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="nombre" className="text-white">
                      Nombre completo
                    </Label>
                    <Input
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                      className="bg-zinc-900 border-yellow-400/30 text-white focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-white">
                      Correo electrónico
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="bg-zinc-900 border-yellow-400/30 text-white focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <Label htmlFor="telefono" className="text-white">
                      Teléfono
                    </Label>
                    <Input
                      id="telefono"
                      name="telefono"
                      type="tel"
                      value={formData.telefono}
                      onChange={handleChange}
                      className="bg-zinc-900 border-yellow-400/30 text-white focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <Label htmlFor="mensaje" className="text-white">
                      Mensaje
                    </Label>
                    <Textarea
                      id="mensaje"
                      name="mensaje"
                      value={formData.mensaje}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="bg-zinc-900 border-yellow-400/30 text-white focus:border-yellow-400"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-yellow-400 to-amber-600 text-black hover:scale-105 transition-transform"
                  >
                    {isSubmitting ? "Enviando..." : "Enviar mensaje"}
                    <Send className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <div className="space-y-6">
              <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg mb-2">Email</h3>
                      <p className="text-gray-400">contacto@grandteambike.com</p>
                      <p className="text-gray-400">info@grandteambike.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg mb-2">Teléfono</h3>
                      <p className="text-gray-400">+54 9 3442 123456</p>
                      <p className="text-gray-400">WhatsApp disponible</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg mb-2">Ubicación</h3>
                      <p className="text-gray-400">Concepción del Uruguay</p>
                      <p className="text-gray-400">Entre Ríos, Argentina</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-400/10 to-amber-600/10 border-yellow-400/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="text-white font-bold text-lg mb-3">Horario de atención</h3>
                  <div className="space-y-2 text-gray-300">
                    <p>Lunes a Viernes: 9:00 - 18:00</p>
                    <p>Sábados: 9:00 - 13:00</p>
                    <p>Domingos: Cerrado</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            <Card className="bg-black/50 border-yellow-400/20 backdrop-blur-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Punto de Encuentro</CardTitle>
                <CardDescription className="text-gray-400">
                  Ruinas del Viejo Molino - Concepción del Uruguay
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3998.784583464247!2d-58.26760912361883!3d-32.33618814131932!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95afd9a82ba04c2f%3A0xfad134f092d5c38a!2sEl%20Viejo%20Molino!5e1!3m2!1ses!2sar!4v1762536601638!5m2!1ses!2sar"
                  width="100%"
                  height="450"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Eye } from "lucide-react"

interface ParticipantsListProps {
  participants: any[]
}

export default function ParticipantsList({ participants }: ParticipantsListProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const getCategoryColor = (categoria: string) => {
    switch (categoria) {
      case "libre":
        return "bg-blue-400/20 text-blue-400"
      case "competitivo":
        return "bg-red-400/20 text-red-400"
      case "familiar":
        return "bg-green-400/20 text-green-400"
      default:
        return "bg-gray-400/20 text-gray-400"
    }
  }

  if (participants.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No hay participantes confirmados aún</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-yellow-400/20 overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-900">
            <TableRow className="border-yellow-400/20 hover:bg-zinc-900">
              <TableHead className="text-yellow-400">Nombre</TableHead>
              <TableHead className="text-yellow-400">Cédula</TableHead>
              <TableHead className="text-yellow-400">Email</TableHead>
              <TableHead className="text-yellow-400">Teléfono</TableHead>
              <TableHead className="text-yellow-400">Categoría</TableHead>
              <TableHead className="text-yellow-400">Talla</TableHead>
              <TableHead className="text-yellow-400 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((participant) => (
              <TableRow key={participant.id} className="border-yellow-400/10 hover:bg-zinc-900/50">
                <TableCell className="text-white font-medium">
                  {participant.nombres} {participant.apellidos}
                </TableCell>
                <TableCell className="text-gray-400">{participant.cedula}</TableCell>
                <TableCell className="text-gray-400">{participant.email}</TableCell>
                <TableCell className="text-gray-400">{participant.telefono}</TableCell>
                <TableCell>
                  <Badge className={`${getCategoryColor(participant.categoria)} border-none capitalize`}>
                    {participant.categoria}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-400 uppercase">{participant.tallaCamiseta}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white bg-transparent"
                    onClick={() => {
                      setSelectedParticipant(participant)
                      setIsModalOpen(true)
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Participant Detail Modal */}
      {selectedParticipant && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-zinc-900 border-yellow-400/30 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold gradient-text">Detalle del Participante</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Personal Info */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-yellow-400">Información Personal</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Nombre Completo</p>
                    <p className="text-white font-medium">
                      {selectedParticipant.nombres} {selectedParticipant.apellidos}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Cédula</p>
                    <p className="text-white font-medium">{selectedParticipant.cedula}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Email</p>
                    <p className="text-white font-medium">{selectedParticipant.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Teléfono</p>
                    <p className="text-white font-medium">{selectedParticipant.telefono}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Fecha de Nacimiento</p>
                    <p className="text-white font-medium">{selectedParticipant.fechaNacimiento}</p>
                  </div>
                  {selectedParticipant.ciudad && (
                    <div>
                      <p className="text-gray-400">Ciudad</p>
                      <p className="text-white font-medium">{selectedParticipant.ciudad}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-3 pt-4 border-t border-yellow-400/20">
                <h3 className="text-lg font-semibold text-yellow-400">Contacto de Emergencia</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Nombre</p>
                    <p className="text-white font-medium">{selectedParticipant.nombreEmergencia}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Teléfono</p>
                    <p className="text-white font-medium">{selectedParticipant.telefonoEmergencia}</p>
                  </div>
                </div>
              </div>

              {/* Medical & Category */}
              <div className="space-y-3 pt-4 border-t border-yellow-400/20">
                <h3 className="text-lg font-semibold text-yellow-400">Información Médica y Categoría</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Categoría</p>
                    <Badge className={`${getCategoryColor(selectedParticipant.categoria)} border-none capitalize mt-1`}>
                      {selectedParticipant.categoria}
                    </Badge>
                  </div>
                  {/*<div>
                    <p className="text-gray-400">Talla</p>
                    <p className="text-white font-medium uppercase">{selectedParticipant.tallaCamiseta}</p>
                  </div>*/}
                  <div>
                    <p className="text-gray-400">Tipo de Sangre</p>
                    <p className="text-white font-medium">{selectedParticipant.tipoSangre}</p>
                  </div>
                  {selectedParticipant.alergias && (
                    <div className="col-span-2">
                      <p className="text-gray-400">Alergias</p>
                      <p className="text-white font-medium">{selectedParticipant.alergias}</p>
                    </div>
                  )}
                  {selectedParticipant.condicionesMedicas && (
                    <div className="col-span-2">
                      <p className="text-gray-400">Condiciones Médicas</p>
                      <p className="text-white font-medium">{selectedParticipant.condicionesMedicas}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

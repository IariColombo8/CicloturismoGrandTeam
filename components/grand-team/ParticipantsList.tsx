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
              <TableHead className="text-yellow-400">DNI</TableHead>
              <TableHead className="text-yellow-400">Email</TableHead>
              <TableHead className="text-yellow-400">Localidad</TableHead>
              <TableHead className="text-yellow-400">Grupo ciclista</TableHead>
              <TableHead className="text-yellow-400 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((participant) => (
              <TableRow key={participant.id} className="border-yellow-400/10 hover:bg-zinc-900/50">
                <TableCell className="text-white font-medium">
                  {participant.nombre} {participant.apellido}
                </TableCell>
                <TableCell className="text-gray-400">{participant.dni}</TableCell>
                <TableCell className="text-gray-400">{participant.email}</TableCell>
                <TableCell className="text-gray-400">{participant.localidad || "-"}</TableCell>
                <TableCell className="text-gray-400">{participant.grupoCiclistas || "Sin grupo"}</TableCell>
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

      {selectedParticipant && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-zinc-900 border-yellow-400/30 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold gradient-text">Detalle del Participante</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-yellow-400">Información Personal</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Nombre Completo</p>
                    <p className="text-white font-medium">
                      {selectedParticipant.nombre} {selectedParticipant.apellido}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">DNI</p>
                    <p className="text-white font-medium">{selectedParticipant.dni}</p>
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
                    <p className="text-gray-400">País</p>
                    <p className="text-white font-medium">{selectedParticipant.pais || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Localidad</p>
                    <p className="text-white font-medium">{selectedParticipant.localidad || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Grupo ciclista</p>
                    <p className="text-white font-medium">{selectedParticipant.grupoCiclistas || "Sin grupo"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-yellow-400/20">
                <h3 className="text-lg font-semibold text-yellow-400">Información Médica</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Grupo Sanguíneo</p>
                    <p className="text-white font-medium uppercase">{selectedParticipant.grupoSanguineo || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Celíaco/a</p>
                    <Badge className={selectedParticipant.esCeliaco ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}>
                      {selectedParticipant.esCeliaco ? "Sí" : "No"}
                    </Badge>
                  </div>
                  {selectedParticipant.alergias && (
                    <div className="sm:col-span-2">
                      <p className="text-gray-400">Alergias</p>
                      <p className="text-white font-medium">{selectedParticipant.alergias}</p>
                    </div>
                  )}
                  {selectedParticipant.condicionSalud && (
                    <div className="sm:col-span-2">
                      <p className="text-gray-400">Condición de Salud</p>
                      <p className="text-white font-medium">{selectedParticipant.condicionSalud}</p>
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

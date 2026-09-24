import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { Examen } from '@/services/examenes.service'

interface ExamenDetailModalProps {
  exam: Examen | null
  onClose: () => void
}

const normalizeDate = (date: string) => (date ? date.slice(0, 10) : '')
const normalizeTime = (time: string) => (time ? time.slice(0, 5) : '')

const formatDate = (date: string) => {
  if (!date) return 'Fecha por confirmar'
  const normalized = normalizeDate(date)
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${normalized}T00:00:00Z`))
}

export function ExamenDetailModal({ exam, onClose }: ExamenDetailModalProps) {
  if (!exam) return null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden rounded-2xl border-border bg-card p-0 text-card-foreground shadow-2xl">
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sci-cyan">
            Detalle de la evaluación
          </span>
          <DialogTitle className="mt-1 text-xl font-bold text-sci-navy">
            {exam.nombre}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Información técnica y académica del examen programado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-6 py-5 text-xs">
          <div className="flex justify-between border-b border-border py-1.5">
            <span className="font-semibold text-foreground">Asignatura:</span>
            <span className="text-muted-foreground">{exam.materia?.nombre ?? 'Sin detalle'}</span>
          </div>
          <div className="flex justify-between border-b border-border py-1.5">
            <span className="font-semibold text-foreground">Fecha:</span>
            <span className="text-muted-foreground">{formatDate(exam.fecha)}</span>
          </div>
          <div className="flex justify-between border-b border-border py-1.5">
            <span className="font-semibold text-foreground">Horario:</span>
            <span className="text-muted-foreground">
              {normalizeTime(exam.hora_ini)} – {normalizeTime(exam.hora_fin)}
            </span>
          </div>
          <div className="flex justify-between border-b border-border py-1.5">
            <span className="font-semibold text-foreground">Ambiente:</span>
            <span className="text-muted-foreground">{exam.aula?.nombre ?? 'Sin detalle'}</span>
          </div>
          <div className="flex justify-between border-b border-border py-1.5">
            <span className="font-semibold text-foreground">Docente responsable:</span>
            <span className="text-muted-foreground">
              {exam.docente
                ? `${exam.docente.nombre} ${exam.docente.apellido_paterno ?? ''}`.trim()
                : 'Sin detalle'}
            </span>
          </div>

          <div className="pt-2">
            <span className="mb-2 block font-semibold text-foreground">Normativas aplicables:</span>
            {exam.normas?.length ? (
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {exam.normas.map((rule) => (
                  <li key={rule.id}>{rule.titulo}</li>
                ))}
              </ul>
            ) : (
              <p className="italic text-muted-foreground">Sin normas particulares asociadas.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-border bg-muted/40 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="cursor-pointer text-xs"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
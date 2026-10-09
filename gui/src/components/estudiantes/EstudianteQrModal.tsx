import { QRCodeSVG } from 'qrcode.react'
import {
  BookOpen,
  CheckCircle2,
  IdCard,
  QrCode,
  UserRound,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { EstudianteInscritoExamen } from '@/services/estudiantes.service'

interface EstudianteQrModalProps {
  estudiante: EstudianteInscritoExamen | null
  materiaNombre?: string
  onClose: () => void
}

export function EstudianteQrModal({
  estudiante,
  materiaNombre,
  onClose,
}: EstudianteQrModalProps) {
  if (!estudiante) return null

  const isHabilitado = estudiante.estado === 'Habilitado'

  const qrPayload = JSON.stringify({
    sis: estudiante.codigo_sis,
    materia: materiaNombre || 'General',
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-1.5rem)] max-w-sm overflow-y-auto rounded-2xl border-0 bg-card p-0 text-card-foreground shadow-2xl"
      >
        <DialogHeader className="bg-sci-navy px-5 py-5 text-center text-white sm:px-6">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/95 shadow-lg">
            <QrCode className="h-8 w-8 text-sci-cyan" aria-hidden="true" />
          </div>

          <DialogTitle className="mt-2 text-xl font-extrabold leading-tight text-white">
            Pase de ingreso
          </DialogTitle>

          <DialogDescription className="text-xs font-medium text-white/80">
            Credencial digital para el control de acceso
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-5">
          <section className="flex justify-center">
            <div className="rounded-2xl border-2 border-sci-cyan/25 bg-white p-4 shadow-sm">
              <QRCodeSVG
                value={qrPayload}
                size={190}
                level="M"
                includeMargin={false}
                title={`Código QR de ${estudiante.nombre_completo}`}
              />
            </div>
          </section>

          <section className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sci-cyan/10">
              <UserRound className="h-5 w-5 text-sci-cyan" aria-hidden="true" />
            </div>

            <div className="min-w-0 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Estudiante
              </p>
              <p className="break-words text-sm font-extrabold leading-snug text-foreground">
                {estudiante.nombre_completo}
              </p>
            </div>
          </section>

          <section className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <BookOpen
              className="mt-0.5 h-4 w-4 shrink-0 text-sci-cyan"
              aria-hidden="true"
            />

            <div className="min-w-0 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Asignatura
              </p>
              <p className="break-words text-sm font-bold leading-snug text-foreground">
                {materiaNombre || 'Materia no especificada'}
              </p>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <section className="rounded-xl border border-border bg-muted/30 p-3 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Código SIS
              </p>
              <p className="mt-1 break-all text-sm font-extrabold text-foreground">
                {estudiante.codigo_sis}
              </p>
            </section>

            <section className="rounded-xl border border-border bg-muted/30 p-3 text-left">
              <div className="flex items-center gap-1.5">
                <IdCard className="h-3.5 w-3.5 text-sci-cyan" aria-hidden="true" />
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  CI
                </p>
              </div>
              <p className="mt-1 break-all text-sm font-extrabold text-foreground">
                {estudiante.ci}
                {estudiante.ci_extension ? ` ${estudiante.ci_extension}` : ''}
              </p>
            </section>
          </div>

          <section
            aria-label={`Estado del estudiante: ${estudiante.estado}`}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 ${
              isHabilitado
                ? 'border-emerald-600/30 bg-emerald-600/5 text-emerald-700 dark:text-emerald-400'
                : 'border-sci-red/30 bg-sci-red/5 text-sci-red'
            }`}
          >
            {isHabilitado ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <XCircle className="h-4 w-4" aria-hidden="true" />
            )}

            <span className="text-xs font-bold">{estudiante.estado}</span>
          </section>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            Presente este código QR al responsable del control de ingreso.
          </p>
        </div>

        <footer className="border-t border-border bg-muted/30 px-5 py-4">
          <Button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer bg-sci-blue font-bold text-white hover:opacity-90"
          >
            Cerrar
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}

import { QRCodeSVG } from 'qrcode.react'
import { QrCode, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { EstudianteInscritoExamen } from '@/services/estudiantes.service'

interface EstudianteQrModalProps {
  estudiante: EstudianteInscritoExamen | null
  materiaNombre?: string
  onClose: () => void
}

export function EstudianteQrModal({ estudiante, materiaNombre, onClose }: EstudianteQrModalProps) {
  if (!estudiante) return null

  // Payload con el Código SIS y la Materia
  const qrPayload = JSON.stringify({
    sis: estudiante.codigo_sis,
    materia: materiaNombre || 'General',
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xs overflow-hidden rounded-2xl border-border bg-card p-0 text-card-foreground shadow-2xl">
        <DialogHeader className="border-b border-border bg-muted/30 px-5 py-4 text-center">
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-sci-cyan/10 text-sci-cyan">
            <QrCode className="h-5 w-5" />
          </div>
          <DialogTitle className="text-base font-bold text-sci-navy">
            Pase de Ingreso
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Credencial digital para control de acceso
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 px-5 py-5 text-center">
          {/* Gráfico QR */}
          <div className="rounded-2xl border-2 border-border bg-white p-3 shadow-inner">
            <QRCodeSVG
              value={qrPayload}
              size={180}
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Información visible */}
          <div className="w-full space-y-1 rounded-xl border border-border bg-muted/30 p-3 text-xs">
            <p className="font-bold text-sci-navy">{estudiante.nombre_completo}</p>
            
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-sci-cyan" />
              <span className="font-semibold text-foreground truncate max-w-[200px]">
                {materiaNombre || 'Materia no especificada'}
              </span>
            </div>

            <div className="flex justify-center gap-3 pt-1 text-muted-foreground">
              <span>SIS: <strong className="text-foreground">{estudiante.codigo_sis}</strong></span>
              <span>CI: <strong className="text-foreground">{estudiante.ci}</strong></span>
            </div>

            <div className="pt-1.5">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  estudiante.estado === 'Habilitado'
                    ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                    : 'border border-red-500/30 bg-red-500/10 text-red-600'
                }`}
              >
                {estudiante.estado}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-border bg-muted/20 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full text-xs cursor-pointer"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
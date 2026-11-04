import { Edit3, QrCode, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { EstudianteInscritoExamen } from '@/services/estudiantes.service'

interface EstudiantesMobileCardsProps {
  students: EstudianteInscritoExamen[]
  canManage: boolean
  isOffline: boolean
  onVerQr: (student: EstudianteInscritoExamen) => void
  onPrerrequisitos: (student: EstudianteInscritoExamen) => void
  onEditar: (student: EstudianteInscritoExamen) => void
  onInhabilitar: (student: EstudianteInscritoExamen) => void
}

export function EstudiantesMobileCards({
  students,
  canManage,
  isOffline,
  onVerQr,
  onPrerrequisitos,
  onEditar,
  onInhabilitar,
}: EstudiantesMobileCardsProps) {
  if (students.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground md:hidden">
        No hay estudiantes que coincidan con los filtros.
      </p>
    )
  }

  return (
    <div className="space-y-3 p-3 md:hidden">
      {students.map((st) => (
        <div
          key={st.id}
          className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-bold text-sci-navy">
                {st.nombre_completo}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Código SIS: {st.codigo_sis}
              </p>
            </div>

            <Badge
              variant={st.estado === 'Habilitado' ? 'secondary' : 'destructive'}
              className={`shrink-0 text-[11px] font-semibold ${
                st.estado === 'Habilitado'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                  : 'border-red-500/30 bg-red-500/10 text-red-600'
              }`}
            >
              {st.estado}
            </Badge>
          </div>

          <div className="space-y-2 border-t border-border pt-3 text-xs">
            <div>
              <p className="font-semibold text-sci-dark">C.I.</p>
              <p className="mt-0.5 text-muted-foreground">
                {st.ci} {st.ci_extension ?? ''}
              </p>
            </div>

            <div>
              <p className="font-semibold text-sci-dark">Correo institucional</p>
              <p className="mt-0.5 break-all text-muted-foreground">
                {st.email_institucional}
              </p>
            </div>

            {st.estado === 'Inhabilitado' && st.motivo_estado && (
              <div className="rounded-lg bg-red-50 p-3">
                <p className="font-semibold text-red-700">
                  Motivo de inhabilitación
                </p>
                <p className="mt-1 break-words text-red-600">
                  {st.motivo_estado}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onVerQr(st)}
              className="h-10 gap-2 text-xs"
            >
              <QrCode className="h-4 w-4 text-sci-cyan" />
              Ver QR
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isOffline}
              onClick={() => onPrerrequisitos(st)}
              className="h-10 gap-2 text-xs disabled:opacity-50"
            >
              Prerrequisitos
            </Button>

            {canManage && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isOffline}
                  onClick={() => onEditar(st)}
                  className="h-10 gap-2 text-xs disabled:opacity-50"
                >
                  <Edit3 className="h-4 w-4" />
                  Editar
                </Button>

                {st.estado !== 'Inhabilitado' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isOffline}
                    onClick={() => onInhabilitar(st)}
                    className="h-10 gap-2 text-xs text-sci-red hover:text-sci-red disabled:opacity-50"
                  >
                    <UserX className="h-4 w-4" />
                    Inhabilitar
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
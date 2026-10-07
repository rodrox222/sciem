import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Examen } from '@/services/examenes.service'

export type CodigoRechazoValidacion =
  | 'NO_INSCRITO'
  | 'NO_HABILITADO'
  | 'INHABILITADO'
  | 'AULA_INCORRECTA'
  | 'MATERIA_INCORRECTA'
  | 'EXAMEN_DISTINTO'
  | 'EXAMEN_NO_ENCONTRADO'
  | 'QR_INVALIDO'
  | 'YA_INGRESO'
  | 'ERROR_VALIDACION'

interface EstudianteValidado {
  nombreCompleto?: string
  codigoSis?: string
}

export type ResultadoValidacionAcceso =
  | {
      estado: 'pendiente'
      codigoQr?: string
    }
  | {
      estado: 'autorizado'
      estudiante?: EstudianteValidado
      horaIngreso?: string
    }
  | {
      estado: 'rechazado'
      codigo: CodigoRechazoValidacion
      motivo?: string
      aulaCorrecta?: string
      examenCorrecto?: string
      estudiante?: EstudianteValidado
      primerIngreso?: string
    }

interface ResultadoValidacionDialogProps {
  open: boolean
  resultado: ResultadoValidacionAcceso | null
  examen: Examen
  onClose: () => void
}

interface RejectionCopy {
  title: string
  detail: string
  guidance?: string
}

const normalizeTime = (time: string) => (time ? time.slice(0, 5) : '--:--')

const formatDate = (date: string) => {
  if (!date) return 'Fecha por confirmar'

  const normalized = date.slice(0, 10)
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${normalized}T00:00:00Z`))
}

const getRejectionCopy = (
  resultado: Extract<ResultadoValidacionAcceso, { estado: 'rechazado' }>,
): RejectionCopy => {
  switch (resultado.codigo) {
    case 'NO_INSCRITO':
      return {
        title: 'Estudiante no inscrito',
        detail:
          resultado.motivo?.trim() ||
          'El estudiante no se encuentra inscrito en esta evaluación.',
        guidance: 'No autorice el ingreso para este examen.',
      }
    case 'NO_HABILITADO':
      return {
        title: 'Estudiante no habilitado',
        detail:
          resultado.motivo?.trim() ||
          'El estudiante no está habilitado para este examen.',
        guidance: 'Verifique la habilitación antes de permitir el ingreso.',
      }
    case 'INHABILITADO':
      return {
        title: 'Estudiante inhabilitado',
        detail:
          resultado.motivo?.trim() ||
          'El estudiante se encuentra inhabilitado para rendir este examen.',
        guidance: 'No autorice el ingreso mientras la inhabilitación permanezca vigente.',
      }
    case 'AULA_INCORRECTA':
      return {
        title: 'Aula incorrecta',
        detail: resultado.aulaCorrecta
          ? `Este examen se controla en ${resultado.aulaCorrecta}.`
          : resultado.motivo?.trim() ||
            'El estudiante debe dirigirse al aula asignada a su examen.',
        guidance: resultado.aulaCorrecta
          ? `Indique al estudiante que se dirija a ${resultado.aulaCorrecta}.`
          : 'Consulte el aula correcta antes de permitir el ingreso.',
      }
    case 'MATERIA_INCORRECTA':
      return {
        title: 'QR de otra materia',
        detail:
          resultado.motivo?.trim() ||
          'El código QR corresponde a una materia diferente a la evaluación seleccionada.',
        guidance: 'Verifique la materia y el examen seleccionados antes de continuar.',
      }
    case 'EXAMEN_DISTINTO':
      return {
        title: 'Corresponde a otro examen',
        detail: resultado.examenCorrecto
          ? `El estudiante está habilitado para ${resultado.examenCorrecto}, no para el examen actual.`
          : resultado.motivo?.trim() ||
            'El estudiante está habilitado para un examen diferente al seleccionado.',
        guidance: 'Seleccione el examen correcto o dirija al estudiante al control correspondiente.',
      }
    case 'EXAMEN_NO_ENCONTRADO':
      return {
        title: 'Examen no encontrado',
        detail:
          resultado.motivo?.trim() ||
          'No se encontró la evaluación solicitada.',
        guidance: 'Verifique el examen seleccionado antes de continuar.',
      }
    case 'QR_INVALIDO':
      return {
        title: 'Código QR no válido',
        detail:
          resultado.motivo?.trim() ||
          'El código escaneado no tiene un formato reconocido por el sistema.',
        guidance: 'Solicite al estudiante que presente su código QR de ingreso.',
      }
    case 'YA_INGRESO':
      return {
        title: 'Ingreso ya registrado',
        detail:
          resultado.motivo?.trim() ||
          'El estudiante ya registró previamente su ingreso a esta evaluación.',
        guidance: 'No registre un segundo ingreso para el mismo examen.',
      }
    case 'ERROR_VALIDACION':
      return {
        title: 'No se pudo validar el ingreso',
        detail:
          resultado.motivo?.trim() ||
          'El servicio de validación no respondió correctamente.',
        guidance: 'No autorice el ingreso hasta que la validación pueda completarse.',
      }
  }
}

export function ResultadoValidacionDialog({
  open,
  resultado,
  examen,
  onClose,
}: ResultadoValidacionDialogProps) {
  if (!resultado) return null

  const isAuthorized = resultado.estado === 'autorizado'
  const isRejected = resultado.estado === 'rechazado'
  const isDuplicate = isRejected && resultado.codigo === 'YA_INGRESO'
  const rejectionCopy = isRejected ? getRejectionCopy(resultado) : null
  const student = resultado.estado === 'pendiente' ? undefined : resultado.estudiante
  const visibleNorms = examen.normas?.slice(0, 3) ?? []
  const hiddenNormCount = Math.max((examen.normas?.length ?? 0) - visibleNorms.length, 0)

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-1.5rem)] max-w-xl overflow-y-auto rounded-2xl border-0 bg-card p-0 shadow-2xl sm:max-w-xl"
      >
        <section
          aria-live={isRejected ? 'assertive' : 'polite'}
          role={isRejected ? 'alert' : 'status'}
          className={`px-5 text-center text-white sm:px-7 ${isDuplicate ? 'py-4' : 'py-6'} ${
            isAuthorized
              ? 'bg-emerald-600'
              : isDuplicate
                ? 'bg-sci-amber'
                : isRejected
                  ? 'bg-sci-red'
                  : 'bg-sci-navy'
          }`}
        >
          <div
            className={`mx-auto grid place-items-center rounded-full bg-white/95 shadow-lg ${
              isDuplicate ? 'h-14 w-14' : 'h-16 w-16'
            }`}
          >
            {isAuthorized ? (
              <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
            ) : isDuplicate ? (
              <AlertTriangle className="h-8 w-8 text-sci-amber" aria-hidden="true" />
            ) : isRejected ? (
              <XCircle className="h-10 w-10 text-sci-red" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-10 w-10 text-sci-navy" aria-hidden="true" />
            )}
          </div>

          <DialogTitle
            className={`${isDuplicate ? 'mt-3' : 'mt-4'} text-2xl font-extrabold leading-tight text-white sm:text-3xl`}
          >
            {isAuthorized
              ? 'Ingreso autorizado'
              : isDuplicate
                ? 'Ingreso ya registrado'
                : isRejected
                  ? 'Ingreso rechazado'
                  : 'Código QR detectado'}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm font-medium text-white/90">
            {isAuthorized
              ? 'El ingreso fue validado y registrado correctamente.'
              : isDuplicate
                ? 'Ya existe un ingreso exitoso para este estudiante y examen.'
                : isRejected
                  ? 'No autorice el ingreso del estudiante.'
                  : 'Validando el código QR y la habilitación con el servidor.'}
          </DialogDescription>
        </section>

        <div className={`px-5 sm:px-7 ${isDuplicate ? 'space-y-3 py-4' : 'space-y-4 py-5'}`}>
          {isRejected && rejectionCopy && (
            <section
              className={`rounded-2xl border-2 text-center ${isDuplicate ? 'p-3' : 'p-4'} ${
                isDuplicate
                  ? 'border-sci-amber bg-sci-amber/10'
                  : 'border-sci-red bg-sci-red/5'
              }`}
            >
              <AlertTriangle
                className={`mx-auto ${isDuplicate ? 'h-6 w-6' : 'h-7 w-7'} ${
                  isDuplicate ? 'text-sci-amber' : 'text-sci-red'
                }`}
                aria-hidden="true"
              />
              <h2
                className={`mt-2 text-xl font-extrabold leading-tight sm:text-2xl ${
                  isDuplicate ? 'text-sci-amber' : 'text-sci-red'
                }`}
              >
                {rejectionCopy.title}
              </h2>
              <p className="mt-2 text-base font-bold leading-snug text-foreground">
                {rejectionCopy.detail}
              </p>
              {isDuplicate && resultado.primerIngreso && (
                <div className="mt-2 rounded-xl border border-sci-amber/40 bg-card px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Primer ingreso registrado
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-sci-navy">
                    {resultado.primerIngreso}
                  </p>
                </div>
              )}
              {rejectionCopy.guidance && (
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
                  {rejectionCopy.guidance}
                </p>
              )}
            </section>
          )}

          {isAuthorized && resultado.horaIngreso && (
            <section className="rounded-xl border border-emerald-600/30 bg-emerald-600/5 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Hora de ingreso registrada
              </p>
              <p className="mt-1 text-lg font-extrabold text-emerald-700">
                {resultado.horaIngreso}
              </p>
            </section>
          )}

          {student && (student.nombreCompleto || student.codigoSis) && (
            <section
              className={`flex items-center gap-3 rounded-xl border border-border bg-muted/30 ${
                isDuplicate ? 'p-2.5' : 'p-3'
              }`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sci-cyan/10">
                <UserRound className="h-5 w-5 text-sci-cyan" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Estudiante
                </p>
                {student.nombreCompleto && (
                  <p className="truncate text-sm font-bold text-sci-navy">{student.nombreCompleto}</p>
                )}
                {student.codigoSis && (
                  <p className="text-xs text-muted-foreground">Código SIS: {student.codigoSis}</p>
                )}
              </div>
            </section>
          )}

          <section
            aria-labelledby="exam-summary-title"
            className={`rounded-2xl border border-border bg-card ${isDuplicate ? 'p-3' : 'p-4'}`}
          >
            <div className={`${isDuplicate ? 'mb-2' : 'mb-3'} flex items-center gap-2`}>
              <ShieldCheck className="h-5 w-5 text-sci-cyan" aria-hidden="true" />
              <h2 id="exam-summary-title" className="text-sm font-extrabold text-sci-navy">
                Información del examen
              </h2>
            </div>

            <div className={`grid text-xs sm:grid-cols-2 ${isDuplicate ? 'gap-2' : 'gap-3'}`}>
              <div className={`flex gap-2 rounded-xl bg-muted/35 ${isDuplicate ? 'p-2.5' : 'p-3'}`}>
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-sci-cyan" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Asignatura
                  </p>
                  <p className="break-words font-bold leading-snug text-foreground">
                    {examen.materia?.nombre ?? examen.nombre}
                  </p>
                </div>
              </div>

              <div className={`flex gap-2 rounded-xl bg-muted/35 ${isDuplicate ? 'p-2.5' : 'p-3'}`}>
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sci-cyan" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Aula
                  </p>
                  <p className="font-bold text-foreground">
                    {examen.aula?.nombre ?? 'Aula por confirmar'}
                  </p>
                </div>
              </div>

              <div className={`flex gap-2 rounded-xl bg-muted/35 ${isDuplicate ? 'p-2.5' : 'p-3'}`}>
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-sci-cyan" aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Fecha
                  </p>
                  <p className="font-bold text-foreground">{formatDate(examen.fecha)}</p>
                </div>
              </div>

              <div className={`flex gap-2 rounded-xl bg-muted/35 ${isDuplicate ? 'p-2.5' : 'p-3'}`}>
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-sci-cyan" aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Horario
                  </p>
                  <p className="font-bold text-foreground">
                    {normalizeTime(examen.hora_ini)} - {normalizeTime(examen.hora_fin)}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${isDuplicate ? 'mt-2 pt-2' : 'mt-3 pt-3'} border-t border-border`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Normas aplicables
              </p>
              {visibleNorms.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {visibleNorms.map((norma) => (
                    <li key={norma.id} className="flex items-start gap-2 text-xs text-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sci-cyan" />
                      <span className="font-medium leading-relaxed">{norma.titulo}</span>
                    </li>
                  ))}
                  {hiddenNormCount > 0 && (
                    <li className="text-xs font-semibold text-muted-foreground">
                      +{hiddenNormCount} norma{hiddenNormCount === 1 ? '' : 's'} adicional
                      {hiddenNormCount === 1 ? '' : 'es'}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-1 text-xs italic text-muted-foreground">
                  No hay normas registradas para esta evaluación.
                </p>
              )}
            </div>
          </section>
        </div>

        <footer
          className={`border-t border-border bg-muted/30 px-5 sm:px-7 ${
            isDuplicate ? 'py-3' : 'py-4'
          }`}
        >
          <Button
            type="button"
            className="w-full bg-sci-blue font-bold text-white hover:opacity-90"
            onClick={onClose}
          >
            Continuar escaneando
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}

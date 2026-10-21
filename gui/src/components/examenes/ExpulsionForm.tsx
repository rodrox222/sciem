import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldAlert,
  UserRoundX,
} from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/services/api'
import {
  expulsionesService,
  type AsistenciaExpulsion,
  type RegistroExpulsionResponse,
} from '@/services/expulsiones.service'
import type { EstudianteInscritoExamen } from '@/services/estudiantes.service'
import type { Examen } from '@/services/examenes.service'

interface ExpulsionFormProps {
  exam: Examen
  estudiante: Pick<EstudianteInscritoExamen, 'id' | 'codigo_sis' | 'nombre_completo'>
  asistencia: AsistenciaExpulsion
  onRegistered?: (studentId: string) => void
}

const formatServerDateTime = (value: string) => {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'America/La_Paz',
  }).format(parsed)
}

export function ExpulsionForm({
  exam,
  estudiante,
  asistencia,
  onRegistered,
}: ExpulsionFormProps) {
  const [motivo, setMotivo] = useState('')
  const [touched, setTouched] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<RegistroExpulsionResponse | null>(null)

  const motivoLimpio = motivo.trim()
  const motivoError = useMemo(() => {
    if (!touched) return ''

    if (!motivoLimpio) return 'El motivo de expulsión es obligatorio.'
    if (motivoLimpio.length < 3) return 'El motivo debe tener al menos 3 caracteres.'
    if (motivoLimpio.length > 2000) return 'El motivo no puede superar los 2000 caracteres.'

    return ''
  }, [motivoLimpio, touched])

  const motivoValido =
    motivoLimpio.length >= 3 && motivoLimpio.length <= 2000

  const openConfirmation = () => {
    setTouched(true)
    setError('')

    if (!motivoValido) return

    setConfirmOpen(true)
  }

  const registerExpulsion = async () => {
    if (!motivoValido || submitting) return

    setSubmitting(true)
    setError('')

    try {
      const response = await expulsionesService.registrarExpulsion(exam.id, {
        id_estudiante: estudiante.id,
        motivo: motivoLimpio,
      })

      setSuccess(response)
      onRegistered?.(estudiante.id)
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(requestError.message)
      } else if (requestError instanceof Error) {
        setError(requestError.message)
      } else {
        setError('No se pudo registrar la expulsión. Intenta nuevamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <section
        className="space-y-3 rounded-2xl border border-emerald-600/25 bg-emerald-600/5 p-4"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-600/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-extrabold text-emerald-800">
              Expulsión registrada
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {success.message}
            </p>
          </div>
        </div>

        <div className="grid gap-2 rounded-xl border border-emerald-600/15 bg-card/80 p-3 text-[11px] sm:grid-cols-2">
          <div>
            <p className="font-semibold text-muted-foreground">Fecha y hora oficial</p>
            <p className="mt-0.5 flex items-center gap-1 font-bold text-foreground">
              <CalendarClock className="h-3.5 w-3.5 text-sci-cyan" />
              {formatServerDateTime(success.expulsion.fecha_hora)}
            </p>
          </div>

          <div>
            <p className="font-semibold text-muted-foreground">Responsable</p>
            <p className="mt-0.5 font-bold text-foreground">
              {success.expulsion.responsable.nombre}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {success.expulsion.responsable.rol}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/80 p-3 text-[11px]">
          <p className="font-semibold text-muted-foreground">Motivo registrado</p>
          <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-foreground">
            {success.expulsion.motivo}
          </p>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="space-y-4 border-t border-border pt-4">
        <div>
          <h4 className="flex items-center gap-2 text-xs font-extrabold text-sci-navy">
            <FileText className="h-4 w-4 text-sci-cyan" aria-hidden="true" />
            Registrar expulsión
          </h4>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Describe claramente el motivo del incidente. La fecha, hora y responsable serán
            registrados por el servidor.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-3 text-[11px]">
          <p className="font-semibold text-muted-foreground">Examen</p>
          <p className="mt-0.5 font-bold text-foreground">{exam.nombre}</p>
          <p className="mt-1 text-muted-foreground">
            Ingreso verificado: {asistencia.fecha_ingreso} · {asistencia.hora_ingreso}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="motivo-expulsion"
              className="text-[11px] font-bold text-foreground"
            >
              Motivo de la expulsión <span className="text-sci-red">*</span>
            </label>
            <span
              className={`text-[10px] ${
                motivo.length > 2000 ? 'font-bold text-sci-red' : 'text-muted-foreground'
              }`}
            >
              {motivo.length}/2000
            </span>
          </div>

          <Textarea
            id="motivo-expulsion"
            value={motivo}
            onChange={(event) => {
              setMotivo(event.target.value)
              setError('')
            }}
            onBlur={() => setTouched(true)}
            placeholder="Ej.: Uso de material no autorizado durante la evaluación..."
            className="min-h-28 resize-y bg-background text-xs"
            aria-invalid={Boolean(motivoError)}
            disabled={submitting}
            maxLength={2001}
          />

          {motivoError && (
            <p className="flex items-center gap-1 text-[11px] font-semibold text-sci-red">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              {motivoError}
            </p>
          )}
        </div>

        {error && (
          <div
            className="flex items-start gap-2 rounded-xl border border-sci-red/20 bg-sci-red/10 p-3 text-[11px] text-sci-red"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">No se pudo registrar la expulsión.</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <Button
          type="button"
          onClick={openConfirmation}
          disabled={submitting}
          className="w-full cursor-pointer bg-sci-red text-xs font-bold text-white hover:bg-sci-red/90"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <UserRoundX className="h-4 w-4" />
              Registrar expulsión
            </>
          )}
        </Button>
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-sci-red/10">
              <AlertTriangle className="text-sci-red" aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Confirmar expulsión</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción registrará la expulsión de{' '}
              <strong>{estudiante.nombre_completo}</strong> del examen{' '}
              <strong>{exam.nombre}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-xl border border-border bg-muted/30 p-3 text-[11px]">
            <p className="font-semibold text-muted-foreground">Motivo</p>
            <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-foreground">
              {motivoLimpio}
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={submitting}
              onClick={() => void registerExpulsion()}
            >
              Confirmar expulsión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

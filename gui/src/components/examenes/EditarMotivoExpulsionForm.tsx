import { useState } from 'react'
import { AlertTriangle, Loader2, PencilLine } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { verificarHorarioExpulsion } from '@/components/examenes/horarioExpulsion'
import { ApiError } from '@/services/api'
import { expulsionesService, type ExpulsionHistorial } from '@/services/expulsiones.service'
import type { Examen } from '@/services/examenes.service'

type Props = {
  exam: Examen
  registro: ExpulsionHistorial
  horarioPermitido: boolean
  desfaseServidor?: number
  onSubmittingChange?: (busy: boolean) => void
  onCancel: () => void
  onSaved: (registro: ExpulsionHistorial) => void
}

/** Interfaz preparada para PATCH; el servidor debe implementar la operación de edición. */
export function EditarMotivoExpulsionForm({ exam, registro, horarioPermitido, desfaseServidor = 0, onSubmittingChange, onCancel, onSaved }: Props) {
  const [motivo, setMotivo] = useState(registro.motivo)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const motivoLimpio = motivo.trim()
  const motivoOriginal = registro.motivo.trim()
  const valido = motivoLimpio.length >= 3 && motivoLimpio.length <= 2000 && motivoLimpio !== motivoOriginal

  const confirmarEdicion = () => {
    setError('')
    if (motivoLimpio.length < 3 || motivoLimpio.length > 2000) {
      setError('El motivo debe contener entre 3 y 2000 caracteres.')
      return
    }
    if (motivoLimpio === motivoOriginal) {
      setError('El motivo no ha cambiado.')
      return
    }
    const horario = verificarHorarioExpulsion(exam, new Date(Date.now() + desfaseServidor))
    if (!horario.permitido) {
      setError(horario.mensaje)
      return
    }
    setConfirmOpen(true)
  }

  const guardar = async () => {
    if (submitting || !valido) return
    const horario = verificarHorarioExpulsion(exam, new Date(Date.now() + desfaseServidor))
    if (!horario.permitido) {
      setConfirmOpen(false)
      setError(horario.mensaje)
      return
    }
    setSubmitting(true)
    onSubmittingChange?.(true)
    setError('')
    try {
      const respuesta = await expulsionesService.editarMotivo(exam.id, registro.id, { motivo: motivoLimpio })
      // Solo actualizamos el listado si el backend realmente confirmó la edición.
      if (!respuesta?.expulsion?.id || respuesta.expulsion.id !== registro.id) {
        throw new Error('El servidor no confirmó la actualización del motivo.')
      }
      onSaved(respuesta.expulsion)
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        setError('El registro ya no está disponible para editar. Actualiza el historial.')
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('No se pudo actualizar el motivo. No se guardó ningún cambio.')
      }
    } finally {
      setSubmitting(false)
      onSubmittingChange?.(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="space-y-4 text-xs">
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="font-semibold text-muted-foreground">Motivo registrado actualmente</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{registro.motivo}</p>
      </div>
      <div className="space-y-2">
        <label htmlFor="editar-motivo-expulsion" className="font-bold text-sci-navy">
          Nuevo motivo de expulsión
        </label>
        <Textarea
          id="editar-motivo-expulsion"
          value={motivo}
          onChange={(event) => { setMotivo(event.target.value); setError('') }}
          maxLength={2001}
          disabled={submitting || !horarioPermitido}
          className="min-h-28 resize-y"
          aria-invalid={Boolean(error)}
        />
        <p className="text-right text-[11px] text-muted-foreground">{motivo.length}/2000</p>
      </div>
      {!horarioPermitido && (
        <p role="status" className="rounded-xl border border-sci-amber/30 bg-sci-amber/10 p-3 text-sci-navy">
          La edición solo está permitida durante el horario del examen. Puedes consultar el motivo, pero no modificarlo.
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-sci-red/20 bg-sci-red/10 p-3 text-sci-red">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" type="button" onClick={onCancel} disabled={submitting}>Cancelar</Button>
        <Button type="button" onClick={confirmarEdicion} disabled={!valido || !horarioPermitido || submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4" />}
          Guardar cambio
        </Button>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!submitting) setConfirmOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambio de motivo</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción debe conservar quién registró la expulsión originalmente, y registrar al editor,
              la hora oficial y el motivo anterior en el historial de auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs">
            <p className="font-bold text-muted-foreground">Nuevo motivo</p>
            <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words">{motivoLimpio}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void guardar() }} disabled={submitting || !horarioPermitido}>
              {submitting ? 'Guardando...' : 'Confirmar edición'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

import { useState } from 'react'
import { AlertCircle, LoaderCircle, UserX, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Estudiante } from '@/services/estudiantes.service'

interface InhabilitarEstudianteModalProps {
  estudiante: Estudiante
  examName: string
  onClose: () => void
  onSubmit: (motivo: string) => Promise<void>
}

const fullName = (student: Estudiante) =>
  [student.nombre, student.apellido_paterno, student.apellido_materno]
    .filter(Boolean)
    .join(' ')

export function InhabilitarEstudianteModal({
  estudiante,
  examName,
  onClose,
  onSubmit,
}: InhabilitarEstudianteModalProps) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    const motivoLimpio = motivo.trim()

    if (!motivoLimpio) {
      setError('El motivo de inhabilitación es obligatorio.')
      return
    }

    setError('')
    setSaving(true)

    try {
      await onSubmit(motivoLimpio)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo inhabilitar al estudiante.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Encabezado */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-sci-red/10 p-2">
              <UserX className="h-5 w-5 text-sci-red" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sci-red">
                Gestión académica
              </span>

              <h2 className="mt-1 text-xl font-bold text-sci-navy">
                Inhabilitar estudiante
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Registra el motivo por el cual el estudiante no podrá rendir este examen.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Contenido */}
        <div className="space-y-5 p-6">
          {/* Información del estudiante */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-bold text-sci-navy">
              {fullName(estudiante)}
            </p>

            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span>SIS: {estudiante.codigo_sis}</span>

              <span>
                CI: {estudiante.ci}
                {estudiante.ci_extension
                  ? ` ${estudiante.ci_extension}`
                  : ''}
              </span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Examen: <span className="font-semibold text-foreground">{examName}</span>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3 text-xs font-semibold text-sci-red">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Motivo */}
          <div>
            <Label
              htmlFor="motivo-inhabilitacion"
              className="mb-1.5 block text-xs font-semibold"
            >
              Motivo de inhabilitación <span className="text-sci-red">*</span>
            </Label>

            <Textarea
              id="motivo-inhabilitacion"
              value={motivo}
              onChange={(event) => {
                setMotivo(event.target.value)

                if (error) {
                  setError('')
                }
              }}
              placeholder="Escriba el motivo de inhabilitación..."
              rows={5}
              disabled={saving}
              className="resize-none bg-background"
            />

            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Este motivo quedará asociado al estudiante y al examen.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/40 px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="cursor-pointer bg-sci-red font-semibold text-white hover:opacity-90"
          >
            {saving && (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            )}

            {saving ? 'Inhabilitando...' : 'Inhabilitar estudiante'}
          </Button>
        </div>
      </div>
    </div>
  )
}
import { useState, type FormEvent } from 'react'
import { Info, LoaderCircle } from 'lucide-react'

import type {
  EstadoInscripcion,
  Estudiante,
  InscripcionPayload,
} from '../../services/estudiantes.service'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

interface EstudianteFormModalProps {
  estudiante?: Estudiante | null
  examMode?: boolean
  onClose: () => void
  onSubmit: (payload: InscripcionPayload) => Promise<void>
}

interface FormState {
  nombre: string
  apellido_paterno: string
  apellido_materno: string
  codigo_sis: string
  ci: string
  ci_extension: string
  email_institucional: string
  estado: EstadoInscripcion
}

const createInitialState = (student?: Estudiante | null): FormState => ({
  nombre: student?.nombre ?? '',
  apellido_paterno: student?.apellido_paterno ?? '',
  apellido_materno: student?.apellido_materno ?? '',
  codigo_sis: student?.codigo_sis ?? '',
  ci: student?.ci ?? '',
  ci_extension: student?.ci_extension ?? '',
  email_institucional: student?.email_institucional ?? '',
  estado: student?.pivot?.estado ?? 'Habilitado',
})

export function EstudianteFormModal({
  estudiante,
  examMode = false,
  onClose,
  onSubmit,
}: EstudianteFormModalProps) {
  const [form, setForm] = useState<FormState>(() => createInitialState(estudiante))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [saving, setSaving] = useState(false)

  const editing = Boolean(estudiante)

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!form.nombre.trim()) nextErrors.nombre = 'El nombre es obligatorio.'
    if (!form.apellido_paterno.trim()) {
      nextErrors.apellido_paterno = 'El apellido paterno es obligatorio.'
    }
    if (!form.codigo_sis.trim()) nextErrors.codigo_sis = 'El código SIS es obligatorio.'
    if (!form.ci.trim()) nextErrors.ci = 'El carnet de identidad es obligatorio.'
    else if (!/^\d+[A-Za-z]?$/.test(form.ci.trim())) {
      nextErrors.ci = 'Usa números y, opcionalmente, una sola letra al final.'
    }
    if (!form.email_institucional.trim()) {
      nextErrors.email_institucional = 'El correo institucional es obligatorio.'
    } else if (!/^[0-9]+@est\.umss\.edu$/i.test(form.email_institucional.trim())) {
      nextErrors.email_institucional = 'Ingresa el código SIS numérico seguido de @est.umss.edu.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setGeneralError('')
    if (!validate()) return

    try {
      setSaving(true)
      await onSubmit({
        nombre: form.nombre.trim(),
        apellido_paterno: form.apellido_paterno.trim(),
        apellido_materno: form.apellido_materno.trim() || null,
        codigo_sis: form.codigo_sis.trim(),
        ci: form.ci.trim().toUpperCase(),
        ci_extension: form.ci_extension.trim() || null,
        email_institucional: form.email_institucional.trim().toLowerCase(),
        activo: true,
        estado: form.estado,
      })
      onClose()
    } catch (error) {
      setGeneralError(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado al guardar al estudiante.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !saving && !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-border bg-card text-card-foreground shadow-2xl rounded-2xl">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader className="border-b border-border px-6 py-5 text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sci-cyan">
              Gestión de estudiantes
            </span>
            <DialogTitle className="mt-1 text-2xl font-bold text-sci-navy">
              {editing ? 'Actualizar estudiante' : 'Registrar estudiante'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {examMode
                ? 'Los datos quedarán vinculados al examen seleccionado.'
                : 'El registro se almacenará en el padrón institucional.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-6 max-h-[65vh] overflow-y-auto">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="std-nombre" className="text-xs font-semibold">
                  Nombre *
                </Label>
                <Input
                  id="std-nombre"
                  autoFocus
                  value={form.nombre}
                  maxLength={100}
                  onChange={(event) => setField('nombre', event.target.value)}
                  placeholder="Ej. Carlos"
                  className={`h-11 ${errors.nombre ? 'border-sci-red' : ''}`}
                />
                {errors.nombre && <p className="text-xs text-sci-red font-medium">{errors.nombre}</p>}
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="std-paterno" className="text-xs font-semibold">
                  Apellido paterno *
                </Label>
                <Input
                  id="std-paterno"
                  value={form.apellido_paterno}
                  maxLength={100}
                  onChange={(event) => setField('apellido_paterno', event.target.value)}
                  placeholder="Ej. Vargas"
                  className={`h-11 ${errors.apellido_paterno ? 'border-sci-red' : ''}`}
                />
                {errors.apellido_paterno && (
                  <p className="text-xs text-sci-red font-medium">{errors.apellido_paterno}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="std-materno" className="text-xs font-semibold">
                Apellido materno
              </Label>
              <Input
                id="std-materno"
                value={form.apellido_materno}
                maxLength={100}
                onChange={(event) => setField('apellido_materno', event.target.value)}
                placeholder="Ej. Flores"
                className="h-11"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="std-sis" className="text-xs font-semibold">
                  Código SIS *
                </Label>
                <Input
                  id="std-sis"
                  value={form.codigo_sis}
                  maxLength={20}
                  inputMode="numeric"
                  onChange={(event) => setField('codigo_sis', event.target.value)}
                  placeholder="Ej. 202104589"
                  className={`h-11 ${errors.codigo_sis ? 'border-sci-red' : ''}`}
                />
                {errors.codigo_sis && (
                  <p className="text-xs text-sci-red font-medium">{errors.codigo_sis}</p>
                )}
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="std-ci" className="text-xs font-semibold">
                  Carnet de identidad *
                </Label>
                <Input
                  id="std-ci"
                  value={form.ci}
                  maxLength={20}
                  autoCapitalize="characters"
                  onChange={(event) => setField('ci', event.target.value)}
                  placeholder="Ej. 8234567"
                  className={`h-11 ${errors.ci ? 'border-sci-red' : ''}`}
                />
                {errors.ci && <p className="text-xs text-sci-red font-medium">{errors.ci}</p>}
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="std-ext" className="text-xs font-semibold">
                Complemento o extensión del CI
              </Label>
              <Input
                id="std-ext"
                value={form.ci_extension}
                maxLength={10}
                onChange={(event) => setField('ci_extension', event.target.value)}
                placeholder="Ej. CB"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="std-email" className="text-xs font-semibold">
                Correo institucional *
              </Label>
              <Input
                id="std-email"
                type="email"
                value={form.email_institucional}
                maxLength={150}
                onChange={(event) => setField('email_institucional', event.target.value)}
                placeholder="Ej. 202104589@est.umss.edu"
                className={`h-11 ${errors.email_institucional ? 'border-sci-red' : ''}`}
              />
              {errors.email_institucional && (
                <p className="text-xs text-sci-red font-medium">{errors.email_institucional}</p>
              )}
            </div>

            {examMode && (
              <div className="space-y-1.5 text-left">
                <Label htmlFor="std-estado" className="text-xs font-semibold">
                  Estado en el examen *
                </Label>
                <select
                  id="std-estado"
                  value={form.estado}
                  onChange={(event) => setField('estado', event.target.value as EstadoInscripcion)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
                >
                  <option value="Habilitado">Habilitado</option>
                  <option value="Inhabilitado">Inhabilitado</option>
                </select>
              </div>
            )}

            {generalError && (
              <div className="rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3 text-xs text-sci-red font-semibold">
                {generalError}
              </div>
            )}

            <div className="flex gap-3 rounded-xl border border-sci-cyan/20 bg-sci-cyan/10 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 text-sci-cyan mt-0.5" />
              <p>El código SIS identifica de forma unívoca a cada estudiante en los registros de la facultad.</p>
            </div>
          </div>

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
              type="submit"
              disabled={saving}
              className="bg-sci-blue hover:opacity-90 text-white font-semibold cursor-pointer min-w-36"
            >
              {saving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar estudiante'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
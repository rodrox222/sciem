import { useState, type FormEvent } from 'react'
import { Info, LoaderCircle } from 'lucide-react'
import type {
  EstadoInscripcion,
  Estudiante,
  InscripcionPayload,
} from '@/services/estudiantes.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  estado: EstadoInscripcion
}

const createInitialState = (student?: Estudiante | null): FormState => ({
  nombre: student?.nombre ?? '',
  apellido_paterno: student?.apellido_paterno ?? '',
  apellido_materno: student?.apellido_materno ?? '',
  codigo_sis: student?.codigo_sis ?? '',
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
    if (!form.apellido_paterno.trim()) nextErrors.apellido_paterno = 'El apellido paterno es obligatorio.'
    if (!form.codigo_sis.trim()) nextErrors.codigo_sis = 'El código SIS es obligatorio.'
    else if (!/^\d+$/.test(form.codigo_sis.trim())) {
      nextErrors.codigo_sis = 'El código SIS debe contener solo números.'
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
      const sis = form.codigo_sis.trim()
      const emailAutogenerado = `${sis}@est.umss.edu`

      await onSubmit({
        nombre: form.nombre.trim(),
        apellido_paterno: form.apellido_paterno.trim(),
        apellido_materno: form.apellido_materno.trim() || null,
        codigo_sis: sis,
        ci: estudiante?.ci ?? null,
        ci_extension: estudiante?.ci_extension ?? null,
        email_institucional: emailAutogenerado,
        activo: true,
        estado: form.estado,
      })
      onClose()
    } catch (error) {
      setGeneralError(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado al guardar al estudiante.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !saving && !open && onClose()}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1rem)] max-w-xl flex-col overflow-hidden rounded-2xl border-border bg-card p-0 text-card-foreground shadow-2xl">
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col overflow-hidden">
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

          <div className="max-h-[calc(90dvh-190px)] space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="std-nombre" className="text-xs font-semibold">
                  Nombre(s) *
                </Label>
                <Input
                  id="std-nombre"
                  autoFocus
                  value={form.nombre}
                  maxLength={100}
                  onChange={(e) => setField('nombre', e.target.value)}
                  placeholder="Ej. Carlos"
                  className={`h-11 ${errors.nombre ? 'border-sci-red' : ''}`}
                />
                {errors.nombre && <p className="text-xs font-medium text-sci-red">{errors.nombre}</p>}
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="std-paterno" className="text-xs font-semibold">
                  Apellido paterno *
                </Label>
                <Input
                  id="std-paterno"
                  value={form.apellido_paterno}
                  maxLength={100}
                  onChange={(e) => setField('apellido_paterno', e.target.value)}
                  placeholder="Ej. Vargas"
                  className={`h-11 ${errors.apellido_paterno ? 'border-sci-red' : ''}`}
                />
                {errors.apellido_paterno && (
                  <p className="text-xs font-medium text-sci-red">{errors.apellido_paterno}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="std-materno" className="text-xs font-semibold">
                Apellido materno (opcional)
              </Label>
              <Input
                id="std-materno"
                value={form.apellido_materno}
                maxLength={100}
                onChange={(e) => setField('apellido_materno', e.target.value)}
                placeholder="Ej. Flores"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="std-sis" className="text-xs font-semibold">
                Código SIS *
              </Label>
              <Input
                id="std-sis"
                value={form.codigo_sis}
                maxLength={20}
                inputMode="numeric"
                onChange={(e) => setField('codigo_sis', e.target.value)}
                placeholder="Ej. 202104589"
                className={`h-11 ${errors.codigo_sis ? 'border-sci-red' : ''}`}
              />
              {errors.codigo_sis ? (
                <p className="text-xs font-medium text-sci-red">{errors.codigo_sis}</p>
              ) : (
                form.codigo_sis.trim() && (
                  <p className="text-[11px] text-muted-foreground">
                    Correo institucional: <strong className="text-sci-navy">{form.codigo_sis.trim()}@est.umss.edu</strong>
                  </p>
                )
              )}
            </div>

            {examMode && (
              <div className="space-y-1.5 text-left">
                <Label htmlFor="std-estado" className="text-xs font-semibold">
                  Estado en el examen *
                </Label>
                <Select
                  value={form.estado}
                  onValueChange={(val) => setField('estado', val as EstadoInscripcion)}
                >
                  <SelectTrigger id="std-estado" className="h-11 w-full rounded-xl">
                    <SelectValue placeholder="Seleccione el estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Habilitado">Habilitado</SelectItem>
                    <SelectItem value="Inhabilitado">Inhabilitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {generalError && (
              <div className="rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3 text-xs font-semibold text-sci-red">
                {generalError}
              </div>
            )}

            <div className="flex gap-3 rounded-xl border border-sci-cyan/20 bg-sci-cyan/10 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sci-cyan" />
              <p>
                El carnet de identidad no se solicita en este formulario; el estudiante lo completa en su perfil al ingresar.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted/40 px-5 py-3 sm:flex-row sm:justify-end">
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
              className="min-w-36 bg-sci-blue font-semibold text-white hover:opacity-90 cursor-pointer"
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
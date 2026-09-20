import { useState, type FormEvent } from 'react'
import { Info, LoaderCircle } from 'lucide-react'

import type { Aula, AulaEstado, AulaPayload } from '../../services/aulas.service'
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

interface AulaFormModalProps {
  aula?: Aula | null
  onOpenChange: (open: boolean) => void
  onSubmit: (data: AulaPayload) => Promise<void>
}

interface FormState {
  nombre: string
  ubicacion: string
  capacidad: string
  estado: AulaEstado
}

const createInitialState = (aula?: Aula | null): FormState => ({
  nombre: aula?.nombre ?? '',
  ubicacion: aula?.ubicacion ?? '',
  capacidad: aula ? String(aula.capacidad) : '',
  estado: aula?.estado ?? 'Disponible',
})

export function AulaFormModal({
  aula,
  onOpenChange,
  onSubmit,
}: AulaFormModalProps) {
  const [form, setForm] = useState<FormState>(() => createInitialState(aula))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [saving, setSaving] = useState(false)

  const editando = Boolean(aula)

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: '' }))
  }

  const validate = () => {
    const errors: Record<string, string> = {}
    const capacidad = Number(form.capacidad)

    if (!form.nombre.trim()) errors.nombre = 'El nombre del ambiente es obligatorio.'
    if (!form.ubicacion.trim()) errors.ubicacion = 'La ubicación es obligatoria.'
    if (!form.capacidad || !Number.isInteger(capacidad) || capacidad < 1) {
      errors.capacidad = 'Ingresa un número entero mayor a 0.'
    } else if (capacidad > 32767) {
      errors.capacidad = 'La capacidad máxima permitida es 32767.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setGeneralError('')

    if (!validate()) return

    try {
      setSaving(true)
      await onSubmit({
        nombre: form.nombre.trim(),
        ubicacion: form.ubicacion.trim(),
        capacidad: Number(form.capacidad),
        estado: form.estado,
      })
      onOpenChange(false)
    } catch (error) {
      setGeneralError(
        error instanceof Error ? error.message : 'Ocurrió un error inesperado al guardar el ambiente.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !saving && onOpenChange(open)}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-border bg-card text-card-foreground shadow-2xl rounded-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border px-6 py-5 text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sci-cyan">
              Catálogo de aulas
            </span>
            <DialogTitle className="mt-1 text-2xl font-bold text-sci-navy">
              {editando ? 'Editar ambiente' : 'Registrar ambiente'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Completa los datos técnicos del ambiente para programar exámenes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-6">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="aula-nombre" className="text-xs font-semibold">
                Código o nombre *
              </Label>
              <Input
                id="aula-nombre"
                autoFocus
                maxLength={50}
                value={form.nombre}
                onChange={(event) => setField('nombre', event.target.value)}
                placeholder="Ej. AULA-623"
                className={`h-11 ${fieldErrors.nombre ? 'border-sci-red' : ''}`}
              />
              {fieldErrors.nombre && (
                <p className="text-xs text-sci-red font-medium">{fieldErrors.nombre}</p>
              )}
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="aula-ubicacion" className="text-xs font-semibold">
                Ubicación *
              </Label>
              <Input
                id="aula-ubicacion"
                maxLength={100}
                value={form.ubicacion}
                onChange={(event) => setField('ubicacion', event.target.value)}
                placeholder="Ej. Edificio de Tecnología, piso 6"
                className={`h-11 ${fieldErrors.ubicacion ? 'border-sci-red' : ''}`}
              />
              {fieldErrors.ubicacion && (
                <p className="text-xs text-sci-red font-medium">{fieldErrors.ubicacion}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="aula-capacidad" className="text-xs font-semibold">
                  Capacidad *
                </Label>
                <Input
                  id="aula-capacidad"
                  type="number"
                  onWheel={(event) => event.currentTarget.blur()}
                  min="1"
                  max="32767"
                  value={form.capacidad}
                  onChange={(event) => setField('capacidad', event.target.value)}
                  placeholder="Ej. 52"
                  className={`h-11 ${fieldErrors.capacidad ? 'border-sci-red' : ''}`}
                />
                {fieldErrors.capacidad && (
                  <p className="text-xs text-sci-red font-medium">{fieldErrors.capacidad}</p>
                )}
              </div>

              {editando && (
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="aula-estado" className="text-xs font-semibold">
                    Estado *
                  </Label>
                  <select
                    id="aula-estado"
                    value={form.estado}
                    onChange={(event) =>
                      setField('estado', event.target.value as AulaEstado)
                    }
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Ocupada">Ocupada</option>
                  </select>
                </div>
              )}
            </div>

            {generalError && (
              <div className="rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3 text-xs text-sci-red font-semibold">
                {generalError}
              </div>
            )}

            <div className="flex gap-3 rounded-xl border border-sci-cyan/20 bg-sci-cyan/10 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 text-sci-cyan mt-0.5" />
              <p>
                Los datos se guardarán en el catálogo institucional y estarán disponibles al programar evaluaciones.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/40 px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-sci-blue hover:opacity-90 text-white font-semibold cursor-pointer min-w-32"
            >
              {saving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {saving
                ? 'Guardando...'
                : editando
                ? 'Guardar cambios'
                : 'Registrar ambiente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
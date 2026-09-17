import { useState, type FormEvent } from 'react'
import { Info, LoaderCircle, X } from 'lucide-react'

import type {
  Aula,
  AulaEstado,
  AulaPayload,
} from '../../services/aulas.service'
import { ApiError } from '../../services/apiClient'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

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
      if (error instanceof ApiError) {
        const apiErrors = Object.fromEntries(
          Object.entries(error.errors ?? {}).map(([key, messages]) => [
            key,
            messages[0] ?? '',
          ]),
        )
        setFieldErrors((current) => ({ ...current, ...apiErrors }))
        setGeneralError(error.message)
      } else {
        setGeneralError('Ocurrió un error inesperado al guardar el ambiente.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/45 px-4 py-6 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onOpenChange(false)
      }}
      role="presentation"
    >
      <section
        aria-labelledby="aula-modal-title"
        aria-modal="true"
        className="w-full max-w-xl overflow-hidden rounded-2xl border-t-4 border-[#168FBD] bg-white shadow-2xl"
        role="dialog"
      >
        <form onSubmit={handleSubmit}>
          <header className="flex items-start justify-between border-b border-[#E2E8F0] px-5 py-5 sm:px-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#168FBD]">
                Catálogo de aulas
              </p>
              <h2
                id="aula-modal-title"
                className="mt-1 text-2xl font-bold text-[#003770]"
              >
                {editando ? 'Editar ambiente' : 'Registrar ambiente'}
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Completa los datos usados para programar los exámenes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#64748B] transition hover:bg-[#F7F7F7] hover:text-[#003770] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Cerrar formulario"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="space-y-5 px-5 py-5 sm:px-7">
            <div className="space-y-2">
              <Label htmlFor="aula-nombre">Código o nombre *</Label>
              <Input
                id="aula-nombre"
                autoFocus
                maxLength={50}
                value={form.nombre}
                onChange={(event) => setField('nombre', event.target.value)}
                placeholder="Ej. AULA-623"
                aria-invalid={Boolean(fieldErrors.nombre)}
                className="h-11"
              />
              {fieldErrors.nombre && (
                <p className="text-sm text-[#E30613]">{fieldErrors.nombre}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="aula-ubicacion">Ubicación *</Label>
              <Input
                id="aula-ubicacion"
                maxLength={100}
                value={form.ubicacion}
                onChange={(event) => setField('ubicacion', event.target.value)}
                placeholder="Ej. Edificio de Tecnología, piso 6"
                aria-invalid={Boolean(fieldErrors.ubicacion)}
                className="h-11"
              />
              {fieldErrors.ubicacion && (
                <p className="text-sm text-[#E30613]">{fieldErrors.ubicacion}</p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="aula-capacidad">Capacidad *</Label>
                <Input
                  id="aula-capacidad"
                  type="number"
                  min="1"
                  max="32767"
                  value={form.capacidad}
                  onChange={(event) => setField('capacidad', event.target.value)}
                  placeholder="Ej. 52"
                  aria-invalid={Boolean(fieldErrors.capacidad)}
                  className="h-11"
                />
                {fieldErrors.capacidad && (
                  <p className="text-sm text-[#E30613]">{fieldErrors.capacidad}</p>
                )}
              </div>

              {editando && (
                <div className="space-y-2">
                  <Label htmlFor="aula-estado">Estado *</Label>
                  <select
                    id="aula-estado"
                    value={form.estado}
                    onChange={(event) =>
                      setField('estado', event.target.value as AulaEstado)
                    }
                    className="h-11 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-sm text-[#1E293B] outline-none transition focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/20"
                  >
                    <option value="Disponible">Disponible</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Ocupada">Ocupada</option>
                  </select>
                </div>
              )}
            </div>

            {generalError && (
              <div
                className="rounded-lg border border-[#E30613]/25 bg-[#E30613]/5 px-4 py-3 text-sm text-[#B0040E]"
                role="alert"
              >
                {generalError}
              </div>
            )}

            <div className="flex gap-3 rounded-lg border border-[#168FBD]/20 bg-[#168FBD]/8 px-4 py-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#168FBD]" />
              <p className="text-sm text-[#1E536E]">
                Los datos se guardarán en el catálogo institucional y estarán
                disponibles al programar exámenes.
              </p>
            </div>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-[#E2E8F0] bg-[#F7F7F7] px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-11"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={saving}
              className="h-11 min-w-36 bg-[#0056B3] text-white hover:bg-[#003770]"
            >
              {saving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {saving
                ? 'Guardando...'
                : editando
                  ? 'Guardar cambios'
                  : 'Registrar ambiente'}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { Info, LoaderCircle, X } from 'lucide-react'

import type {
  Norma as ApiNorma,
  NormaPayload,
  NormaTipo as ApiNormaTipo,
} from '../../services/normas.service'
import { ApiError } from '../../services/apiClient'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

// Compatibilidad temporal con las pantallas de programación existentes.
// Esas pantallas serán migradas al contrato UUID durante la HU-06.
export type NormaTipo = ApiNormaTipo
export type NormaEstado = 'Activo' | 'Inactivo'
export interface Norma {
  id: number
  titulo?: string
  descripcion: string
  tipo: NormaTipo
  estado: NormaEstado
}

interface NormaFormModalProps {
  norma?: ApiNorma | null
  onOpenChange: (open: boolean) => void
  onSubmit: (data: NormaPayload) => Promise<void>
}

export function NormaFormModal({
  norma,
  onOpenChange,
  onSubmit,
}: NormaFormModalProps) {
  const [titulo, setTitulo] = useState(norma?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(norma?.descripcion ?? '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [saving, setSaving] = useState(false)

  const editando = Boolean(norma)

  const validate = () => {
    const errors: Record<string, string> = {}

    if (!titulo.trim()) errors.titulo = 'El título es obligatorio.'
    if (!descripcion.trim()) {
      errors.descripcion = 'La descripción es obligatoria y no puede contener solo espacios.'
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
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo: 'General',
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
        setGeneralError('Ocurrió un error inesperado al guardar la norma.')
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
        aria-labelledby="norma-modal-title"
        aria-modal="true"
        className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-2xl border-t-4 border-[#D59A18] bg-white shadow-2xl"
        role="dialog"
      >
        <form onSubmit={handleSubmit}>
          <header className="flex items-start justify-between border-b border-[#E2E8F0] px-5 py-5 sm:px-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D59A18]">
                Catálogo institucional
              </p>
              <h2
                id="norma-modal-title"
                className="mt-1 text-2xl font-bold text-[#003770]"
              >
                {editando ? 'Editar norma' : 'Registrar norma'}
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Esta norma general quedará disponible para los exámenes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#64748B] transition hover:bg-[#F7F7F7] hover:text-[#003770] disabled:opacity-50"
              aria-label="Cerrar formulario"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="space-y-5 px-5 py-5 sm:px-7">
            <div className="space-y-2">
              <Label htmlFor="norma-titulo">Título *</Label>
              <Input
                id="norma-titulo"
                autoFocus
                maxLength={150}
                value={titulo}
                onChange={(event) => {
                  setTitulo(event.target.value)
                  setFieldErrors((current) => ({ ...current, titulo: '' }))
                }}
                placeholder="Ej. Normas para exámenes finales"
                className="h-11"
                aria-invalid={Boolean(fieldErrors.titulo)}
              />
              <div className="flex justify-between gap-3">
                <p className="text-sm text-[#E30613]">{fieldErrors.titulo}</p>
                <span className="text-xs text-[#64748B]">{titulo.length}/150</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="norma-descripcion">Descripción *</Label>
              <textarea
                id="norma-descripcion"
                value={descripcion}
                onChange={(event) => {
                  setDescripcion(event.target.value)
                  setFieldErrors((current) => ({ ...current, descripcion: '' }))
                }}
                placeholder="Describe claramente la regla que deberá aplicarse..."
                rows={6}
                className="min-h-40 w-full resize-y rounded-md border border-[#E2E8F0] bg-white px-3 py-3 text-sm leading-relaxed text-[#1E293B] outline-none transition placeholder:text-[#64748B] focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/20"
                aria-invalid={Boolean(fieldErrors.descripcion)}
              />
              {fieldErrors.descripcion && (
                <p className="text-sm text-[#E30613]">{fieldErrors.descripcion}</p>
              )}
            </div>

            <p className="text-sm text-[#64748B]">Tipo: General. Las normas particulares se crean dentro de un examen.</p>

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
                Esta norma general podrá seleccionarse durante la programación de un examen.
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
                  : 'Registrar norma'}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  )
}

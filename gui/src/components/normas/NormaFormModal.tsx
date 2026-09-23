import { useState, type FormEvent } from 'react'
import { Info, LoaderCircle } from 'lucide-react'

import type {
  Norma as ApiNorma,
  NormaPayload,
  NormaTipo as ApiNormaTipo,
} from '../../services/normas.service'
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
      setGeneralError(
        error instanceof Error ? error.message : 'Ocurrió un error inesperado al guardar la norma.',
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
              Catálogo institucional
            </span>
            <DialogTitle className="mt-1 text-2xl font-bold text-sci-navy">
              {editando ? 'Editar norma' : 'Registrar norma'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta norma general quedará disponible al programar evaluaciones académicas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-6">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="norma-titulo" className="text-xs font-semibold">
                Título *
              </Label>
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
                className={`h-11 ${fieldErrors.titulo ? 'border-sci-red' : ''}`}
                aria-invalid={Boolean(fieldErrors.titulo)}
              />
              <div className="flex justify-between items-center text-xs">
                <p className="text-sci-red font-medium">{fieldErrors.titulo}</p>
                <span className="text-muted-foreground ml-auto">{titulo.length}/150</span>
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="norma-descripcion" className="text-xs font-semibold">
                Descripción *
              </Label>
              <textarea
                id="norma-descripcion"
                value={descripcion}
                onChange={(event) => {
                  setDescripcion(event.target.value)
                  setFieldErrors((current) => ({ ...current, descripcion: '' }))
                }}
                placeholder="Describe claramente la regla o lineamiento aplicable..."
                rows={5}
                className={`w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-sci-blue focus:ring-2 focus:ring-sci-blue/20 ${
                  fieldErrors.descripcion ? 'border-sci-red' : ''
                }`}
                aria-invalid={Boolean(fieldErrors.descripcion)}
              />
              {fieldErrors.descripcion && (
                <p className="text-xs text-sci-red font-medium">{fieldErrors.descripcion}</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Tipo: <strong className="text-foreground">General</strong>. Las normas particulares se crean dentro de cada examen específico.
            </p>

            {generalError && (
              <div className="rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3 text-xs text-sci-red font-semibold">
                {generalError}
              </div>
            )}

            <div className="flex gap-3 rounded-xl border border-sci-cyan/20 bg-sci-cyan/10 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 text-sci-cyan mt-0.5" />
              <p>
                Esta norma institucional se podrá vincular automáticamente al momento de configurar un nuevo examen.
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
              {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Registrar norma'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
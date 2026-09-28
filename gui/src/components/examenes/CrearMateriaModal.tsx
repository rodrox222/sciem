import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { examenesService, type CatalogItem } from '../../services/examenes.service'

interface CrearMateriaModalProps {
  onOpenChange: (open: boolean) => void
  onCreated: (materia: CatalogItem) => void
}

export function CrearMateriaModal({ onOpenChange, onCreated }: CrearMateriaModalProps) {
  const [nombre, setNombre] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [generalError, setGeneralError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = nombre.trim()
    setFieldError('')
    setGeneralError('')

    if (!trimmedName) {
      setFieldError('Ingresa el nombre de la materia.')
      return
    }

    setSaving(true)
    try {
      const response = await examenesService.createMateria(trimmedName)
      onCreated(response.materia)
    } catch (error) {
      setGeneralError(
        error instanceof Error ? error.message : 'No se pudo crear la materia. Intenta nuevamente.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !saving && onOpenChange(open)}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border bg-card text-card-foreground shadow-2xl rounded-2xl">
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sci-cyan">
            Catálogo Académico
          </span>
          <DialogTitle className="mt-1 text-xl font-bold text-sci-navy">
            Crear nueva materia
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            La materia quedará registrada en el sistema y se seleccionará automáticamente para este examen.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="nueva-materia-nombre" className="text-xs font-semibold">
                Nombre de la materia *
              </Label>
              <Input
                id="nueva-materia-nombre"
                autoFocus
                maxLength={150}
                value={nombre}
                onChange={(event) => {
                  setNombre(event.target.value)
                  setFieldError('')
                  setGeneralError('')
                }}
                placeholder="Ej. Álgebra II"
                className={`h-11 ${fieldError ? 'border-sci-red' : ''}`}
              />
              {fieldError && <p className="text-xs text-sci-red font-medium">{fieldError}</p>}
            </div>

            {generalError && (
              <div className="rounded-xl border border-sci-red/20 bg-sci-red/10 px-4 py-3 text-xs text-sci-red font-semibold">
                {generalError}
              </div>
            )}
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
              {saving ? 'Guardando...' : 'Crear materia'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
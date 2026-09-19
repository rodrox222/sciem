import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { ApiError } from '../../services/apiClient'
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
      if (error instanceof ApiError) {
        const nameError = error.errors?.nombre?.[0]
        if (nameError) setFieldError(nameError)
        else setGeneralError(error.message)
      } else {
        setGeneralError('No se pudo crear la materia. Intenta nuevamente.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!saving) onOpenChange(open)
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-2rem)] max-w-md gap-0 overflow-y-auto border-t-4 border-[#D59A18] bg-white p-0 text-[#1E293B] shadow-2xl"
      >
        <DialogHeader className="gap-2 px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#946807]">
            Programación de exámenes
          </p>
          <DialogTitle className="text-xl font-bold text-[#003770]">Crear materia</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-[#64748B]">
            La materia quedará disponible en el catálogo y seleccionada para este examen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-2 px-5 pb-5 sm:px-6">
            <label htmlFor="nueva-materia-nombre" className="block text-sm font-semibold">
              Nombre de la materia *
            </label>
            <input
              id="nueva-materia-nombre"
              autoFocus
              maxLength={150}
              value={nombre}
              onChange={(event) => {
                setNombre(event.target.value)
                setFieldError('')
                setGeneralError('')
              }}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? 'nueva-materia-error' : undefined}
              placeholder="Ej. Álgebra II"
              className="h-11 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/15"
            />
            {fieldError && <p id="nueva-materia-error" className="text-sm text-[#B0040E]" role="alert">{fieldError}</p>}
            {generalError && <p className="text-sm text-[#B0040E]" role="alert">{generalError}</p>}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-[#E2E8F0] bg-[#F7F7F7] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="min-h-11 rounded-lg border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#003770] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0056B3] px-4 text-sm font-semibold text-white hover:bg-[#003770] disabled:cursor-wait disabled:opacity-50"
            >
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {saving ? 'Guardando...' : 'Crear materia'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

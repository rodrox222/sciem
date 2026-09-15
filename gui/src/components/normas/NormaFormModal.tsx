import { useEffect, useState } from 'react'
import { X, Info } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export type NormaCategoria = 'General' | 'Particular'
export type NormaEstado = 'Activo' | 'Inactivo'

export interface Norma {
  id: number
  codigo: string
  nombre: string
  descripcion: string
  categoria: NormaCategoria
  estado: NormaEstado
}

export interface NormaFormData {
  codigo: string
  nombre: string
  descripcion: string
  categoria: NormaCategoria
  estado: NormaEstado
}

interface NormaFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  norma?: Norma | null
  normas?: Norma[]
  onSubmit: (data: NormaFormData) => void
}

export function NormaFormModal({
  open,
  onOpenChange,
  norma,
  normas = [],
  onSubmit,
}: NormaFormModalProps) {
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] =
    useState<NormaCategoria>('General')
  const [estado, setEstado] =
    useState<NormaEstado>('Activo')
  const [error, setError] = useState('')

  const editando = Boolean(norma)

  useEffect(() => {
    if (!open) return

    if (norma) {
      setCodigo(norma.codigo)
      setNombre(norma.nombre)
      setDescripcion(norma.descripcion)
      setCategoria(norma.categoria)
      setEstado(norma.estado)
    } else {
      setCodigo('')
      setNombre('')
      setDescripcion('')
      setCategoria('General')
      setEstado('Activo')
    }

    setError('')
  }, [open, norma])

  if (!open) return null

  const handleSubmit = () => {
    setError('')

    if (!codigo.trim()) {
      setError('El código de la norma es obligatorio.')
      return
    }

    if (!nombre.trim()) {
      setError('El nombre de la norma es obligatorio.')
      return
    }

    if (!descripcion.trim()) {
      setError('La descripción de la norma es obligatoria.')
      return
    }

    const codigoDuplicado = normas.some(
      (item) =>
        item.codigo.trim().toLowerCase() ===
          codigo.trim().toLowerCase() &&
        item.id !== norma?.id
    )

    if (codigoDuplicado) {
      setError('Ya existe una norma con ese código.')
      return
    }

    onSubmit({
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      categoria,
      estado,
    })

    onOpenChange(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] px-4 py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false)
        }
      }}
    >
      <div
        className={`w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl ${
          editando
            ? 'border-t-4 border-amber-400'
            : 'border-t-4 border-[#003770]'
        }`}
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>


            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {editando ? 'Editar norma' : 'Registrar norma'}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {editando
                ? 'Modifica la información de la norma seleccionada.'
                : 'Registra una nueva norma para utilizarla en los exámenes.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario */}
        <div className="space-y-5 px-6 py-5">

          {/* Código */}
          <div className="space-y-2">
            <Label htmlFor="norma-codigo">
              Código *
            </Label>

            <Input
              id="norma-codigo"
              value={codigo}
              onChange={(event) =>
                setCodigo(event.target.value)
              }
              placeholder="Ej. NOR-001"
            />
          </div>

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="norma-nombre">
              Nombre de la norma *
            </Label>

            <Input
              id="norma-nombre"
              value={nombre}
              onChange={(event) =>
                setNombre(event.target.value)
              }
              placeholder="Ej. Reglamento de evaluación"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="norma-descripcion">
              Descripción *
            </Label>

            <textarea
              id="norma-descripcion"
              value={descripcion}
              onChange={(event) =>
                setDescripcion(event.target.value)
              }
              placeholder="Describe brevemente el contenido de la norma..."
              rows={4}
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20"
            />
          </div>

          {/* Categoría y estado */}
          <div className="grid gap-4 sm:grid-cols-2">

            <div className="space-y-2">
              <Label htmlFor="norma-categoria">
                Categoría *
              </Label>

              <select
                id="norma-categoria"
                value={categoria}
                onChange={(event) =>
                  setCategoria(
                    event.target.value as NormaCategoria
                  )
                }
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20"
              >
                <option value="General">
                  General
                </option>

                <option value="Particular">
                  Particular
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="norma-estado">
                Estado
              </Label>

              <select
                id="norma-estado"
                value={estado}
                onChange={(event) =>
                  setEstado(
                    event.target.value as NormaEstado
                  )
                }
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20"
              >
                <option value="Activo">
                  Activo
                </option>

                <option value="Inactivo">
                  Inactivo
                </option>
              </select>
            </div>

          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Información */}
          <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <p className="text-sm text-blue-800">
              Las normas registradas podrán reutilizarse
              posteriormente al programar un examen.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            className="bg-[#003770] text-white hover:bg-[#002a55]"
          >
            {editando
              ? 'Guardar cambios'
              : 'Guardar'}
          </Button>

        </div>
      </div>
    </div>
  )
}
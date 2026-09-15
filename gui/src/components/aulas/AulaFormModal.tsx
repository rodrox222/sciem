import { useEffect, useState } from 'react'
import { X, Info } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export type AulaEstado = 'Activo' | 'Mantenimiento' | 'Inactivo'

export interface Aula {
  id: number
  nombre: string
  edificio: string
  ubicacion: string
  capacidad: number
  estado: AulaEstado
}

export interface AulaFormData {
  nombre: string
  edificio: string
  ubicacion: string
  capacidad: string
  estado: AulaEstado
}

interface AulaFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aula?: Aula | null
  aulas?: Aula[]
  onSubmit: (data: AulaFormData) => void
}

export function AulaFormModal({
  open,
  onOpenChange,
  aula,
  aulas = [],
  onSubmit,
}: AulaFormModalProps) {
  const [nombre, setNombre] = useState('')
  const [edificio, setEdificio] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [capacidad, setCapacidad] = useState('')
  const [estado, setEstado] = useState<AulaEstado>('Activo')
  const [error, setError] = useState('')

  const editando = Boolean(aula)

  useEffect(() => {
    if (!open) return

    if (aula) {
      setNombre(aula.nombre)
      setEdificio(aula.edificio || '')
      setUbicacion(aula.ubicacion || '')
      setCapacidad(String(aula.capacidad))
      setEstado(aula.estado)
    } else {
      setNombre('')
      setEdificio('')
      setUbicacion('')
      setCapacidad('')
      setEstado('Activo')
    }

    setError('')
  }, [open, aula])

  if (!open) return null

  const handleSubmit = () => {
    setError('')

    if (!nombre.trim()) {
      setError('El código / nombre del ambiente es obligatorio.')
      return
    }

    if (!edificio.trim()) {
      setError('El edificio / bloque es obligatorio.')
      return
    }

    if (!ubicacion.trim()) {
      setError('El piso / ubicación es obligatorio.')
      return
    }

    const capacidadNumero = Number(capacidad)

    if (
      !capacidad ||
      !Number.isInteger(capacidadNumero) ||
      capacidadNumero <= 0
    ) {
      setError('La capacidad debe ser un número entero mayor a 0.')
      return
    }

    const nombreDuplicado = aulas.some(
      (item) =>
        item.nombre.trim().toLowerCase() === nombre.trim().toLowerCase() &&
        item.id !== aula?.id
    )

    if (nombreDuplicado) {
      setError('Ya existe un ambiente con ese nombre.')
      return
    }

    onSubmit({
      nombre: nombre.trim(),
      edificio: edificio.trim(),
      ubicacion: ubicacion.trim(),
      capacidad,
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
              {editando ? 'Editar ambiente' : 'Registrar ambiente'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Completa los datos utilizados al programar un examen.
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
        <div className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="aula-nombre">Código / nombre *</Label>
            <Input
              id="aula-nombre"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Ej. AULA-623"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aula-edificio">Edificio / bloque *</Label>
            <Input
              id="aula-edificio"
              value={edificio}
              onChange={(event) => setEdificio(event.target.value)}
              placeholder="Ej. Edificio de Tecnología"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="aula-piso">Piso / ubicación *</Label>
              <Input
                id="aula-piso"
                value={ubicacion}
                onChange={(event) => setUbicacion(event.target.value)}
                placeholder="Ej. Piso 6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aula-capacidad">Capacidad *</Label>
              <Input
                id="aula-capacidad"
                type="number"
                min="1"
                value={capacidad}
                onChange={(event) => setCapacidad(event.target.value)}
                placeholder="Ej. 52"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aula-estado">Estado</Label>
            <select
              id="aula-estado"
              value={estado}
              onChange={(event) =>
                setEstado(event.target.value as AulaEstado)
              }
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20"
            >
              <option value="Activo">Activo</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Inactivo">Inactivo</option>
            </select>
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
              El registro generará una respuesta visual de confirmación.
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
            className="bg-[#003770] hover:bg-[#002a55] text-white"
          >
            {editando ? 'Guardar cambios' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
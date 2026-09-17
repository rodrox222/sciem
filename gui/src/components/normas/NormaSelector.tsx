import { Plus, Search, Check, X } from 'lucide-react'
import { useState } from 'react'

import type { Norma } from './NormaFormModal'

interface NormaSelectorProps {
  normas: Norma[]
  selectedIds: number[]
  onChange: (selectedIds: number[]) => void
  permitirNormaParticular?: boolean
  onCrearNormaParticular?: (descripcion: string) => void
}

export function NormaSelector({
  normas,
  selectedIds,
  onChange,
  permitirNormaParticular = false,
  onCrearNormaParticular,
}: NormaSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevaNorma, setNuevaNorma] = useState('')
  const [error, setError] = useState('')

  const normasActivas = normas.filter((norma) => {
    if (norma.estado !== 'Activo') return false

    const texto = searchTerm.trim().toLowerCase()

    if (!texto) return true

    return norma.descripcion.toLowerCase().includes(texto)
  })

  const toggleNorma = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id))
      return
    }

    onChange([...selectedIds, id])
  }

  const abrirFormulario = () => {
    setError('')
    setNuevaNorma('')
    setMostrarFormulario(true)
  }

  const cerrarFormulario = () => {
    setError('')
    setNuevaNorma('')
    setMostrarFormulario(false)
  }

  const crearNormaParticular = () => {
    const descripcion = nuevaNorma.trim()

    if (!descripcion) {
      setError('Debes ingresar la descripción de la norma particular.')
      return
    }

    if (descripcion.length < 5) {
      setError('La norma particular debe tener al menos 5 caracteres.')
      return
    }

    if (onCrearNormaParticular) {
      onCrearNormaParticular(descripcion)
    }

    cerrarFormulario()
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Seleccionar normas
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Selecciona una o varias normas activas para aplicarlas al examen.
          </p>
        </div>

        {permitirNormaParticular && (
          <button
            type="button"
            onClick={abrirFormulario}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
          >
            <Plus className="h-4 w-4" />
            Agregar norma particular
          </button>
        )}
      </div>

      {mostrarFormulario && permitirNormaParticular && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-purple-800">
                Nueva norma particular
              </h4>

              <p className="mt-1 text-xs leading-relaxed text-purple-700">
                Esta norma será específica para el examen que estás
                programando.
              </p>
            </div>

            <button
              type="button"
              onClick={cerrarFormulario}
              className="rounded-md p-1 text-purple-500 transition hover:bg-purple-100 hover:text-purple-700"
              aria-label="Cerrar formulario"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label
              htmlFor="nuevaNormaParticular"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Descripción de la norma{' '}
              <span className="text-[#E30613]">*</span>
            </label>

            <textarea
              id="nuevaNormaParticular"
              value={nuevaNorma}
              onChange={(event) => {
                setNuevaNorma(event.target.value)
                setError('')
              }}
              placeholder="Ej. Los estudiantes seleccionados deberán presentar el material indicado por el docente."
              rows={4}
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />

            {error && (
              <p className="mt-2 text-sm font-medium leading-relaxed text-red-600">
                {error}
              </p>
            )}

            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarFormulario}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={crearNormaParticular}
                className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-800"
              >
                Agregar norma
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar por descripción..."
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#002b5b] focus:ring-2 focus:ring-[#002b5b]/20"
        />
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
        {normasActivas.length > 0 ? (
          normasActivas.map((norma) => {
            const seleccionada = selectedIds.includes(norma.id)

            return (
              <button
                key={norma.id}
                type="button"
                onClick={() => toggleNorma(norma.id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                  seleccionada
                    ? 'border-[#003770] bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    seleccionada
                      ? 'border-[#003770] bg-[#003770] text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                  aria-hidden="true"
                >
                  {seleccionada && <Check className="h-3.5 w-3.5" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        norma.tipo === 'General'
                          ? 'border-blue-200 bg-blue-50 text-[#002b5b]'
                          : 'border-purple-200 bg-purple-50 text-purple-700'
                      }`}
                    >
                      {norma.tipo}
                    </span>
                  </span>

                  <span className="block text-sm leading-relaxed text-slate-700">
                    {norma.descripcion}
                  </span>
                </span>
              </button>
            )
          })
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-600">
              No se encontraron normas activas.
            </p>

            {searchTerm && (
              <p className="mt-1 text-xs text-slate-400">
                Prueba con otra palabra de búsqueda.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
        <span className="text-sm text-slate-600">
          Normas seleccionadas
        </span>

        <span className="rounded-full bg-[#003770] px-2.5 py-1 text-xs font-bold text-white">
          {selectedIds.length}
        </span>
      </div>
    </div>
  )
}
import { useState } from 'react'
import { Plus, Pencil, Power, Search } from 'lucide-react'

import {
  NormaFormModal,
  type Norma,
  type NormaFormData,
} from '../components/normas/NormaFormModal'
import { MainLayout } from '../layouts/MainLayout'

const normasIniciales: Norma[] = [
  {
    id: 1,
    descripcion:
      'Normas generales para la evaluación académica de los estudiantes.',
    tipo: 'General',
    estado: 'Activo',
  },
  {
    id: 2,
    descripcion:
      'Lineamientos para la organización y realización de exámenes finales.',
    tipo: 'Particular',
    estado: 'Activo',
  },
  {
    id: 3,
    descripcion:
      'Disposiciones relacionadas con el comportamiento durante las evaluaciones.',
    tipo: 'General',
    estado: 'Activo',
  },
  {
    id: 4,
    descripcion:
      'Reglas específicas para evaluaciones realizadas en laboratorios.',
    tipo: 'Particular',
    estado: 'Inactivo',
  },
]

const TIPO_BADGE_STYLES: Record<string, string> = {
  General: 'border-blue-200 bg-blue-50 text-[#002b5b]',
  Particular: 'border-purple-200 bg-purple-50 text-purple-700',
}

const ESTADO_BADGE_STYLES: Record<string, string> = {
  Activo: 'border-green-200 bg-green-50 text-green-700',
  Inactivo: 'border-red-200 bg-red-50 text-red-600',
}

const ESTADO_BORDER_STYLES: Record<string, string> = {
  Activo: 'bg-[#002b5b]',
  Inactivo: 'bg-red-500',
}

export default function NormasPage() {
  const [normas, setNormas] = useState<Norma[]>(normasIniciales)
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<'Todos' | 'General' | 'Particular'>('Todos')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [normaSeleccionada, setNormaSeleccionada] = useState<Norma | null>(null)

  const abrirRegistrar = () => {
    setNormaSeleccionada(null)
    setModalAbierto(true)
  }

  const abrirEditar = (norma: Norma) => {
    setNormaSeleccionada(norma)
    setModalAbierto(true)
  }

  const desactivarNorma = (norma: Norma) => {
    const confirmar = window.confirm('¿Deseas desactivar esta norma?')
    if (!confirmar) return

    setNormas((actuales) =>
      actuales.map((item) =>
        item.id === norma.id ? { ...item, estado: 'Inactivo' } : item
      )
    )
  }

  const guardarNorma = (data: NormaFormData) => {
    if (normaSeleccionada) {
      setNormas((actuales) =>
        actuales.map((norma) =>
          norma.id === normaSeleccionada.id
            ? {
                ...norma,
                descripcion: data.descripcion,
                tipo: data.tipo,
                estado: data.estado,
              }
            : norma
        )
      )
      return
    }

    const nuevoId =
      normas.length > 0 ? Math.max(...normas.map((norma) => norma.id)) + 1 : 1

    const nuevaNorma: Norma = {
      id: nuevoId,
      descripcion: data.descripcion,
      tipo: data.tipo,
      estado: data.estado,
    }

    setNormas((actuales) => [...actuales, nuevaNorma])
  }

  const normasFiltradas = normas.filter((norma) => {
    const texto = searchTerm.trim().toLowerCase()
    const coincideBusqueda =
      !texto || norma.descripcion.toLowerCase().includes(texto)
    const coincideTipo =
      tipoFiltro === 'Todos' || norma.tipo === tipoFiltro

    return coincideBusqueda && coincideTipo
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Gestión de normas
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Administra las normas disponibles para la programación de exámenes.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirRegistrar}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#002b5b] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#001d3d] whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            Nueva norma
          </button>
        </div>

        {/* Barra de Filtros */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por descripción..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#002b5b] focus:ring-2 focus:ring-[#002b5b]/20"
              />
            </div>

            <select
              value={tipoFiltro}
              onChange={(event) =>
                setTipoFiltro(
                  event.target.value as 'Todos' | 'General' | 'Particular'
                )
              }
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#002b5b] focus:ring-2 focus:ring-[#002b5b]/20"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="General">General</option>
              <option value="Particular">Particular</option>
            </select>
          </div>
        </div>

        {/* Tarjetas de Resumen */}
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xs">
            <p className="text-xs text-slate-500">Total de normas</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {normas.length}
            </p>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 shadow-xs">
            <p className="text-xs text-blue-600">Normas generales</p>
            <p className="mt-1 text-xl font-bold text-[#002b5b]">
              {normas.filter((norma) => norma.tipo === 'General').length}
            </p>
          </div>

          <div className="rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 shadow-xs">
            <p className="text-xs text-purple-600">Normas particulares</p>
            <p className="mt-1 text-xl font-bold text-purple-700">
              {normas.filter((norma) => norma.tipo === 'Particular').length}
            </p>
          </div>
        </div>

        {/* Listado en Tarjetas */}
        <div className="space-y-4">
          {normasFiltradas.length > 0 ? (
            normasFiltradas.map((norma) => (
              <div
                key={norma.id}
                className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition-all hover:shadow-md"
              >
                <div
                  className={`absolute left-0 right-0 top-0 h-1.5 ${
                    ESTADO_BORDER_STYLES[norma.estado] || ESTADO_BORDER_STYLES.Inactivo
                  }`}
                />

                <div className="p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            TIPO_BADGE_STYLES[norma.tipo] || 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {norma.tipo}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            ESTADO_BADGE_STYLES[norma.estado] || ESTADO_BADGE_STYLES.Inactivo
                          }`}
                        >
                          {norma.estado}
                        </span>
                      </div>

                      <p className="text-base leading-relaxed text-slate-700">
                        {norma.descripcion}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => abrirEditar(norma)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-[#002b5b]"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>

                      {norma.estado === 'Activo' && (
                        <button
                          type="button"
                          onClick={() => desactivarNorma(norma)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          <Power className="h-4 w-4" />
                          Desactivar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-xs">
              <p className="font-semibold text-slate-700">
                No se encontraron normas.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Prueba con otro término de búsqueda o tipo.
              </p>
            </div>
          )}
        </div>

        {/* Modal de Formulario */}
        <NormaFormModal
          open={modalAbierto}
          onOpenChange={setModalAbierto}
          norma={normaSeleccionada}
          onSubmit={guardarNorma}
        />
      </div>
    </MainLayout>
  )
}
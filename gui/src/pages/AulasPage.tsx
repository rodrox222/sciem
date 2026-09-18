import { useState } from 'react'
import { Plus, Power } from 'lucide-react'

import {
  AulaFormModal,
  type Aula,
  type AulaFormData,
} from '../components/aulas/AulaFormModal'
import { MainLayout } from '../layouts/MainLayout'

const aulasIniciales: Aula[] = [
  {
    id: 1,
    nombre: 'AULA-623',
    edificio: 'Edificio de Tecnología',
    ubicacion: 'Piso 6',
    capacidad: 52,
    estado: 'Activo',
  },
  {
    id: 2,
    nombre: 'LAB-03',
    edificio: 'Bloque central',
    ubicacion: 'Piso 2',
    capacidad: 30,
    estado: 'Mantenimiento',
  },
]

const ESTADO_BADGE_STYLES: Record<string, string> = {
  Activo: 'bg-blue-50 text-[#002b5b] border border-blue-200',
  Mantenimiento: 'bg-amber-50 text-amber-700 border border-amber-200',
  Inactivo: 'bg-red-50 text-red-600 border border-red-200',
}

const ESTADO_BORDER_STYLES: Record<string, string> = {
  Activo: 'bg-[#002b5b]',
  Mantenimiento: 'bg-amber-500',
  Inactivo: 'bg-red-600',
}

export default function AulasPage() {
  const [aulas, setAulas] = useState<Aula[]>(aulasIniciales)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [aulaSeleccionada, setAulaSeleccionada] = useState<Aula | null>(null)

  const abrirRegistrar = () => {
    setAulaSeleccionada(null)
    setModalAbierto(true)
  }

  const abrirEditar = (aula: Aula) => {
    setAulaSeleccionada(aula)
    setModalAbierto(true)
  }

  const desactivarAula = (aula: Aula) => {
    const confirmar = window.confirm(
      `¿Deseas desactivar el ambiente ${aula.nombre}?`
    )

    if (!confirmar) return

    setAulas((actuales) =>
      actuales.map((item) =>
        item.id === aula.id
          ? {
              ...item,
              estado: 'Inactivo',
            }
          : item
      )
    )
  }

  const guardarAula = (data: AulaFormData) => {
    const aulaExistente = aulaSeleccionada

    if (aulaExistente) {
      setAulas((actuales) =>
        actuales.map((aula) =>
          aula.id === aulaExistente.id
            ? {
                ...aula,
                nombre: data.nombre,
                edificio: data.edificio,
                ubicacion: data.ubicacion,
                capacidad: Number(data.capacidad),
                estado: data.estado,
              }
            : aula
        )
      )
    } else {
      const nuevoId =
        aulas.length > 0 ? Math.max(...aulas.map((aula) => aula.id)) + 1 : 1

      const nuevaAula: Aula = {
        id: nuevoId,
        nombre: data.nombre,
        edificio: data.edificio,
        ubicacion: data.ubicacion,
        capacidad: Number(data.capacidad),
        estado: data.estado,
      }

      setAulas((actuales) => [...actuales, nuevaAula])
    }
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const aulasFiltradas = aulas.filter(
    (aula) =>
      aula.nombre.toLowerCase().includes(normalizedSearch) ||
      aula.edificio.toLowerCase().includes(normalizedSearch)
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Encabezado Principal */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Aulas y ambientes
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Registro institucional actualizado · {aulas.length} ambientes
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              placeholder="Buscar aula o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-72 h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm outline-none focus:border-[#002b5b] focus:ring-2 focus:ring-[#002b5b]/20"
            />

            <button
              type="button"
              onClick={abrirRegistrar}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#002b5b] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#001d3d] whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              Nuevo ambiente
            </button>
          </div>
        </div>

        {/* Listado en Tarjetas */}
        <div className="space-y-4">
          {aulasFiltradas.length > 0 ? (
            aulasFiltradas.map((aula) => (
              <div
                key={aula.id}
                className="relative bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col md:flex-row items-stretch justify-between transition-all hover:shadow-md"
              >
                {/* Franja superior de estado */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    ESTADO_BORDER_STYLES[aula.estado] || ESTADO_BORDER_STYLES.Inactivo
                  }`}
                />

                <div className="p-6 flex items-center gap-6 w-full">
                  {/* Identificador de Aula */}
                  <div className="w-14 h-14 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#002b5b] font-bold text-xl shadow-inner shrink-0">
                    A
                  </div>

                  {/* Información */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          ESTADO_BADGE_STYLES[aula.estado] || ESTADO_BADGE_STYLES.Inactivo
                        }`}
                      >
                        {aula.estado}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      {aula.nombre}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {aula.edificio} · {aula.ubicacion}
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-6 pr-2 shrink-0">
                    <span className="text-sm font-semibold text-slate-700 hidden sm:inline-block">
                      {aula.capacidad} estudiantes
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => abrirEditar(aula)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-[#002b5b]"
                      >
                        Editar
                      </button>

                      {aula.estado === 'Activo' && (
                        <button
                          type="button"
                          onClick={() => desactivarAula(aula)}
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
            <div className="bg-white rounded-xl p-8 text-center text-slate-500 border border-slate-200">
              No se encontraron ambientes registrados.
            </div>
          )}
        </div>

        {/* Modal */}
        <AulaFormModal
          open={modalAbierto}
          onOpenChange={setModalAbierto}
          aula={aulaSeleccionada}
          aulas={aulas}
          onSubmit={guardarAula}
        />
      </div>
    </MainLayout>
  )
}
import { useState } from 'react'
import { Plus, Power } from 'lucide-react'

import {
  AulaFormModal,
  type Aula,
  type AulaFormData,
} from '../components/aulas/AulaFormModal'
import { AdminNavbar } from '../components/AdminNavbar'
import { AdminFooter } from '../components/AdminFooter' // <--- Importar el footer

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
        aulas.length > 0
          ? Math.max(...aulas.map((aula) => aula.id)) + 1
          : 1

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

  const aulasFiltradas = aulas.filter(
    (aula) =>
      aula.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aula.edificio.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col justify-between">
      <div>
        {/* Navbar exclusivo del Administrador */}
        <AdminNavbar />

        <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">

          {/* Encabezado Principal del Administrador */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>

              <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
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
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#002b5b] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#001d3d] whitespace-nowrap"
              >
                <Plus className="h-5 w-5" />
                Nuevo ambiente
              </button>
            </div>
          </div>

          {/* Listado en Tarjetas (Estilo Administrador) */}
          <div className="space-y-4">
            {aulasFiltradas.length > 0 ? (
              aulasFiltradas.map((aula) => (
                <div
                  key={aula.id}
                  className="relative bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row items-stretch justify-between transition-all hover:shadow-md"
                >
                  {/* Franja superior indicadora de color */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      aula.estado === 'Activo'
                        ? 'bg-[#002b5b]'
                        : aula.estado === 'Mantenimiento'
                        ? 'bg-amber-500'
                        : 'bg-red-600'
                    }`}
                  />

                  <div className="p-6 flex items-center gap-6 w-full">
                    {/* Ícono de Aula con Letra */}
                    <div className="w-14 h-14 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#002b5b] font-bold text-xl shadow-inner shrink-0">
                      A
                    </div>

                    {/* Información Principal */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            aula.estado === 'Activo'
                              ? 'bg-blue-50 text-[#002b5b] border border-blue-200'
                              : aula.estado === 'Mantenimiento'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
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

                    {/* Capacidad / Botón Editar a la derecha */}
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
      </div>

      {/* Footer Institucional al fondo */}
      <AdminFooter />
    </div>
  )
}
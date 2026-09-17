import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  Search,
  Eye,
  XCircle,
} from 'lucide-react'

import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'

type EstadoExamen = 'Programado' | 'Cancelado' | 'Finalizado'

interface Examen {
  id: number
  asignatura: string
  fecha: string
  horaInicio: string
  horaFin: string
  duracion: number
  aula: string
  normas: number
  estado: EstadoExamen
  docente: string
}

const misExamenesIniciales: Examen[] = [
  {
    id: 1,
    asignatura: 'Sistemas Operativos',
    fecha: '2026-09-18',
    horaInicio: '08:00',
    horaFin: '09:30',
    duracion: 90,
    aula: 'Aula A-101',
    normas: 3,
    estado: 'Programado',
    docente: 'Juan Pérez',
  },
  {
    id: 2,
    asignatura: 'Redes de Computadoras',
    fecha: '2026-09-25',
    horaInicio: '14:00',
    horaFin: '15:30',
    duracion: 90,
    aula: 'Laboratorio L-01',
    normas: 2,
    estado: 'Programado',
    docente: 'Juan Pérez',
  },
  {
    id: 3,
    asignatura: 'Bases de Datos',
    fecha: '2026-08-20',
    horaInicio: '10:00',
    horaFin: '11:30',
    duracion: 90,
    aula: 'Aula A-203',
    normas: 4,
    estado: 'Finalizado',
    docente: 'Juan Pérez',
  },
]

export default function MisExamenesPage() {
  const navigate = useNavigate()

  const [examenes] = useState<Examen[]>(misExamenesIniciales)

  const [busqueda, setBusqueda] = useState('')

  const [filtroEstado, setFiltroEstado] = useState<
    'Todos' | EstadoExamen
  >('Todos')

  const [examenSeleccionado, setExamenSeleccionado] =
    useState<Examen | null>(null)

  const examenesFiltrados = examenes.filter((examen) => {
    const texto = busqueda.trim().toLowerCase()

    const coincideBusqueda =
      !texto ||
      examen.asignatura.toLowerCase().includes(texto) ||
      examen.aula.toLowerCase().includes(texto)

    const coincideEstado =
      filtroEstado === 'Todos' ||
      examen.estado === filtroEstado

    return coincideBusqueda && coincideEstado
  })

  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Encabezado */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#003770]">
              Gestión académica
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Mis exámenes
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Consulta y administra los exámenes que tienes
              programados o que ya fueron realizados.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/programar-examen')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#003770] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#002b5b]"
          >
            <Plus className="h-4 w-4" />
            Programar examen
          </button>
        </div>

        {/* Resumen */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total de mis exámenes
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {examenes.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Programados
            </p>

            <p className="mt-1 text-2xl font-bold text-green-600">
              {
                examenes.filter(
                  (examen) => examen.estado === 'Programado',
                ).length
              }
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Finalizados
            </p>

            <p className="mt-1 text-2xl font-bold text-blue-600">
              {
                examenes.filter(
                  (examen) => examen.estado === 'Finalizado',
                ).length
              }
            </p>
          </div>
        </div>

        {/* Filtros */}
        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
                placeholder="Buscar por asignatura o aula..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20"
              />
            </div>

            <select
              value={filtroEstado}
              onChange={(event) =>
                setFiltroEstado(
                  event.target.value as
                    | 'Todos'
                    | EstadoExamen,
                )
              }
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Programado">Programados</option>
              <option value="Finalizado">Finalizados</option>
              <option value="Cancelado">Cancelados</option>
            </select>
          </div>
        </section>

        {/* Lista */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
            <h2 className="text-lg font-bold text-slate-900">
              Mis exámenes registrados
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Historial de exámenes asociados al docente.
            </p>
          </div>

          <div className="p-4 sm:p-6">
            {examenesFiltrados.length > 0 ? (
              <div className="space-y-4">
                {examenesFiltrados.map((examen) => (
                  <article
                    key={examen.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">
                            {examen.asignatura}
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              examen.estado === 'Programado'
                                ? 'bg-green-100 text-green-700'
                                : examen.estado === 'Finalizado'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {examen.estado}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 shrink-0 text-[#003770]" />
                            <span>{examen.fecha}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 shrink-0 text-[#003770]" />
                            <span>
                              {examen.horaInicio} - {examen.horaFin}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 shrink-0 text-[#003770]" />
                            <span>{examen.aula}</span>
                          </div>

                          <div>
                            <span className="font-medium text-slate-500">
                              Duración:
                            </span>{' '}
                            {examen.duracion} min
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExamenSeleccionado(examen)
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Eye className="h-4 w-4" />
                          Ver detalle
                        </button>

                        {examen.estado === 'Programado' && (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                          >
                            <XCircle className="h-4 w-4" />
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-slate-400" />

                <p className="mt-4 text-sm font-semibold text-slate-600">
                  No se encontraron exámenes.
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Prueba modificando los filtros de búsqueda.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* Detalle del examen */}
      {examenSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Detalle del examen
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Información registrada del examen.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setExamenSeleccionado(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar detalle"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Asignatura
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {examenSeleccionado.asignatura}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Fecha
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {examenSeleccionado.fecha}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Horario
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {examenSeleccionado.horaInicio} -{' '}
                  {examenSeleccionado.horaFin}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Aula
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {examenSeleccionado.aula}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Duración
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {examenSeleccionado.duracion} minutos
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Normas asociadas
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {examenSeleccionado.normas}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Estado
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {examenSeleccionado.estado}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
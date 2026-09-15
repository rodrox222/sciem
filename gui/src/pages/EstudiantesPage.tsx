import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { AdminNavbar } from '../components/AdminNavbar'
import {
  Edit3,
  Search,
  UserPlus,
  UserX,
  Users,
} from 'lucide-react'


import { AdminFooter } from '../components/AdminFooter'
import {
  EstudianteFormModal,
  type Estudiante,
} from '../components/estudiantes/EstudianteFormModal'

const estudiantesIniciales: Estudiante[] = [
  {
    id: 1,
    nombre: 'Juan',
    apellidoPaterno: 'Pérez',
    apellidoMaterno: 'Mamani',
    codigoSis: '202312345',
    ci: '8234567',
    correo: 'juan.perez@example.com',
    estado: 'Activo',
  },
  {
    id: 2,
    nombre: 'María',
    apellidoPaterno: 'López',
    apellidoMaterno: 'Quispe',
    codigoSis: '202345678',
    ci: '8234567A',
    correo: 'maria.lopez@example.com',
    estado: 'Activo',
  },
  {
    id: 3,
    nombre: 'Carlos',
    apellidoPaterno: 'Fernández',
    apellidoMaterno: 'Rojas',
    codigoSis: '202356789',
    ci: '7654321',
    correo: 'carlos.fernandez@example.com',
    estado: 'Activo',
  },
  {
    id: 4,
    nombre: 'Ana',
    apellidoPaterno: 'Gutiérrez',
    apellidoMaterno: 'Vargas',
    codigoSis: '202367890',
    ci: '6543210',
    correo: 'ana.gutierrez@example.com',
    estado: 'Inactivo',
  },
]

export default function EstudiantesPage() {
  
 const [searchParams] = useSearchParams()

const rolRuta = searchParams.get('rol')
const rolLocal = localStorage.getItem('user_role')

const esAdmin =
  rolRuta === 'admin' ||
  rolLocal?.toLowerCase().includes('admin') === true
  const [estudiantes, setEstudiantes] =
    useState<Estudiante[]>(estudiantesIniciales)

  const [busqueda, setBusqueda] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)

  const [estudianteEditando, setEstudianteEditando] =
    useState<Estudiante | null>(null)

  const estudiantesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    if (!texto) {
      return estudiantes
    }

    return estudiantes.filter((estudiante) => {
      const nombreCompleto = [
        estudiante.nombre,
        estudiante.apellidoPaterno,
        estudiante.apellidoMaterno,
      ]
        .join(' ')
        .toLowerCase()

      return (
        nombreCompleto.includes(texto) ||
        estudiante.codigoSis.toLowerCase().includes(texto) ||
        estudiante.ci.toLowerCase().includes(texto)
      )
    })
  }, [busqueda, estudiantes])

  const estudiantesActivos = estudiantes.filter(
    (estudiante) => estudiante.estado === 'Activo',
  ).length

  const estudiantesInactivos = estudiantes.filter(
    (estudiante) => estudiante.estado === 'Inactivo',
  ).length

  const handleRegistrar = () => {
    setEstudianteEditando(null)
    setModalAbierto(true)
  }

  const handleEditar = (estudiante: Estudiante) => {
    setEstudianteEditando(estudiante)
    setModalAbierto(true)
  }

  const handleCerrarModal = () => {
    setModalAbierto(false)
    setEstudianteEditando(null)
  }

  const handleGuardarEstudiante = (estudianteGuardado: Estudiante) => {
    setEstudiantes((actuales) => {
      const existe = actuales.some(
        (estudiante) => estudiante.id === estudianteGuardado.id,
      )

      if (existe) {
        return actuales.map((estudiante) =>
          estudiante.id === estudianteGuardado.id
            ? estudianteGuardado
            : estudiante,
        )
      }

      return [...actuales, estudianteGuardado]
    })

    handleCerrarModal()
  }

  const handleDesactivar = (estudiante: Estudiante) => {
    if (estudiante.estado === 'Inactivo') {
      return
    }

    setEstudiantes((actuales) =>
      actuales.map((item) =>
        item.id === estudiante.id
          ? { ...item, estado: 'Inactivo' }
          : item,
      ),
    )
  }

  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col">
    {esAdmin ? (
  <AdminNavbar
    rol="Administrador"
    usuario="Administrador"
  />
) : (
  <Navbar
    rol="Docente"
    usuario="Docente"
  />
)}

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Encabezado */}
        <section className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#E30613] uppercase tracking-wide">
                Gestión académica
              </p>

              <h1 className="text-2xl sm:text-3xl font-bold text-[#003770] mt-1">
                Estudiantes
              </h1>

              <p className="text-sm text-slate-600 mt-2 max-w-2xl">
                Registra, consulta y modifica los datos de los estudiantes.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRegistrar}
              className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#003770] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#002b5b] transition"
            >
              <UserPlus className="h-5 w-5" />
              Registrar estudiante
            </button>
          </div>
        </section>

        {/* Resumen */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-3">
                <Users className="h-5 w-5 text-[#003770]" />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Total estudiantes
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {estudiantes.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm text-slate-500">
                Estudiantes activos
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {estudiantesActivos}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm text-slate-500">
                Estudiantes inactivos
              </p>
              <p className="text-2xl font-bold text-slate-500 mt-1">
                {estudiantesInactivos}
              </p>
            </div>
          </div>
        </section>

        {/* Búsqueda */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm mb-6">
          <label
            htmlFor="buscar-estudiante"
            className="block text-sm font-semibold text-slate-700 mb-2"
          >
            Buscar estudiante
          </label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />

            <input
              id="buscar-estudiante"
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre, apellido, CI o código SIS..."
              className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#003770] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <p className="text-xs text-slate-500 mt-2">
            {estudiantesFiltrados.length} resultado(s) encontrado(s)
          </p>
        </section>

        {/* Vista escritorio */}
        <section className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-4 font-semibold text-slate-700">
                    Estudiante
                  </th>
                  <th className="text-left px-5 py-4 font-semibold text-slate-700">
                    Código SIS
                  </th>
                  <th className="text-left px-5 py-4 font-semibold text-slate-700">
                    CI
                  </th>
                  <th className="text-left px-5 py-4 font-semibold text-slate-700">
                    Correo
                  </th>
                  <th className="text-left px-5 py-4 font-semibold text-slate-700">
                    Estado
                  </th>
                  <th className="text-right px-5 py-4 font-semibold text-slate-700">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {estudiantesFiltrados.map((estudiante) => (
                  <tr
                    key={estudiante.id}
                    className="hover:bg-slate-50 transition"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {estudiante.nombre}{' '}
                        {estudiante.apellidoPaterno}{' '}
                        {estudiante.apellidoMaterno}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {estudiante.codigoSis}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {estudiante.ci}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {estudiante.correo || '—'}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          estudiante.estado === 'Activo'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {estudiante.estado}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditar(estudiante)}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                          title="Editar estudiante"
                        >
                          <Edit3 className="h-5 w-5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDesactivar(estudiante)}
                          disabled={estudiante.estado === 'Inactivo'}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-red-200 text-[#E30613] hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Desactivar estudiante"
                        >
                          <UserX className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {estudiantesFiltrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      No se encontraron estudiantes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Vista móvil */}
        <section className="md:hidden space-y-4">
          {estudiantesFiltrados.map((estudiante) => (
            <article
              key={estudiante.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-900 break-words">
                    {estudiante.nombre} {estudiante.apellidoPaterno}{' '}
                    {estudiante.apellidoMaterno}
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    SIS: {estudiante.codigoSis}
                  </p>
                </div>

                <span
                  className={`shrink-0 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    estudiante.estado === 'Activo'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {estudiante.estado}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-slate-500">CI</span>
                  <span className="font-medium text-slate-800 break-all">
                    {estudiante.ci}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-slate-500">Correo</span>
                  <span className="font-medium text-slate-800 break-all">
                    {estudiante.correo || '—'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => handleEditar(estudiante)}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <Edit3 className="h-4 w-4" />
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => handleDesactivar(estudiante)}
                  disabled={estudiante.estado === 'Inactivo'}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 text-sm font-semibold text-[#E30613] hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <UserX className="h-4 w-4" />
                  Desactivar
                </button>
              </div>
            </article>
          ))}

          {estudiantesFiltrados.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No se encontraron estudiantes.
            </div>
          )}
        </section>
      </main>

      <AdminFooter />

      {/* Modal de registro / edición */}
      <EstudianteFormModal
        open={modalAbierto}
        estudiante={estudianteEditando}
        onClose={handleCerrarModal}
        onSave={handleGuardarEstudiante}
      />
    </div>
  )
}

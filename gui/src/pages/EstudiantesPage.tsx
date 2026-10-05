import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  LoaderCircle,
  RefreshCw,
  Search,
  UserPlus,
  Users,
} from 'lucide-react'

import { EstudianteFormModal } from '../components/estudiantes/EstudianteFormModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  estudiantesService,
  type Estudiante,
  type InscripcionPayload,
} from '../services/estudiantes.service'
import { examenesService, type Examen } from '../services/examenes.service'

const PER_PAGE = 10

const fullName = (student: Estudiante) =>
  [student.nombre, student.apellido_paterno, student.apellido_materno]
    .filter(Boolean)
    .join(' ')

export default function EstudiantesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const examId = searchParams.get('examen')
  const role = (localStorage.getItem('user_role') ?? '').toLowerCase()
  const canManage = ['admin', 'administrador', 'docente'].includes(role)

  const [students, setStudents] = useState<Estudiante[]>([])
  const [exam, setExam] = useState<Examen | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Estudiante | null>(null)

  const loadStudents = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      if (examId) {
        const [studentResponse, examResponse] = await Promise.all([
          estudiantesService.listByExam(examId),
          examenesService.get(examId),
        ])

        // Normalizamos los estudiantes del examen a la interfaz Estudiante
        const mappedStudents: Estudiante[] = (studentResponse.estudiantes || []).map((st) => ({
          id: st.id,
          codigo_sis: st.codigo_sis,
          ci: st.ci,
          ci_extension: st.ci_extension,
          nombre: st.nombre_completo,
          apellido_paterno: '',
          apellido_materno: null,
          email_institucional: st.email_institucional,
          activo: true,
          pivot: {
            estado: st.estado,
            motivo_estado: st.motivo_estado,
            ajuste_manual: st.ajuste_manual,
            fecha_ajuste_manual: st.fecha_ajuste_manual,
          },
        }))

        setStudents(mappedStudents)
        setTotal(mappedStudents.length)
        setLastPage(1)
        setExam(examResponse)
      } else {
        const response = await estudiantesService.list({
          search: searchTerm,
          page,
          perPage: PER_PAGE,
        })
        setStudents(response.data)
        setTotal(response.total)
        setLastPage(Math.max(response.last_page, 1))
        setExam(null)
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudo consultar el listado de estudiantes.',
      )
    } finally {
      setLoading(false)
    }
  }, [examId, page, searchTerm])

  useEffect(() => {
    const requestId = window.setTimeout(() => void loadStudents(), 0)
    return () => window.clearTimeout(requestId)
  }, [loadStudents])

  const visibleStudents = useMemo(() => {
    if (!examId || !searchTerm) return students
    const search = searchTerm.toLocaleLowerCase()
    return students.filter((student) =>
      [fullName(student), student.codigo_sis, student.ci]
        .join(' ')
        .toLocaleLowerCase()
        .includes(search),
    )
  }, [examId, searchTerm, students])

  const enabledCount = visibleStudents.filter(
    (student) => student.pivot?.estado !== 'Inhabilitado' && student.activo,
  ).length

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setSearchTerm(searchInput.trim())
  }

  const openCreate = () => {
    setEditingStudent(null)
    setSuccess('')
    setModalOpen(true)
  }

  const openEdit = (student: Estudiante) => {
    setEditingStudent(student)
    setSuccess('')
    setModalOpen(true)
  }

  const ensureNoRealDuplicate = async (payload: InscripcionPayload) => {
    const sisResponse = await estudiantesService.list({
      search: payload.codigo_sis,
      perPage: 100,
    })
    const duplicateSis = sisResponse.data.find(
      (student) =>
        student.codigo_sis.toLocaleLowerCase() === payload.codigo_sis.toLocaleLowerCase() &&
        student.id !== editingStudent?.id &&
        (student.ci.toLocaleUpperCase() !== payload.ci.toLocaleUpperCase() ||
          (student.ci_extension ?? '').toLocaleUpperCase() !==
            (payload.ci_extension ?? '').toLocaleUpperCase() ||
          student.email_institucional.toLocaleLowerCase() !==
            payload.email_institucional.toLocaleLowerCase()),
    )
    if (duplicateSis) {
      throw new Error('El código SIS ya está registrado con otros datos de identidad.')
    }

    const ciResponse = await estudiantesService.list({ search: payload.ci, perPage: 100 })
    const duplicateCi = ciResponse.data.find(
      (student) =>
        student.ci.toLocaleUpperCase() === payload.ci.toLocaleUpperCase() &&
        (student.ci_extension ?? '').toLocaleUpperCase() ===
          (payload.ci_extension ?? '').toLocaleUpperCase() &&
        student.id !== editingStudent?.id &&
        student.codigo_sis.toLocaleLowerCase() !== payload.codigo_sis.toLocaleLowerCase(),
    )
    if (duplicateCi) {
      throw new Error('El documento de identidad ya se encuentra registrado con otro código SIS.')
    }
  }

  const saveStudent = async (payload: InscripcionPayload) => {
    await ensureNoRealDuplicate(payload)

    if (!examId || !exam) {
      throw new Error('Selecciona un examen antes de inscribir estudiantes.')
    }
    const response = await estudiantesService.enroll(examId, payload)
    setSuccess(response.message || 'Estudiante vinculado al examen correctamente.')
    await loadStudents()
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {examId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/examenes')}
              className="mb-2 p-0 h-auto font-semibold text-sci-blue hover:text-sci-navy cursor-pointer gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a exámenes
            </Button>
          )}
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
            Padrón Académico
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-sci-navy tracking-tight">
            {examId ? 'Estudiantes del examen' : 'Padrón de estudiantes'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {exam
              ? `${exam.nombre} · ${exam.materia?.nombre ?? 'Asignatura'} · ${exam.aula?.nombre ?? 'Aula asignada'}`
              : 'Consulta el padrón estudiantil oficial de la facultad.'}
          </p>
        </div>

        {canManage && examId && exam && (
          <Button
            type="button"
            onClick={openCreate}
            className="bg-sci-blue hover:opacity-90 text-white font-semibold cursor-pointer shadow-xs gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Agregar Estudiantes
          </Button>
        )}
      </header>

      {/* Resumen numérico */}
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sci-navy/10 text-sci-navy">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total registrados</p>
              <p className="text-2xl font-extrabold text-sci-navy">{total}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:col-span-2">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sci-cyan/15 text-sci-cyan">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Habilitados en esta vista</p>
              <p className="text-2xl font-extrabold text-sci-navy">{enabledCount}</p>
            </div>
          </div>
        </article>
      </div>

      {/* Buscador */}
      <form
        onSubmit={applySearch}
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por nombre, apellido, CI o código SIS..."
            className="h-10 pl-9 bg-background"
          />
        </div>
        <Button type="submit" variant="outline" className="h-10 cursor-pointer gap-2">
          <Search className="h-4 w-4" /> Buscar
        </Button>
      </form>

      {success && (
        <div className="rounded-xl border border-sci-cyan/30 bg-sci-cyan/10 px-4 py-3 text-xs text-sci-navy font-semibold" role="status">
          {success}
        </div>
      )}

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-sci-red/20 bg-sci-red/10 p-4 text-xs text-sci-red sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadStudents()}
            className="cursor-pointer gap-1 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </Button>
        </div>
      )}

      {/* Tabla y Tarjetas de Estudiantes */}
      {loading ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-border bg-card text-muted-foreground">
          <div className="text-center">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-sci-cyan" />
            <p className="mt-3 text-xs">Cargando padrón de estudiantes...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Vista Tabla Desktop */}
          <section className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-xs md:block">
            <table className="w-full table-fixed text-left text-xs">
              <thead className="border-b border-border bg-muted/50 text-muted-foreground font-semibold">
                <tr>
                  <th className="w-[30%] px-5 py-4">Estudiante</th>
                  <th className="w-[16%] px-5 py-4">Código SIS</th>
                  <th className="w-[16%] px-5 py-4">CI</th>
                  <th className="w-[24%] px-5 py-4">Correo institucional</th>
                  <th className="px-5 py-4 text-right">Estado / Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4 font-bold text-sci-navy truncate">
                      {fullName(student)}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{student.codigo_sis}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {student.ci}
                      {student.ci_extension ? ` ${student.ci_extension}` : ''}
                    </td>
                    <td className="break-all px-5 py-4 text-muted-foreground">
                      {student.email_institucional}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {examId && canManage ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(student)}
                          className="cursor-pointer gap-1 text-xs"
                          aria-label={`Editar ${fullName(student)}`}
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Editar
                        </Button>
                      ) : (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                            student.activo
                              ? 'border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy'
                              : 'border-sci-red/30 bg-sci-red/10 text-sci-red'
                          }`}
                        >
                          {student.pivot?.estado ?? (student.activo ? 'Activo' : 'Inactivo')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {visibleStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                      No se encontraron estudiantes registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          {/* Vista Tarjetas Móvil */}
          <section className="space-y-3 md:hidden">
            {visibleStudents.map((student) => (
              <article
                key={student.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="min-w-0 break-words font-bold text-sm text-sci-navy">
                    {fullName(student)}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                      student.activo
                        ? 'border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy'
                        : 'border-sci-red/30 bg-sci-red/10 text-sci-red'
                    }`}
                  >
                    {student.pivot?.estado ?? (student.activo ? 'Activo' : 'Inactivo')}
                  </span>
                </div>

                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Código SIS:</dt>
                    <dd className="font-medium text-foreground">{student.codigo_sis}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">CI:</dt>
                    <dd className="font-medium text-foreground">
                      {student.ci}
                      {student.ci_extension ? ` ${student.ci_extension}` : ''}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5 pt-1">
                    <dt className="text-muted-foreground">Correo:</dt>
                    <dd className="break-all font-medium text-foreground">
                      {student.email_institucional}
                    </dd>
                  </div>
                </dl>

                {examId && canManage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(student)}
                    className="mt-3 w-full cursor-pointer gap-1.5 text-xs"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Editar datos
                  </Button>
                )}
              </article>
            ))}

            {visibleStudents.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                No se encontraron estudiantes.
              </div>
            )}
          </section>
        </>
      )}

      {/* Paginación */}
      {!loading && total > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <span>
            Página {page} de {lastPage} · {total} estudiantes
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="cursor-pointer gap-1 text-xs"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
              disabled={page >= lastPage}
              className="cursor-pointer gap-1 text-xs"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {modalOpen && examId && exam && (
        <EstudianteFormModal
          key={editingStudent?.id ?? 'new'}
          estudiante={editingStudent}
          examMode={Boolean(examId)}
          onClose={() => setModalOpen(false)}
          onSubmit={saveStudent}
        />
      )}
    </div>
  )
}
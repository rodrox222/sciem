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
import { MainLayout } from '../layouts/MainLayout'
import { ApiError } from '../services/apiClient'
import {
  estudiantesService,
  type Estudiante,
  type InscripcionPayload,
} from '../services/estudiantes.service'
import { examenesService, type Examen } from '../services/examenes.service'

const PER_PAGE = 10

const getErrorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Ocurrió un error inesperado. Intenta nuevamente.'

const fullName = (student: Estudiante) =>
  [student.nombre, student.apellido_paterno, student.apellido_materno]
    .filter(Boolean)
    .join(' ')

const ESTADO_BADGE_STYLES: Record<string, string> = {
  Activo: 'bg-emerald-100 text-emerald-700',
  Inactivo: 'bg-slate-100 text-slate-600',
}

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
          estudiantesService.listByExam(examId, page),
          examenesService.get(examId),
        ])
        setStudents(studentResponse.data)
        setTotal(studentResponse.total)
        setLastPage(Math.max(studentResponse.last_page, 1))
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
      setError(getErrorMessage(loadError))
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
        student.codigo_sis.toLocaleLowerCase() ===
          payload.codigo_sis.toLocaleLowerCase() &&
        student.id !== editingStudent?.id &&
        (student.ci.toLocaleUpperCase() !== payload.ci.toLocaleUpperCase() ||
          (student.ci_extension ?? '').toLocaleUpperCase() !==
            (payload.ci_extension ?? '').toLocaleUpperCase() ||
          student.email_institucional.toLocaleLowerCase() !==
            payload.email_institucional.toLocaleLowerCase()),
    )
    if (duplicateSis) {
      throw new ApiError('El código SIS ya está registrado.', 422, {
        codigo_sis: ['El código SIS ya está registrado.'],
      })
    }

    const ciResponse = await estudiantesService.list({ search: payload.ci, perPage: 100 })
    const duplicateCi = ciResponse.data.find(
      (student) =>
        student.ci.toLocaleUpperCase() === payload.ci.toLocaleUpperCase() &&
        (student.ci_extension ?? '').toLocaleUpperCase() ===
          (payload.ci_extension ?? '').toLocaleUpperCase() &&
        student.id !== editingStudent?.id &&
        student.codigo_sis.toLocaleLowerCase() !==
          payload.codigo_sis.toLocaleLowerCase(),
    )
    if (duplicateCi) {
      throw new ApiError('El CI y complemento ya están registrados.', 422, {
        ci: ['El CI y complemento ya están registrados.'],
      })
    }
  }

  const saveStudent = async (payload: InscripcionPayload) => {
    await ensureNoRealDuplicate(payload)

    if (!examId || !exam) {
      throw new ApiError('Selecciona un examen antes de registrar estudiantes.', 422)
    }
    const response = await estudiantesService.enroll(examId, payload)
    setSuccess(response.message || 'Estudiante vinculado al examen correctamente.')
    await loadStudents()
  }

  return (
    <MainLayout>
      <section className="space-y-6">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {examId && (
              <button type="button" onClick={() => navigate('/examenes')} className="mb-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#0056B3] hover:text-[#003770]">
                <ArrowLeft className="h-4 w-4" /> Volver a exámenes
              </button>
            )}
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E30613]">
              Gestión académica
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-[#003770]">
              {examId ? 'Estudiantes del examen' : 'Padrón de estudiantes'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#64748B]">
              {exam
                ? `${exam.nombre} · ${exam.materia?.nombre ?? 'Asignatura'} · ${exam.aula?.nombre ?? 'Aula asignada'}`
                : 'Consulta el padrón. Para registrar, abre un examen y selecciona Estudiantes.'}
            </p>
          </div>

          {canManage && examId && exam && (
            <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0056B3] px-5 py-3 text-sm font-semibold text-white hover:bg-[#003770]">
              <UserPlus className="h-5 w-5" />
              Agregar al examen
            </button>
          )}
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-lg bg-[#0056B3]/10 text-[#0056B3]"><Users className="h-5 w-5" /></span><div><p className="text-xs text-[#64748B]">Total registrados</p><p className="text-2xl font-bold text-[#003770]">{total}</p></div></div>
          </article>
          <article className="rounded-xl border border-[#E2E8F0] bg-white p-4 sm:col-span-2">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-lg bg-[#168FBD]/10 text-[#168FBD]"><CheckCircle2 className="h-5 w-5" /></span><div><p className="text-xs text-[#64748B]">Activos o habilitados visibles</p><p className="text-2xl font-bold text-[#003770]">{enabledCount}</p></div></div>
          </article>
        </div>

        <form onSubmit={applySearch} className="grid gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5">
          <label className="relative block">
            <span className="sr-only">Buscar estudiante</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
            <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar por nombre, apellido, CI o código SIS" className="h-11 w-full rounded-lg border border-[#E2E8F0] pl-10 pr-3 text-sm outline-none focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/15" />
          </label>
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#0056B3] px-5 text-sm font-semibold text-[#0056B3] hover:bg-[#0056B3] hover:text-white"><Search className="h-4 w-4" />Buscar</button>
        </form>

        {success && <div className="rounded-lg border border-[#168FBD]/25 bg-[#168FBD]/8 px-4 py-3 text-sm text-[#08759E]" role="status">{success}</div>}
        {error && (
          <div className="flex flex-col gap-3 rounded-lg border border-[#E30613]/25 bg-[#E30613]/5 px-4 py-3 text-sm text-[#B0040E] sm:flex-row sm:items-center sm:justify-between" role="alert">
            <span className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</span>
            <button type="button" onClick={() => void loadStudents()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#E30613]/25 px-3 font-semibold hover:bg-white"><RefreshCw className="h-4 w-4" />Reintentar</button>
          </div>
        )}

        {loading ? (
          <div className="grid min-h-72 place-items-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B]"><div className="text-center"><LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#168FBD]" /><p className="mt-3 text-sm">Cargando estudiantes...</p></div></div>
        ) : (
          <>
            <section className="hidden overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm md:block">
              <table className="w-full table-fixed text-sm">
                <thead className="border-b border-[#E2E8F0] bg-[#F7F7F7] text-left text-[#64748B]"><tr><th className="w-[30%] px-5 py-4">Estudiante</th><th className="w-[16%] px-5 py-4">Código SIS</th><th className="w-[16%] px-5 py-4">CI</th><th className="w-[25%] px-5 py-4">Correo</th><th className="px-5 py-4 text-right">Acciones</th></tr></thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {visibleStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-[#F7F7F7]/70"><td className="px-5 py-4 font-semibold text-[#003770]">{fullName(student)}</td><td className="px-5 py-4 text-[#64748B]">{student.codigo_sis}</td><td className="px-5 py-4 text-[#64748B]">{student.ci}{student.ci_extension ? ` ${student.ci_extension}` : ''}</td><td className="break-all px-5 py-4 text-[#64748B]">{student.email_institucional}</td><td className="px-5 py-4 text-right">{examId && canManage ? <button type="button" onClick={() => openEdit(student)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#003770] hover:bg-[#0056B3]/5" aria-label={`Editar ${fullName(student)}`}><Edit3 className="h-4 w-4" /></button> : <span className="rounded-full bg-[#168FBD]/10 px-2.5 py-1 text-xs font-semibold text-[#08759E]">{student.pivot?.estado ?? (student.activo ? 'Activo' : 'Inactivo')}</span>}</td></tr>
                  ))}
                  {visibleStudents.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-[#64748B]">No se encontraron estudiantes.</td></tr>}
                </tbody>
              </table>
            </section>

            <section className="space-y-4 md:hidden">
              {visibleStudents.map((student) => (
                <article key={student.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="min-w-0 break-words font-bold text-[#003770]">{fullName(student)}</h2><span className="rounded-full bg-[#168FBD]/10 px-2.5 py-1 text-xs font-semibold text-[#08759E]">{student.pivot?.estado ?? (student.activo ? 'Activo' : 'Inactivo')}</span></div>
                  <dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-[#64748B]">Código SIS</dt><dd className="break-all font-semibold text-[#1E293B]">{student.codigo_sis}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#64748B]">CI</dt><dd className="break-all font-semibold text-[#1E293B]">{student.ci}{student.ci_extension ? ` ${student.ci_extension}` : ''}</dd></div><div className="flex flex-col gap-1"><dt className="text-[#64748B]">Correo</dt><dd className="break-all font-semibold text-[#1E293B]">{student.email_institucional}</dd></div></dl>
                  {examId && canManage && <button type="button" onClick={() => openEdit(student)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#003770] hover:bg-[#0056B3]/5"><Edit3 className="h-4 w-4" />Editar datos</button>}
                </article>
              ))}
              {visibleStudents.length === 0 && <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-white p-8 text-center text-sm text-[#64748B]">No se encontraron estudiantes.</div>}
            </section>
          </>
        )}

        {!loading && total > 0 && (
          <div className="flex flex-col gap-3 text-sm text-[#64748B] sm:flex-row sm:items-center sm:justify-between"><span>Página {page} de {lastPage} · {total} estudiantes</span><div className="flex gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-3 font-semibold text-[#003770] disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Anterior</button><button type="button" onClick={() => setPage((current) => Math.min(lastPage, current + 1))} disabled={page >= lastPage} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-3 font-semibold text-[#003770] disabled:opacity-40">Siguiente<ChevronRight className="h-4 w-4" /></button></div></div>
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
      </section>
    </MainLayout>
  )
}
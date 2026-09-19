import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react'

import { MainLayout } from '../layouts/MainLayout'
import { ApiError } from '../services/apiClient'
import {
  examenesService,
  type Examen,
  type ExamenEstado,
} from '../services/examenes.service'

const PER_PAGE = 9
const normalizeDate = (date: string) => date.slice(0, 10)
const normalizeTime = (time: string) => time.slice(0, 5)

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${normalizeDate(date)}T00:00:00Z`))

const estadoStyles: Record<ExamenEstado, string> = {
  Programado: 'border-[#168FBD]/30 bg-[#168FBD]/10 text-[#08759E]',
  'En proceso': 'border-[#D59A18]/30 bg-[#D59A18]/10 text-[#946807]',
  Terminado: 'border-[#64748B]/25 bg-[#64748B]/10 text-[#475569]',
}

const getErrorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Ocurrió un error inesperado. Intenta nuevamente.'

export default function ExamenesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const role = (localStorage.getItem('user_role') ?? '').toLowerCase()
  const canManage = ['admin', 'administrador', 'docente'].includes(role)

  const [exams, setExams] = useState<Examen[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState<ExamenEstado | ''>('')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Examen | null>(null)

  const success = (location.state as { success?: string } | null)?.success

  const loadExams = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await examenesService.list({
        search: searchTerm,
        estado: status,
        fecha: date,
        page,
        perPage: PER_PAGE,
      })
      setExams(response.data)
      setTotal(response.total)
      setLastPage(Math.max(response.last_page, 1))
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [date, page, searchTerm, status])

  useEffect(() => {
    const requestId = window.setTimeout(() => void loadExams(), 0)
    return () => window.clearTimeout(requestId)
  }, [loadExams])

  const pageCounts = useMemo(
    () => ({
      programmed: exams.filter((exam) => exam.estado === 'Programado').length,
      inProgress: exams.filter((exam) => exam.estado === 'En proceso').length,
    }),
    [exams],
  )

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setSearchTerm(searchInput.trim())
  }

  const resetFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setStatus('')
    setDate('')
    setPage(1)
  }

  const filterFields = (
    <>
      <label className="relative block md:col-span-2">
        <span className="sr-only">Buscar examen</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar por nombre del examen"
          className="h-11 w-full rounded-lg border border-[#E2E8F0] pl-10 pr-3 text-sm outline-none focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/15"
        />
      </label>
      <label>
        <span className="sr-only">Estado</span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as ExamenEstado | '')}
          className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#0056B3]"
        >
          <option value="">Todos los estados</option>
          <option value="Programado">Programado</option>
          <option value="En proceso">En proceso</option>
          <option value="Terminado">Terminado</option>
        </select>
      </label>
      <label>
        <span className="sr-only">Fecha</span>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#0056B3]"
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0056B3] px-4 text-sm font-semibold text-white hover:bg-[#003770]"
      >
        <Search className="h-4 w-4" /> Buscar
      </button>
      <button
        type="button"
        onClick={resetFilters}
        className="h-11 rounded-lg border border-[#E2E8F0] px-4 text-sm font-semibold text-[#64748B] hover:bg-[#F7F7F7]"
      >
        Limpiar
      </button>
    </>
  )

  return (
    <MainLayout>
      <section className="space-y-6">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#168FBD]">
              Gestión académica
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-[#003770]">Exámenes</h1>
            <p className="mt-2 text-sm text-[#64748B]">
              Consulta los horarios, ambientes y normas de las evaluaciones.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => navigate('/programar-examen')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0056B3] px-5 py-3 text-sm font-semibold text-white hover:bg-[#003770]"
            >
              <Plus className="h-5 w-5" /> Programar examen
            </button>
          )}
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-xs text-[#64748B]">Exámenes registrados</p>
            <p className="mt-1 text-2xl font-bold text-[#003770]">{total}</p>
          </article>
          <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-xs text-[#64748B]">Programados en esta página</p>
            <p className="mt-1 text-2xl font-bold text-[#168FBD]">{pageCounts.programmed}</p>
          </article>
          <article className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-xs text-[#64748B]">En proceso en esta página</p>
            <p className="mt-1 text-2xl font-bold text-[#D59A18]">{pageCounts.inProgress}</p>
          </article>
        </div>

        {success && (
          <div className="rounded-lg border border-[#168FBD]/25 bg-[#168FBD]/8 px-4 py-3 text-sm text-[#08759E]" role="status">
            {success}
          </div>
        )}

        <details className="rounded-xl border border-[#E2E8F0] bg-white md:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-[#003770]">
            Filtros de exámenes <ChevronDown className="h-4 w-4" />
          </summary>
          <form onSubmit={applyFilters} className="grid gap-3 border-t border-[#E2E8F0] p-4">
            {filterFields}
          </form>
        </details>

        <form
          onSubmit={applyFilters}
          className="hidden grid-cols-2 gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm md:grid lg:grid-cols-6"
        >
          {filterFields}
        </form>

        {error && (
          <div className="flex flex-col gap-3 rounded-xl border border-[#E30613]/25 bg-[#E30613]/5 p-4 text-sm text-[#B0040E] sm:flex-row sm:items-center sm:justify-between" role="alert">
            <span className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</span>
            <button type="button" onClick={() => void loadExams()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#E30613]/25 px-3 font-semibold hover:bg-white">
              <RefreshCw className="h-4 w-4" /> Reintentar
            </button>
          </div>
        )}

        <section className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
          {loading ? (
            <div className="grid min-h-72 place-items-center text-[#64748B]">
              <div className="text-center"><LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#168FBD]" /><p className="mt-3 text-sm">Cargando exámenes...</p></div>
            </div>
          ) : exams.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {exams.map((exam) => (
                <article key={exam.id} className="relative flex min-h-72 flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className="absolute inset-x-0 top-0 h-1 bg-[#0056B3]" />
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${estadoStyles[exam.estado]}`}>{exam.estado}</span>
                    <span className="text-xs font-semibold text-[#64748B]">{exam.materia?.nombre ?? 'Asignatura'}</span>
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-[#003770]">{exam.nombre}</h2>
                  <dl className="mt-4 space-y-3 text-sm text-[#64748B]">
                    <div className="flex gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#168FBD]" /><div><dt className="sr-only">Fecha</dt><dd>{formatDate(exam.fecha)}</dd></div></div>
                    <div className="flex gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#168FBD]" /><div><dt className="sr-only">Horario</dt><dd>{normalizeTime(exam.hora_ini)} - {normalizeTime(exam.hora_fin)}</dd></div></div>
                    <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#168FBD]" /><div><dt className="sr-only">Aula</dt><dd>{exam.aula?.nombre ?? 'Aula asignada'}</dd></div></div>
                  </dl>
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-[#E2E8F0] pt-4">
                    <button type="button" onClick={() => navigate(`/estudiantes?examen=${exam.id}`)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#168FBD]/30 px-3 text-sm font-semibold text-[#08759E] hover:bg-[#168FBD]/8"><Users className="h-4 w-4" /> Estudiantes</button>
                    <button type="button" onClick={() => setSelected(exam)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] px-3 text-sm font-semibold text-[#003770] hover:bg-[#F7F7F7]"><Eye className="h-4 w-4" /> Ver</button>
                    {canManage && exam.estado === 'Programado' && (
                      <button type="button" onClick={() => navigate(`/programar-examen?edit=${exam.id}`)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#0056B3] px-3 text-sm font-semibold text-white hover:bg-[#003770]"><Pencil className="h-4 w-4" /> Editar</button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-[#E2E8F0] bg-[#F7F7F7] px-6 text-center">
              <div><CalendarDays className="mx-auto h-10 w-10 text-[#168FBD]" /><h2 className="mt-3 text-lg font-bold text-[#003770]">No se encontraron exámenes</h2><p className="mt-1 text-sm text-[#64748B]">Ajusta los filtros o programa una nueva evaluación.</p></div>
            </div>
          )}

          {!loading && total > 0 && (
            <div className="mt-5 flex flex-col gap-3 border-t border-[#E2E8F0] pt-4 text-sm text-[#64748B] sm:flex-row sm:items-center sm:justify-between">
              <span>Página {page} de {lastPage} · {total} exámenes</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 font-semibold text-[#003770] disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Anterior</button>
                <button type="button" onClick={() => setPage((current) => Math.min(lastPage, current + 1))} disabled={page >= lastPage} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 font-semibold text-[#003770] disabled:opacity-40">Siguiente<ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </section>

        {selected && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#1E293B]/45 px-4 py-6 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
            <section role="dialog" aria-modal="true" aria-labelledby="exam-detail-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border-t-4 border-[#168FBD] bg-white shadow-2xl">
              <header className="flex items-start justify-between border-b border-[#E2E8F0] p-5">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#168FBD]">Detalle del examen</p><h2 id="exam-detail-title" className="mt-1 text-xl font-bold text-[#003770]">{selected.nombre}</h2></div>
                <button type="button" onClick={() => setSelected(null)} className="grid h-11 w-11 place-items-center rounded-lg text-[#64748B] hover:bg-[#F7F7F7]" aria-label="Cerrar detalle"><X className="h-5 w-5" /></button>
              </header>
              <div className="space-y-4 p-5 text-sm text-[#1E293B]">
                <p><strong>Asignatura:</strong> {selected.materia?.nombre ?? 'Sin detalle'}</p>
                <p><strong>Fecha:</strong> {formatDate(selected.fecha)}</p>
                <p><strong>Horario:</strong> {normalizeTime(selected.hora_ini)} - {normalizeTime(selected.hora_fin)}</p>
                <p><strong>Aula:</strong> {selected.aula?.nombre ?? 'Sin detalle'}</p>
                <p><strong>Docente:</strong> {selected.docente ? `${selected.docente.nombre} ${selected.docente.apellido_paterno ?? ''}` : 'Sin detalle'}</p>
                <div><strong>Normas:</strong>{selected.normas?.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-[#64748B]">{selected.normas.map((rule) => <li key={rule.id}>{rule.titulo}</li>)}</ul> : <p className="mt-1 text-[#64748B]">Sin normas asociadas.</p>}</div>
              </div>
            </section>
          </div>
        )}
      </section>
    </MainLayout>
  )
}

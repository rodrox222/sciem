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
} from 'lucide-react'

import {
  examenesService,
  type Examen,
  type ExamenEstado,
} from '../services/examenes.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const PER_PAGE = 9
const normalizeDate = (date: string) => (date ? date.slice(0, 10) : '')
const normalizeTime = (time: string) => (time ? time.slice(0, 5) : '')

const formatDate = (date: string) => {
  if (!date) return 'Fecha por confirmar'
  const normalized = normalizeDate(date)
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${normalized}T00:00:00Z`))
}

const estadoStyles: Record<ExamenEstado, string> = {
  Programado: 'border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy',
  'En proceso': 'border-sci-amber/30 bg-sci-amber/10 text-sci-amber',
  Terminado: 'border-muted-foreground/30 bg-muted text-muted-foreground',
}

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
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudo consultar el listado de exámenes.',
      )
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
      <div className="relative md:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar por nombre del examen..."
          className="h-10 pl-9 bg-background"
        />
      </div>

      <div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as ExamenEstado | '')}
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
        >
          <option value="">Todos los estados</option>
          <option value="Programado">Programado</option>
          <option value="En proceso">En proceso</option>
          <option value="Terminado">Terminado</option>
        </select>
      </div>

      <div>
        <Input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="h-10 bg-background"
        />
      </div>

      <Button type="submit" variant="default" className="bg-sci-blue hover:opacity-90 text-white cursor-pointer h-10 gap-2">
        <Search className="h-4 w-4" /> Buscar
      </Button>

      <Button type="button" variant="outline" onClick={resetFilters} className="h-10 cursor-pointer">
        Limpiar
      </Button>
    </>
  )

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
            Gestión Académica
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-sci-navy tracking-tight">
            Exámenes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta los horarios, ambientes asignados y normativas de las evaluaciones académicas.
          </p>
        </div>

        {canManage && (
          <Button
            type="button"
            onClick={() => navigate('/programar-examen')}
            className="bg-sci-blue hover:opacity-90 text-white font-semibold cursor-pointer shadow-xs gap-2"
          >
            <Plus className="h-4 w-4" /> Programar examen
          </Button>
        )}
      </header>

      {/* Resumen numérico */}
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <p className="text-xs text-muted-foreground font-medium">Exámenes registrados</p>
          <p className="mt-1 text-2xl font-extrabold text-sci-navy">{total}</p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <p className="text-xs text-muted-foreground font-medium">Programados en esta página</p>
          <p className="mt-1 text-2xl font-extrabold text-sci-cyan">{pageCounts.programmed}</p>
        </article>
        <article className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <p className="text-xs text-muted-foreground font-medium">En proceso en esta página</p>
          <p className="mt-1 text-2xl font-extrabold text-sci-amber">{pageCounts.inProgress}</p>
        </article>
      </div>

      {success && (
        <div className="rounded-xl border border-sci-cyan/30 bg-sci-cyan/10 px-4 py-3 text-xs text-sci-navy font-semibold" role="status">
          {success}
        </div>
      )}

      {/* Filtros Móvil (Accordion) */}
      <details className="rounded-2xl border border-border bg-card md:hidden shadow-xs">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 font-semibold text-sm text-sci-navy">
          Filtros de exámenes <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </summary>
        <form onSubmit={applyFilters} className="grid gap-3 border-t border-border p-4">
          {filterFields}
        </form>
      </details>

      {/* Filtros Desktop */}
      <form
        onSubmit={applyFilters}
        className="hidden grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-5 shadow-xs md:grid lg:grid-cols-6"
      >
        {filterFields}
      </form>

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
            onClick={() => void loadExams()}
            className="cursor-pointer gap-1 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </Button>
        </div>
      )}

      {/* Listado de Exámenes */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        {loading ? (
          <div className="grid min-h-72 place-items-center text-muted-foreground">
            <div className="text-center">
              <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-sci-cyan" />
              <p className="mt-3 text-xs">Cargando evaluaciones programadas...</p>
            </div>
          </div>
        ) : exams.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {exams.map((exam) => (
              <article
                key={exam.id}
                className="relative flex min-h-72 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-sci-blue" />
                
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${estadoStyles[exam.estado]}`}>
                      {exam.estado}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground truncate max-w-[140px]">
                      {exam.materia?.nombre ?? 'Asignatura'}
                    </span>
                  </div>

                  <h2 className="mt-4 text-base font-bold text-sci-navy">
                    {exam.nombre}
                  </h2>

                  <dl className="mt-4 space-y-2.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0 text-sci-cyan" />
                      <div><dt className="sr-only">Fecha</dt><dd>{formatDate(exam.fecha)}</dd></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 shrink-0 text-sci-cyan" />
                      <div><dt className="sr-only">Horario</dt><dd>{normalizeTime(exam.hora_ini)} - {normalizeTime(exam.hora_fin)}</dd></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-sci-cyan" />
                      <div><dt className="sr-only">Aula</dt><dd>{exam.aula?.nombre ?? 'Aula por confirmar'}</dd></div>
                    </div>
                  </dl>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/estudiantes?examen=${exam.id}`)}
                    className="flex-1 text-xs cursor-pointer gap-1.5"
                  >
                    <Users className="h-3.5 w-3.5 text-sci-cyan" /> Estudiantes
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(exam)}
                    className="flex-1 text-xs cursor-pointer gap-1.5"
                  >
                    <Eye className="h-3.5 w-3.5" /> Ver
                  </Button>

                  {canManage && exam.estado === 'Programado' && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => navigate(`/programar-examen?edit=${exam.id}`)}
                      className="bg-sci-blue hover:opacity-90 text-white flex-1 text-xs cursor-pointer gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border p-8 text-center">
            <div>
              <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-3 text-base font-bold text-foreground">No se encontraron exámenes</h2>
              <p className="mt-1 text-xs text-muted-foreground">Ajusta los filtros de búsqueda o programa una nueva evaluación.</p>
            </div>
          </div>
        )}

        {/* Paginación */}
        {!loading && total > 0 && (
          <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Página {page} de {lastPage} · {total} exámenes
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
      </section>

      {/* Modal Detalle del Examen */}
      {selected && (
        <Dialog open onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-w-lg p-0 overflow-hidden border-border bg-card text-card-foreground shadow-2xl rounded-2xl">
            <DialogHeader className="border-b border-border px-6 py-5 text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sci-cyan">
                Detalle de la evaluación
              </span>
              <DialogTitle className="mt-1 text-xl font-bold text-sci-navy">
                {selected.nombre}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Información técnica y académica del examen programado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 px-6 py-5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="font-semibold text-foreground">Asignatura:</span>
                <span className="text-muted-foreground">{selected.materia?.nombre ?? 'Sin detalle'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="font-semibold text-foreground">Fecha:</span>
                <span className="text-muted-foreground">{formatDate(selected.fecha)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="font-semibold text-foreground">Horario:</span>
                <span className="text-muted-foreground">
                  {normalizeTime(selected.hora_ini)} – {normalizeTime(selected.hora_fin)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="font-semibold text-foreground">Ambiente:</span>
                <span className="text-muted-foreground">{selected.aula?.nombre ?? 'Sin detalle'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="font-semibold text-foreground">Docente responsable:</span>
                <span className="text-muted-foreground">
                  {selected.docente
                    ? `${selected.docente.nombre} ${selected.docente.apellido_paterno ?? ''}`.trim()
                    : 'Sin detalle'}
                </span>
              </div>

              <div className="pt-2">
                <span className="font-semibold text-foreground block mb-2">Normativas aplicables:</span>
                {selected.normas?.length ? (
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {selected.normas.map((rule) => (
                      <li key={rule.id}>{rule.titulo}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground italic">Sin normas particulares asociadas.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-border bg-muted/40 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelected(null)}
                className="cursor-pointer text-xs"
              >
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
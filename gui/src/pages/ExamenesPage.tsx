import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Plus,
  RefreshCw,
} from 'lucide-react'

import {
  examenesService,
  type Examen,
  type ExamenEstado,
} from '../services/examenes.service'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'

import { ExamenMetrics } from '@/components/examenes/ExamenMetrics'
import { ExamenFilters } from '@/components/examenes/ExamenFilters'
import { ExamenCard } from '@/components/examenes/ExamenCard'
import { ExamenDetailModal } from '@/components/examenes/ExamenDetailModal'

const PER_PAGE = 9

export default function ExamenesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const role = (localStorage.getItem('user_role') ?? '').toLowerCase()
  const canManage = ['admin', 'administrador', 'docente'].includes(role)

  const [exams, setExams] = useState<Examen[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState<ExamenEstado | 'all'>('all')
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
      const response = await examenesService.misExamenes({
        search: searchTerm,
        estado: status === 'all' ? '' : status,
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

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setSearchTerm(searchInput.trim())
  }

  const handleResetFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setStatus('all')
    setDate('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
            Gestión Académica
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-sci-navy sm:text-3xl">
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
            className="cursor-pointer gap-2 bg-sci-blue font-semibold text-white shadow-xs hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Programar examen
          </Button>
        )}
      </header>

      {/* Resumen numérico */}
      <ExamenMetrics
        total={total}
        programmedCount={pageCounts.programmed}
        inProgressCount={pageCounts.inProgress}
      />

      {success && (
        <div className="rounded-xl border border-sci-cyan/30 bg-sci-cyan/10 px-4 py-3 text-xs font-semibold text-sci-navy" role="status">
          {success}
        </div>
      )}

      {/* Filtros */}
      <ExamenFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        status={status}
        onStatusChange={setStatus}
        date={date}
        onDateChange={setDate}
        onSubmit={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {/* Alerta de error */}
      {error && (
        <Alert variant="destructive" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <div>
              <AlertTitle className="text-xs font-semibold">Error al cargar</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadExams()}
            className="cursor-pointer gap-1 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </Button>
        </Alert>
      )}

      {/* Contenedor del Listado */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardContent className="p-5">
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
                <ExamenCard
                  key={exam.id}
                  exam={exam}
                  canManage={canManage}
                  onSelect={setSelected}
                />
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
        </CardContent>
      </Card>

      {/* Modal de Detalle */}
      <ExamenDetailModal
        exam={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
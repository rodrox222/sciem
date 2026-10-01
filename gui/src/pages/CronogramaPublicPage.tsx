import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, Clock3, MapPin, CalendarX2 } from 'lucide-react'
import { examenesService, type Examen } from '../services/examenes.service'
import type { PaginatedResponse } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const dateLabel = (value: string) => {
  const date = new Date(value.slice(0, 10) + 'T12:00:00')
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-BO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(date)
}

export default function CronogramaPublicPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const date = searchParams.get('fecha') ?? ''
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<{ key: string; value: PaginatedResponse<Examen> } | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const key = `${date}:${page}`
  const loading = result?.key !== key && error === null

  useEffect(() => {
    document.title = 'Cronograma de exámenes | SCI'
    let active = true

    examenesService
      .list({ fecha: date, page, perPage: 10 })
      .then((value) => {
        if (active) {
          setResult({ key, value })
          setError(null)
        }
      })
      .catch(() => {
        if (active) {
          setResult(null)
          setError('No se pudo consultar el cronograma institucional. Vuelve a intentarlo más tarde.')
        }
      })

    return () => {
      active = false
    }
  }, [date, page, key])

  const changeDate = (value: string) => {
    setPage(1)
    setResult(null)
    setError(null)
    setSearchParams(value ? { fecha: value } : {})
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Encabezado de la página */}
      <div className="mb-8">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
          Agenda académica oficial
        </span>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-sci-navy sm:text-4xl">
          Cronograma de exámenes
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl leading-relaxed">
          Consulta los horarios, ambientes asignados y evaluaciones programadas en la Facultad de Ciencias y Tecnología.
        </p>
      </div>

      {/* Barra de Filtros */}
      <div className="mb-8 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="space-y-1.5 text-left w-full sm:w-auto">
          <Label htmlFor="fecha-cronograma" className="text-xs font-semibold text-foreground">
            Filtrar por fecha
          </Label>
          <Input
            id="fecha-cronograma"
            type="date"
            value={date}
            onChange={(e) => changeDate(e.target.value)}
            className="h-11 w-full sm:w-60 bg-background text-sm"
          />
        </div>

        {date && (
          <Button
            type="button"
            variant="outline"
            onClick={() => changeDate('')}
            className="h-11 text-xs font-semibold text-sci-blue border-sci-blue/30 hover:bg-sci-blue/10 cursor-pointer"
          >
            Mostrar todas las fechas
          </Button>
        )}
      </div>

      {/* Resultados / Lista de Exámenes */}
      <div aria-live="polite">
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-xs">
            Cargando cronograma oficial…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-sci-red/20 bg-sci-red/10 p-8 text-center text-sm font-medium text-sci-red">
            {error}
          </div>
        ) : result?.value.data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-xs">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <CalendarX2 className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-foreground">Sin evaluaciones registradas</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              No existen exámenes programados{date ? ` para la fecha ${dateLabel(date)}` : ''}.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {result?.value.data.map((exam: Examen) => (
              <article
                key={exam.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-bold text-foreground">{exam.nombre}</h2>
                    <span className="shrink-0 rounded-full border border-sci-cyan/30 bg-sci-cyan/10 px-2.5 py-0.5 text-[11px] font-semibold text-sci-cyan">
                      {exam.estado}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-sci-blue">
                    {exam.materia?.nombre ?? 'Materia no especificada'}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <CalendarDays className="h-4 w-4 text-sci-cyan" />
                    {dateLabel(exam.fecha)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Clock3 className="h-4 w-4 text-sci-cyan" />
                    {exam.hora_ini.slice(0, 5)} – {exam.hora_fin.slice(0, 5)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <MapPin className="h-4 w-4 text-sci-cyan" />
                    {exam.aula?.nombre ?? 'Aula por confirmar'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Paginación */}
      {!loading && !error && result && result.value.last_page > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
          <p>
            Página <span className="font-semibold text-foreground">{result.value.current_page}</span> de{' '}
            <span className="font-semibold text-foreground">{result.value.last_page}</span> · Total:{' '}
            <span className="font-semibold text-foreground">{result.value.total}</span> exámenes
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                setResult(null)
                setPage((p) => Math.max(1, p - 1))
              }}
              className="text-xs cursor-pointer"
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= result.value.last_page}
              onClick={() => {
                setResult(null)
                setPage((p) => p + 1)
              }}
              className="text-xs cursor-pointer"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
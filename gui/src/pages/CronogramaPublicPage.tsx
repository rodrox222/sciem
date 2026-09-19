import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, Clock3, MapPin } from 'lucide-react'
import { HomeNavbar } from '../components/home/HomeNavbar'
import { Footer } from '../components/Footer'
import { examenesService, type Examen } from '../services/examenes.service'
import type { PaginatedResponse } from '../services/aulas.service'

const dateLabel = (value: string) => {
  const date = new Date(value.slice(0, 10) + 'T12:00:00')
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-BO', {
    day: '2-digit', month: 'long', year: 'numeric',
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
    examenesService.list({ fecha: date, page, perPage: 10 })
      .then((value) => {
        if (active) {
          setResult({ key, value })
          setError(null)
        }
      })
      .catch(() => {
        if (active) {
          setResult(null)
          setError('No se pudo consultar el cronograma. Vuelve a intentarlo más tarde.')
        }
      })
    return () => { active = false }
  }, [date, page, key])

  const changeDate = (value: string) => {
    setPage(1)
    setResult(null)
    setError(null)
    setSearchParams(value ? { fecha: value } : {})
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f8fc] text-[#193657]">
      <HomeNavbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Agenda académica</p>
        <h1 className="mt-2 text-3xl font-extrabold">Cronograma de exámenes</h1>
        <p className="mt-2 text-sm text-slate-600">Consulta las evaluaciones registradas en SCI.</p>
        <div className="mt-7 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-sm font-semibold" htmlFor="fecha-cronograma">
            Fecha del examen
            <input id="fecha-cronograma" type="date" value={date} onChange={(event) => changeDate(event.target.value)}
              className="mt-2 block min-h-11 rounded-lg border border-slate-300 px-3 text-sm" />
          </label>
          {date && <button type="button" onClick={() => changeDate('')} className="min-h-11 rounded-lg border border-sky-300 px-4 text-sm font-semibold text-[#0056B3]">Mostrar todas las fechas</button>}
        </div>
        <div aria-live="polite" className="mt-6">
          {loading ? <p className="rounded-xl border border-slate-200 bg-white p-8 text-center">Cargando cronograma…</p>
            : error ? <p className="rounded-xl border border-rose-200 bg-white p-8 text-center text-rose-700">{error}</p>
              : result?.value.data.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-8 text-center">No hay exámenes registrados{date ? ' para esta fecha' : ''}.</p>
                : <div className="grid gap-4 md:grid-cols-2">
                  {result?.value.data.map((exam) => (
                    <article key={exam.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-lg font-bold">{exam.nombre}</h2>
                        <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">{exam.estado}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{exam.materia?.nombre ?? 'Materia por confirmar'}</p>
                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{dateLabel(exam.fecha)}</span>
                        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{exam.hora_ini.slice(0, 5)} – {exam.hora_fin.slice(0, 5)}</span>
                        <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{exam.aula?.nombre ?? 'Aula por confirmar'}</span>
                      </div>
                    </article>
                  ))}
                </div>}
        </div>
        {!loading && !error && result && result.value.last_page > 1 && (
          <div className="mt-6 flex items-center justify-between gap-3 text-sm">
            <p>Página {result.value.current_page} de {result.value.last_page} · {result.value.total} exámenes</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => { setResult(null); setPage(page - 1) }} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 disabled:opacity-50">Anterior</button>
              <button type="button" disabled={page >= result.value.last_page} onClick={() => { setResult(null); setPage(page + 1) }} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

// src/pages/HomePage.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MetricsBar } from '../components/home/MetricsBar'
import { ExamCard } from '../components/home/ExamCard'
import { MiniCalendar } from '../components/home/MiniCalendar'
import { CronogramaCard } from '../components/home/CronogramaCard'
import { Button } from '@/components/ui/button'
import { examenesService, type Examen } from '../services/examenes.service'

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const weekDaysFor = (date: Date) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, index) =>
    new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index))
}

const hours = (exam: Examen) => `${exam.hora_ini.slice(0, 5)} – ${exam.hora_fin.slice(0, 5)}`

export const HomePage = () => {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [weekExams, setWeekExams] = useState<Record<string, Examen[]>>({})
  const [failedDates, setFailedDates] = useState<string[]>([])
  const [loadedWeek, setLoadedWeek] = useState<string | null>(null)
  
  const weekDays = weekDaysFor(selectedDate)
  const weekKey = localDate(weekDays[0])
  const selectedKey = localDate(selectedDate)
  const loading = loadedWeek !== weekKey

  useEffect(() => {
    document.title = 'Inicio | SCI'
    let today = localDate(new Date())
    const timer = window.setInterval(() => {
      const next = localDate(new Date())
      if (next !== today) {
        const previous = today
        today = next
        setSelectedDate((current) => localDate(current) === previous ? new Date() : current)
      }
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true
    const monday = new Date(weekKey + 'T12:00:00')
    const days = weekDaysFor(monday)
    Promise.allSettled(days.map((day) =>
      examenesService.list({ fecha: localDate(day), perPage: 100 })
    )).then((results) => {
      if (!active) return
      const exams: Record<string, Examen[]> = {}
      const failed: string[] = []
      results.forEach((result, index) => {
        const day = localDate(days[index])
        if (result.status === 'fulfilled') {
          exams[day] = result.value.data.filter((exam) => exam.estado !== 'Terminado')
        } else {
          failed.push(day)
        }
      })
      setWeekExams(exams)
      setFailedDates(failed)
      setLoadedWeek(weekKey)
    })
    return () => { active = false }
  }, [weekKey])

  const examsForDay = weekExams[selectedKey] ?? []
  const scrollToAgenda = () => document.getElementById('proximos-examenes')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="w-full">
      {/* Hero Institucional */}
      <section className="relative overflow-hidden bg-sci-navy">
        <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-11">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <MiniCalendar 
                selectedDate={selectedDate} 
                onSelectDate={setSelectedDate} 
                examDates={Object.keys(weekExams).filter((day) => weekExams[day].length > 0)} 
              />
            </div>
            
            <div className="lg:col-span-4">
              <span className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
                Plataforma institucional FCyT
              </span>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[42px]">
                Tu información<br />académica,<span className="block text-sci-cyan">en un solo lugar.</span>
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-200 sm:text-base">
                Consulta cronogramas, ambientes y comunicados oficiales.
              </p>
              
              <div className="mt-6 flex flex-wrap gap-3">
                <Button 
                  onClick={() => navigate('/cronograma')} 
                  className="bg-sci-blue text-white hover:opacity-90 font-semibold shadow-xs cursor-pointer"
                >
                  Consultar cronograma
                </Button>
                <Button 
                  onClick={scrollToAgenda} 
                  variant="outline"
                  className="bg-card text-sci-navy hover:bg-muted border-none font-semibold shadow-xs cursor-pointer"
                >
                  Ver próximos exámenes
                </Button>
              </div>
            </div>
            
            <CronogramaCard />
          </div>
        </div>
      </section>

      {/* Indicadores de métricas */}
      <section className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <MetricsBar />
        </div>
      </section>

      {/* Agenda de Próximos Exámenes */}
      <section id="proximos-examenes" className="mx-auto w-full max-w-7xl scroll-mt-32 px-5 py-6 sm:px-6 lg:px-8">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
              Agenda académica
            </span>
            <h2 className="mt-1 text-2xl font-bold text-sci-navy sm:text-3xl">
              Próximos exámenes
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecciona un día del calendario para ver sus evaluaciones.
            </p>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/cronograma')} 
            className="text-sci-blue hover:text-sci-navy hover:bg-transparent font-semibold p-0 cursor-pointer"
          >
            Ver todos →
          </Button>
        </div>

        {/* Selector de días móvil */}
        <div className="mb-5 flex gap-2.5 overflow-x-auto pb-2 sm:hidden">
          {weekDays.map((day) => {
            const key = localDate(day)
            const selected = key === selectedKey
            return (
              <button 
                key={key} 
                type="button" 
                onClick={() => setSelectedDate(day)}
                aria-pressed={selected}
                className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl font-bold transition-colors cursor-pointer ${
                  selected 
                    ? 'bg-sci-navy text-white shadow-xs' 
                    : 'border border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <span className="text-lg">{day.getDate()}</span>
                {(weekExams[key]?.length ?? 0) > 0 && (
                  <span className={`mt-1 h-1.5 w-1.5 rounded-full ${selected ? 'bg-white' : 'bg-sci-cyan'}`} />
                )}
              </button>
            )
          })}
        </div>

        {/* Lista de tarjetas */}
        <div aria-live="polite" className="grid gap-4 sm:grid-cols-2">
          {loading ? (
            <p className="col-span-full rounded-xl bg-card border border-border p-8 text-center text-muted-foreground">
              Consultando exámenes…
            </p>
          ) : failedDates.includes(selectedKey) ? (
            <p className="col-span-full rounded-xl bg-card border border-border p-8 text-center text-muted-foreground">
              No se pudieron consultar los exámenes de este día. Inténtalo de nuevo más tarde.
            </p>
          ) : examsForDay.length > 0 ? (
            examsForDay.map((exam, index) => (
              <ExamCard 
                key={exam.id} 
                materia={exam.nombre} 
                aula={exam.aula?.nombre ?? 'Aula por confirmar'}
                horario={hours(exam)} 
                estado={exam.estado}
                tipoBorde={index % 2 === 0 ? 'cyan' : 'amber'}
                onDetails={() => navigate(`/cronograma?fecha=${selectedKey}`)} 
              />
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-2xl">
                📅
              </div>
              <h3 className="font-bold text-foreground">No hay evaluaciones programadas</h3>
              <p className="mt-2 text-sm text-muted-foreground">No existen exámenes registrados para esta fecha.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default HomePage
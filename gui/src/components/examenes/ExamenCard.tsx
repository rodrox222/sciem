import { useNavigate } from 'react-router-dom'
import { CalendarDays, Clock3, MapPin, ChevronRight, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { Examen, ExamenEstado } from '@/services/examenes.service'

interface ExamenCardProps {
  exam: Examen
  canManage?: boolean
  onSelect?: (exam: Examen) => void
}

const estadoBadges: Record<ExamenEstado, string> = {
  Programado: 'border-sci-cyan/30 bg-sci-cyan/10 text-sci-navy',
  'En proceso': 'border-sci-amber/30 bg-sci-amber/10 text-sci-amber',
  Terminado: 'border-muted-foreground/30 bg-muted text-muted-foreground',
}

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

export function ExamenCard({ exam, canManage = false, onSelect }: ExamenCardProps) {
  const navigate = useNavigate()

  const handleAction = () => {
    if (onSelect) {
      onSelect(exam)
    }
    navigate(`/examenes/${exam.id}`)
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleAction}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleAction()
        }
      }}
      className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border-border bg-card shadow-xs transition duration-200 hover:-translate-y-1 hover:border-sci-blue/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sci-blue/30"
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-sci-blue group-hover:h-1.5 transition-all" />

      <div>
        <CardHeader className="p-5 pb-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estadoBadges[exam.estado]}`}>
              {exam.estado}
            </Badge>
            <span className="flex items-center gap-1 max-w-[150px] truncate text-xs font-semibold text-muted-foreground">
              <BookOpen className="h-3 w-3 shrink-0 text-sci-cyan" />
              <span className="truncate">{exam.materia?.nombre ?? 'Asignatura'}</span>
            </span>
          </div>

          <h2 className="mt-4 text-base font-bold text-sci-navy group-hover:text-sci-blue transition-colors">
            {exam.nombre}
          </h2>
        </CardHeader>

        <CardContent className="p-5 pt-4">
          <dl className="space-y-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-sci-cyan" />
              <dd>{formatDate(exam.fecha)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 shrink-0 text-sci-cyan" />
              <dd>{normalizeTime(exam.hora_ini)} - {normalizeTime(exam.hora_fin)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-sci-cyan" />
              <dd>{exam.aula?.nombre ?? 'Aula por confirmar'}</dd>
            </div>
          </dl>
        </CardContent>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3 text-xs font-semibold text-sci-blue group-hover:bg-sci-blue/5">
        <span>{canManage ? 'Gestionar evaluación' : 'Ver evaluación'}</span>
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Card>
  )
}
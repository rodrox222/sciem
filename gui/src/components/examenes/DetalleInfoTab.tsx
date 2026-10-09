import { CalendarDays, Clock3, MapPin, UserRound, BookOpen, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Examen } from '@/services/examenes.service'

const normalizeDate = (date: string) => (date ? date.slice(0, 10) : '')
const normalizeTime = (time: string) => (time ? time.slice(0, 5) : '')

const formatDate = (date: string) => {
  if (!date) return 'Fecha por confirmar'
  const normalized = normalizeDate(date)
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${normalized}T00:00:00Z`))
}

export function DetalleInfoTab({ exam }: { exam: Examen }) {
  const teacherName = exam.docente
    ? [exam.docente.nombre, exam.docente.apellido ?? [exam.docente.apellido_paterno, exam.docente.apellido_materno].filter(Boolean).join(' ')].filter(Boolean).join(' ')
    : 'No asignado'

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Datos técnicos principales */}
      <Card className="rounded-2xl border-border bg-card shadow-xs md:col-span-2">
        <CardHeader className="border-b border-border p-5">
          <CardTitle className="text-base font-bold text-sci-navy">
            Ficha Técnica de la Evaluación
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 py-3 gap-1">
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <BookOpen className="h-4 w-4 text-sci-cyan" /> Asignatura:
            </span>
            <span className="sm:col-span-2 text-muted-foreground font-medium">
              {exam.materia?.nombre ?? 'Sin especificar'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 py-3 gap-1">
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <CalendarDays className="h-4 w-4 text-sci-cyan" /> Fecha programada:
            </span>
            <span className="sm:col-span-2 text-muted-foreground font-medium">
              {formatDate(exam.fecha)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 py-3 gap-1">
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <Clock3 className="h-4 w-4 text-sci-cyan" /> Rango horario:
            </span>
            <span className="sm:col-span-2 text-muted-foreground font-medium">
              {normalizeTime(exam.hora_ini)} a {normalizeTime(exam.hora_fin)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 py-3 gap-1">
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-sci-cyan" /> Aula asignada:
            </span>
            <span className="sm:col-span-2 text-muted-foreground font-medium">
              {exam.aula?.nombre ?? 'Por coordinar'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 py-3 gap-1">
            <span className="flex items-center gap-2 font-semibold text-foreground">
              <UserRound className="h-4 w-4 text-sci-cyan" /> Docente titular:
            </span>
            <span className="sm:col-span-2 text-muted-foreground font-medium">
              {teacherName}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Normativas vigentes */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardHeader className="border-b border-border p-5">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-sci-navy">
            <ShieldCheck className="h-4 w-4 text-sci-cyan" /> Normas Asociadas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 text-xs">
          {exam.normas && exam.normas.length > 0 ? (
            <ul className="space-y-3">
              {exam.normas.map((norma) => (
                <li key={norma.id} className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="font-semibold text-sci-navy">{norma.titulo}</strong>
                    <span className="rounded-full bg-sci-cyan/10 px-2 py-0.5 text-[10px] font-bold text-sci-navy border border-sci-cyan/20">
                      {norma.tipo}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground leading-relaxed">
                    {norma.descripcion}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="italic text-muted-foreground">No hay normas registradas para esta sesión.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
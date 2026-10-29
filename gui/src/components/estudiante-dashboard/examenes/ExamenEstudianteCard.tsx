import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Clock3,
  MapPin,
  ChevronRight,
  BookOpen,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { ExamenEstudiante } from '@/services/estudiantes.service'

interface ExamenEstudianteCardProps {
  examen: ExamenEstudiante
}

export default function ExamenEstudianteCard({
  examen,
}: ExamenEstudianteCardProps) {
  const navigate = useNavigate()

  const fecha = examen.fecha?.slice(0, 10) ?? ''
  const [anio, mes, dia] = fecha.split('-')

  const fechaFormateada =
    anio && mes && dia ? `${dia}/${mes}/${anio}` : examen.fecha

 const abrirDetalle = () => {
  navigate(`/estudiante/examenes/${examen.id_examen}`)
}

  const horario = [examen.hora_ini, examen.hora_fin]
    .filter(Boolean)
    .join(' - ')

  return (
    <Card
      role="link"
      tabIndex={0}
      aria-label={`Ver evaluación ${examen.nombre}`}
      onClick={abrirDetalle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          abrirDetalle()
        }
      }}
      className="group relative flex h-full min-w-0 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-sci-blue/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sci-cyan/50"
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-sci-blue transition-all duration-200 group-hover:h-1.5" />

      <CardHeader className="space-y-4 pb-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <BookOpen size={17} className="shrink-0 text-sci-blue" />
            <span className="truncate">
              {examen.materia || 'Materia no especificada'}
            </span>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              examen.estado === 'Habilitado'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {examen.estado}
          </span>
        </div>

        <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-sci-blue">
          {examen.nombre}
        </h2>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 pb-5">
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <CalendarDays
            size={17}
            className="mt-0.5 shrink-0 text-sci-blue"
          />
          <span>{fechaFormateada}</span>
        </div>

        {horario && (
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Clock3
              size={17}
              className="mt-0.5 shrink-0 text-sci-blue"
            />
            <span>{horario}</span>
          </div>
        )}

        {examen.aula && (
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <MapPin
              size={17}
              className="mt-0.5 shrink-0 text-sci-blue"
            />
            <span className="break-words">{examen.aula}</span>
          </div>
        )}

        {examen.docente && (
          <div className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Docente:</span>{' '}
            {examen.docente}
          </div>
        )}

        {examen.estado === 'Inhabilitado' && examen.motivo_estado && (
          <div className="mt-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <span className="font-semibold">Motivo:</span>{' '}
            {examen.motivo_estado}
          </div>
        )}
      </CardContent>

      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3 text-xs font-semibold text-sci-blue transition-colors group-hover:bg-sci-blue/5">
        <span>Ver evaluación</span>
        <ChevronRight
          size={17}
          className="transition-transform duration-200 group-hover:translate-x-1"
        />
      </div>
    </Card>
  )
}
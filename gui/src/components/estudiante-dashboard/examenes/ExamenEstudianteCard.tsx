import { CalendarDays, Clock } from 'lucide-react'
import type { ExamenEstudiante } from '@/services/estudiantes.service'

interface ExamenEstudianteCardProps {
  examen: ExamenEstudiante
  children?: React.ReactNode
}

export default function ExamenEstudianteCard({
  examen,
  children,
}: ExamenEstudianteCardProps) {
  const fecha = examen.fecha.slice(0, 10)
  const [anio, mes, dia] = fecha.split('-')

  const fechaFormateada =
    anio && mes && dia ? `${dia}/${mes}/${anio}` : examen.fecha

  return (
    <article className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{examen.nombre}</h3>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            examen.estado === 'Habilitado'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {examen.estado}
        </span>
      </div>

      {examen.materia && (
        <p className="mt-2 text-sm text-muted-foreground">
          {examen.materia}
        </p>
      )}

      <div className="mt-4 space-y-2 text-sm">
        <p className="flex items-center gap-2">
          <CalendarDays
            size={16}
            className="shrink-0 text-muted-foreground"
          />
          {fechaFormateada}
        </p>

        {(examen.hora_ini || examen.hora_fin) && (
          <p className="flex items-center gap-2">
            <Clock
              size={16}
              className="shrink-0 text-muted-foreground"
            />
            {[examen.hora_ini, examen.hora_fin]
              .filter(Boolean)
              .join(' - ')}
          </p>
        )}

        {examen.aula && (
          <p>
            <span className="text-muted-foreground">Aula:</span>{' '}
            {examen.aula}
          </p>
        )}

        {examen.docente && (
          <p>
            <span className="text-muted-foreground">Docente:</span>{' '}
            {examen.docente}
          </p>
        )}
      </div>

      {examen.estado === 'Inhabilitado' && examen.motivo_estado && (
        <p className="mt-4 rounded-lg bg-muted p-3 text-sm">
          <strong>Motivo:</strong> {examen.motivo_estado}
        </p>
      )}

      {children}
    </article>
  )
}
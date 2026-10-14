import { CalendarDays, Clock3, MapPin } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { Aula } from '@/services/aulas.service'

interface Props {
  fecha: string
  horaIni: string
  duracion: string
  idAula: string
  aulas: Aula[]
  todayLocal: string
  fieldErrors: Record<string, string>
  onFieldChange: (field: string, value: string) => void
}

export function FormHorarioAmbiente({
  fecha,
  horaIni,
  duracion,
  idAula,
  aulas,
  todayLocal,
  fieldErrors,
  onFieldChange,
}: Props) {
  return (
    <fieldset className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
      <legend className="px-2 text-sm font-bold text-sci-navy">
        Horario y ambiente
      </legend>
      <div className="grid gap-4 md:grid-cols-2 mt-2">
        <div className="space-y-1.5 text-left">
          <Label htmlFor="ex-fecha" className="flex items-center gap-1.5 text-xs font-semibold">
            <CalendarDays className="h-3.5 w-3.5 text-sci-cyan" /> Fecha *
          </Label>
          <Input
            id="ex-fecha"
            type="date"
            min={todayLocal}
            value={fecha}
            onChange={(e) => onFieldChange('fecha', e.target.value)}
            className={`h-11 ${fieldErrors.fecha ? 'border-sci-red' : ''}`}
          />
          {fieldErrors.fecha && (
            <p className="text-xs text-sci-red font-medium">{fieldErrors.fecha}</p>
          )}
        </div>

        <div className="space-y-1.5 text-left">
          <Label htmlFor="ex-aula" className="flex items-center gap-1.5 text-xs font-semibold">
            <MapPin className="h-3.5 w-3.5 text-sci-cyan" /> Aula disponible *
          </Label>
          <select
            id="ex-aula"
            value={idAula}
            onChange={(e) => onFieldChange('id_aula', e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
          >
            <option value="">Seleccionar aula</option>
            {aulas.map((room) => (
              <option key={room.id} value={room.id}>
                {room.nombre} · {room.ubicacion} ({room.capacidad || '—'} cap.)
              </option>
            ))}
          </select>
          {fieldErrors.id_aula && (
            <p className="text-xs text-sci-red font-medium">{fieldErrors.id_aula}</p>
          )}
        </div>

        <div className="space-y-1.5 text-left">
          <Label htmlFor="ex-hora" className="flex items-center gap-1.5 text-xs font-semibold">
            <Clock3 className="h-3.5 w-3.5 text-sci-cyan" /> Hora de inicio *
          </Label>
          <Input
            id="ex-hora"
            type="time"
            value={horaIni}
            onChange={(e) => onFieldChange('hora_ini', e.target.value)}
            className={`h-11 ${fieldErrors.hora_ini ? 'border-sci-red' : ''}`}
          />
          {fieldErrors.hora_ini && (
            <p className="text-xs text-sci-red font-medium">{fieldErrors.hora_ini}</p>
          )}
        </div>

        <div className="space-y-1.5 text-left">
          <Label htmlFor="ex-duracion" className="text-xs font-semibold">
            Duración (minutos) *
          </Label>
          <Input
            id="ex-duracion"
            type="number"
            onWheel={(e) => e.currentTarget.blur()}
            min="1"
            step="1"
            value={duracion}
            onChange={(e) => onFieldChange('duracion', e.target.value)}
            className={`h-11 ${fieldErrors.duracion ? 'border-sci-red' : ''}`}
          />
          {fieldErrors.duracion && (
            <p className="text-xs text-sci-red font-medium">{fieldErrors.duracion}</p>
          )}
        </div>
      </div>
    </fieldset>
  )
}
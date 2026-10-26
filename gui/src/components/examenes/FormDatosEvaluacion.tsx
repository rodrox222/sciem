import { BookOpenCheck, UserRound } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { Materia } from '@/services/materias.service'
import type { DocenteItem } from '@/services/examenes.service'

interface Props {
  nombre: string
  idMateria: string
  idDocente: string
  materias: Materia[]
  docentes: DocenteItem[]
  isAdmin: boolean
  selectedTeacher?: DocenteItem
  fieldErrors: Record<string, string>
  onFieldChange: (field: string, value: string) => void
  formatTeacherName: (t: DocenteItem) => string
}

export function FormDatosEvaluacion({
  nombre,
  idMateria,
  idDocente,
  materias,
  docentes,
  isAdmin,
  selectedTeacher,
  fieldErrors,
  onFieldChange,
  formatTeacherName,
}: Props) {
  return (
    <fieldset className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
      <legend className="px-2 text-sm font-bold text-sci-navy">
        Datos de la evaluación
      </legend>
      <div className="grid gap-4 md:grid-cols-2 mt-2">
        <div className="space-y-1.5 text-left md:col-span-2">
          <Label htmlFor="ex-nombre" className="text-xs font-semibold">
            Nombre de la evaluación *
          </Label>
          <Input
            id="ex-nombre"
            value={nombre}
            maxLength={150}
            onChange={(e) => onFieldChange('nombre', e.target.value)}
            placeholder="Ej. Primer examen parcial de Álgebra II"
            className={`h-11 ${fieldErrors.nombre ? 'border-sci-red' : ''}`}
          />
          {fieldErrors.nombre && (
            <p className="text-xs text-sci-red font-medium">{fieldErrors.nombre}</p>
          )}
        </div>

        <div className="space-y-1.5 text-left">
          <Label htmlFor="examen-materia" className="flex items-center gap-1.5 text-xs font-semibold">
            <BookOpenCheck className="h-3.5 w-3.5 text-sci-cyan" /> Asignatura *
          </Label>
          <select
            id="examen-materia"
            value={idMateria}
            onChange={(e) => onFieldChange('id_materia', e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
          >
            <option value="">Seleccionar asignatura</option>
            {materias.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.nombre}
              </option>
            ))}
          </select>
          {fieldErrors.id_materia && (
            <p className="text-xs text-sci-red font-medium">{fieldErrors.id_materia}</p>
          )}
        </div>

        <div className="space-y-1.5 text-left">
          <Label htmlFor="ex-docente" className="flex items-center gap-1.5 text-xs font-semibold">
            <UserRound className="h-3.5 w-3.5 text-sci-cyan" /> Docente responsable *
          </Label>
          {isAdmin ? (
            <select
              id="ex-docente"
              value={idDocente}
              onChange={(e) => onFieldChange('id_docente', e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
            >
              <option value="">Seleccionar docente</option>
              {docentes.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {formatTeacherName(teacher)}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id="ex-docente"
              type="text"
              readOnly
              value={selectedTeacher ? formatTeacherName(selectedTeacher) : ''}
              className="h-11 bg-muted cursor-not-allowed text-xs font-medium border-border"
            />
          )}
          {fieldErrors.id_docente && (
            <p className="text-xs text-sci-red font-medium">{fieldErrors.id_docente}</p>
          )}
        </div>
      </div>
    </fieldset>
  )
}
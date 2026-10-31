import { useEffect, useState } from 'react'
import { BookOpenCheck, UserRound, WifiOff } from 'lucide-react'
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
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const userRole = (localStorage.getItem('user_role') ?? '').toLowerCase()
  const esDocente = userRole === 'docente'

  // Regla offline: solo el docente puede editar; si está offline y no es docente, se bloquea todo el formulario
  const bloqueadoPorOffline = isOffline && !esDocente

  return (
    <fieldset className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <legend className="px-2 text-sm font-bold text-sci-navy">
          Datos de la evaluación
        </legend>

        {isOffline && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
            <WifiOff className="h-3 w-3" />
            {esDocente ? 'Edición local offline' : 'Modo offline (Solo lectura)'}
          </span>
        )}
      </div>

      {bloqueadoPorOffline && (
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
          Sin conexión: únicamente el docente responsable puede modificar los datos del examen.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 mt-3">
        {/* Nombre del Examen */}
        <div className="space-y-1.5 text-left md:col-span-2">
          <Label htmlFor="ex-nombre" className="text-xs font-semibold">
            Nombre de la evaluación *
          </Label>
          <Input
            id="ex-nombre"
            value={nombre}
            disabled={bloqueadoPorOffline}
            maxLength={150}
            onChange={(e) => onFieldChange('nombre', e.target.value)}
            placeholder="Ej. Primer examen parcial de Álgebra II"
            className={`h-11 ${fieldErrors.nombre ? 'border-sci-red' : ''} ${
              bloqueadoPorOffline ? 'bg-muted cursor-not-allowed opacity-75' : ''
            }`}
          />
          {fieldErrors.nombre && (
            <p className="text-xs text-sci-red font-medium">{fieldErrors.nombre}</p>
          )}
        </div>

        {/* Asignatura */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="examen-materia" className="flex items-center gap-1.5 text-xs font-semibold">
            <BookOpenCheck className="h-3.5 w-3.5 text-sci-cyan" /> Asignatura *
          </Label>
          <select
            id="examen-materia"
            value={idMateria}
            disabled={bloqueadoPorOffline}
            onChange={(e) => onFieldChange('id_materia', e.target.value)}
            className={`h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sci-blue/20 ${
              bloqueadoPorOffline ? 'bg-muted cursor-not-allowed opacity-75' : ''
            }`}
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

        {/* Docente responsable */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="ex-docente" className="flex items-center gap-1.5 text-xs font-semibold">
            <UserRound className="h-3.5 w-3.5 text-sci-cyan" /> Docente responsable *
          </Label>
          {/* Si es Admin pero está offline, no se permite cambiar de docente sin servidor */}
          {isAdmin && !isOffline ? (
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
              title={isOffline && isAdmin ? 'No se puede reasignar docente sin conexión.' : undefined}
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
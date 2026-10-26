import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, LoaderCircle, Save } from 'lucide-react'

import { FormDatosEvaluacion } from '@/components/examenes/FormDatosEvaluacion'
import { FormHorarioAmbiente } from '@/components/examenes/FormHorarioAmbiente'
import { FormNormasExamen } from '@/components/examenes/FormNormasExamen'

import { aulasService, type Aula } from '../services/aulas.service'
import { api } from '../services/api'
import {
  examenesService,
  type DocenteItem,
  type ExamenPayload,
} from '../services/examenes.service'
import { materiasService, type Materia } from '../services/materias.service'
import { normasService, type Norma } from '../services/normas.service'
import { Button } from '@/components/ui/button'

const todayLocal = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

const normalizeDate = (d: string) => (d ? d.slice(0, 10) : '')
const normalizeTime = (t: string) => (t ? t.slice(0, 5) : '')
const formatTeacherName = (t: DocenteItem) =>
  [t.nombre, t.apellido ?? [t.apellido_paterno, t.apellido_materno].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' ')

const addMinutes = (time: string, duration: number) => {
  if (!/^\d{2}:\d{2}$/.test(time) || duration <= 0) return ''
  const [hours, minutes] = time.split(':').map(Number)
  const total = hours * 60 + minutes + duration
  if (total >= 24 * 60) return ''
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function ProgramarExamenPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const role = (localStorage.getItem('user_role') ?? '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'administrador'

  const [form, setForm] = useState({
    nombre: '',
    id_materia: '',
    fecha: '',
    hora_ini: '',
    duracion: '90',
    id_aula: '',
    id_docente: '',
  })

  const [materias, setMaterias] = useState<Materia[]>([])
  const [aulas, setAulas] = useState<Aula[]>([])
  const [docentes, setDocentes] = useState<DocenteItem[]>([])
  const [normasGenerales, setNormasGenerales] = useState<Norma[]>([])
  const [selectedNorms, setSelectedNorms] = useState<string[]>([])
  const [particulares, setParticulares] = useState<{ titulo: string; descripcion: string }[]>([])
  const [tituloParticular, setTituloParticular] = useState('')
  const [descParticular, setDescParticular] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const selectedTeacher = docentes.find((t) => t.id === form.id_docente)
  const endTime = useMemo(
    () => addMinutes(form.hora_ini, Number(form.duracion)),
    [form.duracion, form.hora_ini],
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const currentUser = isAdmin ? null : await api.get<DocenteItem>('/me').catch(() => null)

      const [subjectsRes, roomsRes, rulesRes, teachersRes, examRes] = await Promise.allSettled([
        materiasService.listAll(),
        aulasService.list({ estado: 'Disponible', perPage: 100 }),
        normasService.listAll({ tipo: 'General' }),
        isAdmin
          ? examenesService.listDocentes().then((res) => res.data).catch(() => [])
          : Promise.resolve(currentUser?.id ? [currentUser] : []),
        editId ? examenesService.get(editId) : Promise.resolve(null),
      ])

      const subjects = subjectsRes.status === 'fulfilled' ? subjectsRes.value : []
      const rooms = roomsRes.status === 'fulfilled' ? roomsRes.value : { data: [] }
      const rules = rulesRes.status === 'fulfilled' ? rulesRes.value : []
      const teachers = teachersRes.status === 'fulfilled' ? teachersRes.value : []
      const exam = examRes.status === 'fulfilled' ? examRes.value : null

      setMaterias(subjects)
      setAulas(rooms.data)
      setNormasGenerales(rules)
      setDocentes(teachers)

      if (exam) {
        setForm({
          nombre: exam.nombre,
          id_materia: exam.id_materia,
          fecha: normalizeDate(exam.fecha),
          hora_ini: normalizeTime(exam.hora_ini),
          duracion: '90',
          id_aula: exam.id_aula,
          id_docente: exam.id_docente,
        })
        setSelectedNorms((exam.normas ?? []).map((n) => n.id))
      } else if (!isAdmin && currentUser?.id) {
        setForm((prev) => ({ ...prev, id_docente: currentUser.id }))
      }
    } finally {
      setLoading(false)
    }
  }, [editId, isAdmin])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleFieldChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const toggleNorm = (id: string) => {
    setSelectedNorms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const addParticular = () => {
    const titulo = tituloParticular.trim()
    const descripcion = descParticular.trim()
    if (!titulo || !descripcion) {
      setFieldErrors((prev) => ({ ...prev, particular: 'Completa el título y la descripción.' }))
      return
    }
    // Se inserta para mostrarse inmediatamente arriba
    setParticulares((prev) => [{ titulo, descripcion }, ...prev])
    setTituloParticular('')
    setDescParticular('')
    setFieldErrors((prev) => ({ ...prev, particular: '' }))
  }

  const removeParticular = (index: number) => {
    setParticulares((prev) => prev.filter((_, idx) => idx !== index))
  }

  const validate = () => {
    const errors: Record<string, string> = {}
    const duration = Number(form.duracion)

    if (!form.nombre.trim()) errors.nombre = 'Ingresa un nombre para el examen.'
    if (!form.id_materia) errors.id_materia = 'Selecciona una asignatura.'
    if (!form.fecha) errors.fecha = 'Selecciona la fecha.'
    else if (form.fecha < todayLocal()) errors.fecha = 'La fecha no puede ser anterior a hoy.'
    if (!form.hora_ini) errors.hora_ini = 'Selecciona la hora de inicio.'
    if (!Number.isInteger(duration) || duration <= 0) {
      errors.duracion = 'La duración debe ser un número entero mayor a 0.'
    } else if (!endTime) {
      errors.duracion = 'La evaluación debe finalizar antes de las 24:00.'
    }
    if (!form.id_aula) errors.id_aula = 'Selecciona un aula disponible.'
    if (!form.id_docente) errors.id_docente = 'Selecciona el docente responsable.'

    // Las normas son opcionales: no se bloquea si no hay normas seleccionadas

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (!validate()) return

    setSaving(true)
    try {
      const payload: ExamenPayload & {
        normas_ids?: string[]
        normas_particulares?: { titulo: string; descripcion: string }[]
      } = {
        nombre: form.nombre.trim(),
        id_materia: form.id_materia,
        estado: 'Programado',
        fecha: form.fecha,
        hora_ini: form.hora_ini,
        hora_fin: endTime,
        id_aula: form.id_aula,
        id_docente: form.id_docente,
        normas_ids: selectedNorms,
        normas_particulares: particulares,
      }

      if (editId) {
        await examenesService.update(editId, payload)
      } else {
        await examenesService.create(payload)
      }

      navigate('/examenes', {
        replace: true,
        state: {
          success: editId
            ? 'Examen reprogramado correctamente.'
            : 'Examen programado correctamente.',
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el examen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/examenes')}
            className="p-0 h-auto font-semibold text-sci-blue hover:text-sci-navy cursor-pointer gap-1 mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a exámenes
          </Button>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan block">
            Gestión Académica
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-sci-navy tracking-tight">
            {editId ? 'Reprogramar examen' : 'Programar examen'}
          </h1>
        </div>

        {form.hora_ini && endTime && (
          <div className="rounded-2xl border border-sci-cyan/30 bg-sci-cyan/10 px-5 py-3 text-xs shadow-xs">
            <p className="text-muted-foreground font-medium">Horario calculado</p>
            <p className="mt-0.5 font-bold text-sci-navy text-sm">
              {form.hora_ini} – {endTime}
            </p>
          </div>
        )}
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-sci-red/30 bg-sci-red/10 p-4 text-xs font-semibold text-sci-red" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid min-h-96 place-items-center rounded-2xl border border-border bg-card">
          <div className="text-center text-muted-foreground">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-sci-cyan" />
            <p className="mt-3 text-xs">Preparando el formulario de programación...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormDatosEvaluacion
            nombre={form.nombre}
            idMateria={form.id_materia}
            idDocente={form.id_docente}
            materias={materias}
            docentes={docentes}
            isAdmin={isAdmin}
            selectedTeacher={selectedTeacher}
            fieldErrors={fieldErrors}
            onFieldChange={handleFieldChange}
            formatTeacherName={formatTeacherName}
          />

          <FormHorarioAmbiente
            fecha={form.fecha}
            horaIni={form.hora_ini}
            duracion={form.duracion}
            idAula={form.id_aula}
            aulas={aulas}
            todayLocal={todayLocal()}
            fieldErrors={fieldErrors}
            onFieldChange={handleFieldChange}
          />

          <FormNormasExamen
            normasGenerales={normasGenerales}
            selectedNorms={selectedNorms}
            particulares={particulares}
            tituloParticular={tituloParticular}
            descParticular={descParticular}
            fieldErrors={fieldErrors}
            onToggleNorm={toggleNorm}
            onTituloParticularChange={setTituloParticular}
            onDescParticularChange={setDescParticular}
            onAddParticular={addParticular}
            onRemoveParticular={removeParticular}
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/examenes')}
              disabled={saving}
              className="cursor-pointer border-border"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-sci-blue hover:opacity-90 text-white font-semibold cursor-pointer min-w-40 gap-2"
            >
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Guardando...' : editId ? 'Guardar reprogramación' : 'Programar examen'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
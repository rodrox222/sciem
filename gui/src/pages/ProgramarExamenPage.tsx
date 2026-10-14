import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  Check,
  Clock3,
  LoaderCircle,
  MapPin,
  Save,
  UserRound,
} from 'lucide-react'

import { CrearMateriaModal } from '../components/examenes/CrearMateriaModal'
import { aulasService, type Aula } from '../services/aulas.service'
import { api } from '../services/api'
import {
  examenesService,
  type CatalogItem,
  type DocenteItem,
  type ExamenPayload,
} from '../services/examenes.service'
import { normasService, type Norma } from '../services/normas.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FormState {
  nombre: string
  id_materia: string
  fecha: string
  hora_ini: string
  duracion: string
  id_aula: string
  id_docente: string
}

const emptyForm: FormState = {
  nombre: '',
  id_materia: '',
  fecha: '',
  hora_ini: '',
  duracion: '90',
  id_aula: '',
  id_docente: '',
}

const todayLocal = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

const normalizeDate = (date: string) => (date ? date.slice(0, 10) : '')
const normalizeTime = (time: string) => (time ? time.slice(0, 5) : '')
const formatTeacherName = (teacher: DocenteItem) =>
  [teacher.nombre, teacher.apellido ?? [teacher.apellido_paterno, teacher.apellido_materno].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' ')

const addMinutes = (time: string, duration: number) => {
  if (!/^\d{2}:\d{2}$/.test(time) || duration <= 0) return ''
  const [hours, minutes] = time.split(':').map(Number)
  const total = hours * 60 + minutes + duration
  if (total >= 24 * 60) return ''
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const minutesBetween = (start: string, end: string) => {
  const [startHour, startMinute] = normalizeTime(start).split(':').map(Number)
  const [endHour, endMinute] = normalizeTime(end).split(':').map(Number)
  return endHour * 60 + endMinute - (startHour * 60 + startMinute)
}

export default function ProgramarExamenPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const role = (localStorage.getItem('user_role') ?? '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'administrador'

  const [form, setForm] = useState<FormState>(emptyForm)
  const [materias, setMaterias] = useState<CatalogItem[]>([])
  const [materiaModalOpen, setMateriaModalOpen] = useState(false)
  const [aulas, setAulas] = useState<Aula[]>([])
  const [docentes, setDocentes] = useState<DocenteItem[]>([])
  const selectedTeacher = docentes.find((teacher) => teacher.id === form.id_docente)
  const [normas, setNormas] = useState<Norma[]>([])
  const [selectedNorms, setSelectedNorms] = useState<string[]>([])
  const [particulares, setParticulares] = useState<{ titulo: string; descripcion: string }[]>([])
  const [particularTitulo, setParticularTitulo] = useState('')
  const [particularDescripcion, setParticularDescripcion] = useState('')
  const [savedExamId, setSavedExamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const endTime = useMemo(
    () => addMinutes(form.hora_ini, Number(form.duracion)),
    [form.duracion, form.hora_ini],
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      // 1. Obtener usuario o docente si no es admin
      const currentUser = isAdmin ? null : await api.get<DocenteItem>('/me').catch(() => null)

      // 2. Cargar catálogos usando Promise.allSettled para que si uno falla temporalmente, no rompa la pantalla entera
      const [subjectsRes, roomsRes, rulesRes, teachersRes, examRes] = await Promise.allSettled([
        examenesService.listMaterias(),
        aulasService.list({ estado: 'Disponible', perPage: 100 }),
        normasService.listAll({ tipo: 'General' }),
        isAdmin
          ? examenesService.listDocentes().then((res) => res.data)
          : Promise.resolve(currentUser?.id ? [currentUser] : []),
        editId ? examenesService.get(editId) : Promise.resolve(null),
      ])

      const subjects = subjectsRes.status === 'fulfilled' ? subjectsRes.value : []
      const rooms = roomsRes.status === 'fulfilled' ? roomsRes.value : { data: [] }
      const rules = rulesRes.status === 'fulfilled' ? rulesRes.value : []
      const teachers = teachersRes.status === 'fulfilled' ? teachersRes.value : []
      const exam = examRes.status === 'fulfilled' ? examRes.value : null

      setMaterias(subjects)
      setAulas(
        exam?.aula && !rooms.data.some((room) => room.id === exam.id_aula)
          ? [
              ...rooms.data,
              {
                id: exam.id_aula,
                nombre: exam.aula.nombre,
                ubicacion: 'Ubicación registrada',
                capacidad: 0,
                estado: 'Disponible',
              },
            ]
          : rooms.data,
      )
      setNormas([
        ...rules,
        ...(exam?.normas ?? []).filter((norma) => norma.tipo === 'Particular'),
      ])
      setDocentes(
        !isAdmin && exam?.docente && !teachers.some((teacher) => teacher.id === exam.docente?.id)
          ? [...teachers, exam.docente]
          : teachers,
      )

      if (exam) {
        setForm({
          nombre: exam.nombre,
          id_materia: exam.id_materia,
          fecha: normalizeDate(exam.fecha),
          hora_ini: normalizeTime(exam.hora_ini),
          duracion: String(minutesBetween(exam.hora_ini, exam.hora_fin)),
          id_aula: exam.id_aula,
          id_docente: exam.id_docente,
        })
        setSelectedNorms((exam.normas ?? []).map((norma) => norma.id))
      } else if (!isAdmin && currentUser?.id) {
        setForm((current) => ({ ...current, id_docente: currentUser.id }))
      }

      // Si alguna de las peticiones críticas falló por 503, se notifica pero permite reintentar sin bloquear
      if (subjectsRes.status === 'rejected' || roomsRes.status === 'rejected') {
        setError('Algunos catálogos tardaron en responder. Si faltan opciones, recarga la página.')
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'No se pudieron cargar los datos de configuración.',
      )
    } finally {
      setLoading(false)
    }
  }, [editId, isAdmin])

  useEffect(() => {
    const requestId = window.setTimeout(() => void loadData(), 0)
    return () => window.clearTimeout(requestId)
  }, [loadData])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => ({ ...current, [key]: '' }))
  }

  const toggleNorm = (id: string) => {
    setSelectedNorms((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
    setFieldErrors((current) => ({ ...current, normas: '' }))
  }

  const addParticular = () => {
    const titulo = particularTitulo.trim()
    const descripcion = particularDescripcion.trim()
    if (!titulo || !descripcion) {
      setFieldErrors((current) => ({ ...current, particular: 'Completa el título y la descripción.' }))
      return
    }
    setParticulares((current) => [...current, { titulo, descripcion }])
    setParticularTitulo('')
    setParticularDescripcion('')
    setFieldErrors((current) => ({ ...current, particular: '', normas: '' }))
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
    if (selectedNorms.length === 0 && particulares.length === 0) {
      errors.normas = 'Selecciona una norma general o agrega una particular.'
    }
    if (particularTitulo.trim() || particularDescripcion.trim()) {
      errors.particular = 'Pulsa "Agregar norma particular" para incluir el borrador.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Verificación estricta de traslapes en el frontend
  const checkScheduleConflict = async () => {
    const response = await examenesService.list({ fecha: form.fecha, perPage: 100 })
    const actualIni = normalizeTime(form.hora_ini)
    const actualFin = endTime

    return response.data.find((exam) => {
      if (exam.id === editId) return false
      
      const mismaAula = exam.id_aula === form.id_aula || exam.aula?.id === form.id_aula
      if (!mismaAula) return false
      if (exam.estado === 'Terminado') return false

      const otroIni = normalizeTime(exam.hora_ini)
      const otroFin = normalizeTime(exam.hora_fin)

      // Se traslapan si: (InicioA < FinB) && (FinA > InicioB)
      return actualIni < otroFin && actualFin > otroIni
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!validate()) return

    setSaving(true)
    let createdId: string | null = null

    try {
      const conflict = await checkScheduleConflict()
      if (conflict) {
        throw new Error(
          `Conflicto de horario: El aula seleccionada ya está ocupada por la evaluación "${conflict.nombre}" de ${normalizeTime(conflict.hora_ini)} a ${normalizeTime(conflict.hora_fin)}.`
        )
      }

      const payload: ExamenPayload = {
        nombre: form.nombre.trim(),
        id_materia: form.id_materia,
        estado: 'Programado',
        fecha: form.fecha,
        hora_ini: form.hora_ini,
        hora_fin: endTime,
        id_aula: form.id_aula,
        id_docente: form.id_docente,
      }

      const currentId = editId ?? savedExamId
      const response = currentId
        ? await examenesService.update(currentId, payload)
        : await examenesService.create(payload)
      if (!currentId) {
        createdId = response.examen.id
        setSavedExamId(createdId)
      }

      await normasService.assignToExam(response.examen.id, selectedNorms)
      if (particulares.length > 0) {
        await normasService.createParticularForExam(response.examen.id, particulares)
        setParticulares([])
      }
      navigate('/examenes', {
        replace: true,
        state: {
          success: editId
            ? 'Examen reprogramado correctamente.'
            : 'Examen programado correctamente.',
        },
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Ocurrió un error al guardar la programación del examen.'
      )
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

        {endTime && (
          <div className="rounded-2xl border border-sci-cyan/30 bg-sci-cyan/10 px-5 py-3 text-xs shadow-xs">
            <p className="text-muted-foreground font-medium">Horario calculado</p>
            <p className="mt-0.5 font-bold text-sci-navy text-sm">
              {form.hora_ini} - {endTime}
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
                  value={form.nombre}
                  maxLength={150}
                  onChange={(event) => setField('nombre', event.target.value)}
                  placeholder="Ej. Primer examen parcial de Álgebra II"
                  className={`h-11 ${fieldErrors.nombre ? 'border-sci-red' : ''}`}
                />
                {fieldErrors.nombre && <p className="text-xs text-sci-red font-medium">{fieldErrors.nombre}</p>}
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <Label htmlFor="examen-materia" className="flex items-center gap-1.5 text-xs font-semibold">
                    <BookOpenCheck className="h-3.5 w-3.5 text-sci-cyan" /> Asignatura *
                  </Label>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setMateriaModalOpen(true)}
                      disabled={saving}
                      className="text-xs font-semibold text-sci-blue hover:underline cursor-pointer"
                    >
                      + Crear materia
                    </button>
                  )}
                </div>
                <select
                  id="examen-materia"
                  value={form.id_materia}
                  onChange={(event) => setField('id_materia', event.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
                >
                  <option value="">Seleccionar asignatura</option>
                  {materias.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.nombre}
                    </option>
                  ))}
                </select>
                {fieldErrors.id_materia && <p className="text-xs text-sci-red font-medium">{fieldErrors.id_materia}</p>}
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="ex-docente" className="flex items-center gap-1.5 text-xs font-semibold">
                  <UserRound className="h-3.5 w-3.5 text-sci-cyan" /> Docente responsable *
                </Label>
                {isAdmin ? (
                  <select
                    id="ex-docente"
                    value={form.id_docente}
                    onChange={(event) => setField('id_docente', event.target.value)}
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
                {fieldErrors.id_docente && <p className="text-xs text-sci-red font-medium">{fieldErrors.id_docente}</p>}
              </div>
            </div>
          </fieldset>

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
                  min={todayLocal()}
                  value={form.fecha}
                  onChange={(event) => setField('fecha', event.target.value)}
                  className={`h-11 ${fieldErrors.fecha ? 'border-sci-red' : ''}`}
                />
                {fieldErrors.fecha && <p className="text-xs text-sci-red font-medium">{fieldErrors.fecha}</p>}
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="ex-aula" className="flex items-center gap-1.5 text-xs font-semibold">
                  <MapPin className="h-3.5 w-3.5 text-sci-cyan" /> Aula disponible *
                </Label>
                <select
                  id="ex-aula"
                  value={form.id_aula}
                  onChange={(event) => setField('id_aula', event.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
                >
                  <option value="">Seleccionar aula</option>
                  {aulas.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.nombre} · {room.ubicacion} ({room.capacidad || '—'} cap.)
                    </option>
                  ))}
                </select>
                {fieldErrors.id_aula && <p className="text-xs text-sci-red font-medium">{fieldErrors.id_aula}</p>}
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="ex-hora" className="flex items-center gap-1.5 text-xs font-semibold">
                  <Clock3 className="h-3.5 w-3.5 text-sci-cyan" /> Hora de inicio *
                </Label>
                <Input
                  id="ex-hora"
                  type="time"
                  value={form.hora_ini}
                  onChange={(event) => setField('hora_ini', event.target.value)}
                  className={`h-11 ${fieldErrors.hora_ini ? 'border-sci-red' : ''}`}
                />
                {fieldErrors.hora_ini && <p className="text-xs text-sci-red font-medium">{fieldErrors.hora_ini}</p>}
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="ex-duracion" className="text-xs font-semibold">
                  Duración (minutos) *
                </Label>
                <Input
                  id="ex-duracion"
                  type="number"
                  onWheel={(event) => event.currentTarget.blur()}
                  min="1"
                  step="1"
                  value={form.duracion}
                  onChange={(event) => setField('duracion', event.target.value)}
                  className={`h-11 ${fieldErrors.duracion ? 'border-sci-red' : ''}`}
                />
                {fieldErrors.duracion && <p className="text-xs text-sci-red font-medium">{fieldErrors.duracion}</p>}
              </div>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
            <legend className="px-2 text-sm font-bold text-sci-navy">
              Normas aplicables *
            </legend>
            <p className="mb-3 text-xs text-muted-foreground">
              Selecciona normas generales del catálogo oficial o define normas particulares específicas para este examen.
            </p>

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {normas.map((rule) => {
                const selected = selectedNorms.includes(rule.id)
                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => toggleNorm(rule.id)}
                    className={`flex min-h-14 w-full items-start gap-3 rounded-xl border p-3.5 text-left transition cursor-pointer ${
                      selected
                        ? 'border-sci-blue bg-sci-blue/5'
                        : 'border-border bg-card hover:border-sci-cyan'
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                        selected
                          ? 'border-sci-blue bg-sci-blue text-white'
                          : 'border-border bg-background'
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <strong className="text-xs font-bold text-sci-navy">{rule.titulo}</strong>
                        <span className="rounded-full border border-sci-cyan/30 bg-sci-cyan/10 px-2 py-0.2 text-[10px] font-semibold text-sci-navy">
                          {rule.tipo}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {rule.descripcion}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            {fieldErrors.normas && <p className="mt-2 text-xs text-sci-red font-medium">{fieldErrors.normas}</p>}

            <div className="mt-5 space-y-3 border-t border-border pt-4">
              <h3 className="text-xs font-bold text-sci-navy">Agregar norma particular a este examen</h3>
              <Input
                type="text"
                maxLength={150}
                value={particularTitulo}
                onChange={(event) => setParticularTitulo(event.target.value)}
                placeholder="Título de la norma particular"
                className="h-10 text-xs border-border"
              />
              <textarea
                value={particularDescripcion}
                onChange={(event) => setParticularDescripcion(event.target.value)}
                placeholder="Descripción detallada de la regla particular..."
                rows={2}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-sci-blue/20"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addParticular}
                className="cursor-pointer text-xs border-border"
              >
                + Incluir norma particular
              </Button>
              {fieldErrors.particular && <p className="text-xs text-sci-red font-medium">{fieldErrors.particular}</p>}

              {particulares.map((norma, index) => (
                <div key={index} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3 text-xs">
                  <span>
                    <strong className="text-foreground">{norma.titulo}</strong> · {norma.descripcion}
                  </span>
                  <button
                    type="button"
                    onClick={() => setParticulares((current) => current.filter((_, item) => item !== index))}
                    className="text-sci-red hover:underline font-semibold cursor-pointer"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </fieldset>

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

      {isAdmin && materiaModalOpen && (
        <CrearMateriaModal
          onOpenChange={setMateriaModalOpen}
          onCreated={(materia) => {
            setMaterias((current) =>
              [...current.filter((item) => item.id !== materia.id), materia].sort((a, b) =>
                a.nombre.localeCompare(b.nombre, 'es'),
              ),
            )
            setField('id_materia', materia.id)
            setMateriaModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
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

import { MainLayout } from '../layouts/MainLayout'
import { aulasService, type Aula } from '../services/aulas.service'
import { ApiError, apiRequest } from '../services/apiClient'
import {
  examenesService,
  type CatalogItem,
  type DocenteItem,
  type ExamenPayload,
} from '../services/examenes.service'
import { normasService, type Norma } from '../services/normas.service'

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

const normalizeDate = (date: string) => date.slice(0, 10)
const normalizeTime = (time: string) => time.slice(0, 5)
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

const getErrorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Ocurrió un error inesperado. Intenta nuevamente.'

export default function ProgramarExamenPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const role = (localStorage.getItem('user_role') ?? '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'administrador'

  const [form, setForm] = useState<FormState>(emptyForm)
  const [materias, setMaterias] = useState<CatalogItem[]>([])
  const [aulas, setAulas] = useState<Aula[]>([])
  const [docentes, setDocentes] = useState<DocenteItem[]>([])
  const selectedTeacher = docentes.find((teacher) => teacher.id === form.id_docente)
  const [normas, setNormas] = useState<Norma[]>([])
  const [selectedNorms, setSelectedNorms] = useState<string[]>([])
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
      const currentUser = isAdmin ? null : await apiRequest<DocenteItem>('/me')
      const [subjects, rooms, rules, teachers, exam] = await Promise.all([
        examenesService.listMaterias(),
        aulasService.list({ estado: 'Disponible', perPage: 100 }),
        normasService.listAll(),
        isAdmin
          ? examenesService.listDocentes().then((response) => response.data)
          : Promise.resolve(currentUser?.id ? [currentUser] : []),
        editId ? examenesService.get(editId) : Promise.resolve(null),
      ])

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
      setNormas(rules)
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
    } catch (loadError) {
      setError(getErrorMessage(loadError))
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
    if (selectedNorms.length === 0) errors.normas = 'Selecciona al menos una norma.'

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const checkScheduleConflict = async () => {
    const response = await examenesService.list({ fecha: form.fecha, perPage: 100 })
    return response.data.find(
      (exam) =>
        exam.id !== editId &&
        exam.id_aula === form.id_aula &&
        exam.estado !== 'Terminado' &&
        form.hora_ini < normalizeTime(exam.hora_fin) &&
        endTime > normalizeTime(exam.hora_ini),
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!validate()) return

    setSaving(true)

    try {
      const conflict = await checkScheduleConflict()
      if (conflict) {
        throw new ApiError(
          `El aula ya está reservada para “${conflict.nombre}” de ${normalizeTime(conflict.hora_ini)} a ${normalizeTime(conflict.hora_fin)}.`,
          422,
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

      const response = editId
        ? await examenesService.update(editId, payload)
        : await examenesService.create(payload)

      await normasService.assignToExam(response.examen.id, selectedNorms)
      navigate('/examenes', {
        replace: true,
        state: {
          success: editId
            ? 'Examen reprogramado correctamente.'
            : 'Examen programado correctamente.',
        },
      })
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <MainLayout>
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate('/examenes')}
              className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#0056B3] hover:text-[#003770]"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a exámenes
            </button>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#168FBD]">
              Gestión académica
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-[#003770]">
              {editId ? 'Reprogramar examen' : 'Programar examen'}
            </h1>
          </div>

          {endTime && (
            <div className="rounded-xl border border-[#168FBD]/25 bg-[#168FBD]/8 px-5 py-3 text-sm">
              <p className="text-[#64748B]">Horario calculado</p>
              <p className="mt-1 font-bold text-[#003770]">
                {form.hora_ini} - {endTime}
              </p>
            </div>
          )}
        </header>

        {error && (
          <div
            className="flex items-start gap-3 rounded-xl border border-[#E30613]/25 bg-[#E30613]/5 px-4 py-4 text-sm leading-relaxed text-[#B0040E]"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="grid min-h-96 place-items-center rounded-xl border border-[#E2E8F0] bg-white">
            <div className="text-center text-[#64748B]">
              <LoaderCircle className="mx-auto h-9 w-9 animate-spin text-[#168FBD]" />
              <p className="mt-3 text-sm">Preparando el formulario...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <fieldset className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
              <legend className="px-2 text-base font-bold text-[#003770]">
                Datos del examen
              </legend>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-[#1E293B]">Nombre *</span>
                  <input
                    value={form.nombre}
                    maxLength={150}
                    onChange={(event) => setField('nombre', event.target.value)}
                    placeholder="Ej. Primer parcial de Álgebra II"
                    className="h-11 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#0056B3] focus:ring-2 focus:ring-[#0056B3]/15"
                  />
                  {fieldErrors.nombre && <p className="text-sm text-[#E30613]">{fieldErrors.nombre}</p>}
                </label>

                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
                    <BookOpenCheck className="h-4 w-4 text-[#168FBD]" /> Asignatura *
                  </span>
                  <select
                    value={form.id_materia}
                    onChange={(event) => setField('id_materia', event.target.value)}
                    className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#0056B3]"
                  >
                    <option value="">Seleccionar asignatura</option>
                    {materias.map((subject) => <option key={subject.id} value={subject.id}>{subject.nombre}</option>)}
                  </select>
                  {fieldErrors.id_materia && <p className="text-sm text-[#E30613]">{fieldErrors.id_materia}</p>}
                </label>

                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
                    <UserRound className="h-4 w-4 text-[#168FBD]" /> Docente responsable *
                  </span>
                  {isAdmin ? (
                    <select
                      value={form.id_docente}
                      onChange={(event) => setField('id_docente', event.target.value)}
                      className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#0056B3]"
                    >
                      <option value="">Seleccionar docente</option>
                      {docentes.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {formatTeacherName(teacher)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        type="text"
                        readOnly
                        value={selectedTeacher ? formatTeacherName(selectedTeacher) : ''}
                        className="h-11 w-full cursor-default rounded-lg border border-[#E2E8F0] bg-[#F7F7F7] px-3 text-sm text-[#1E293B] outline-none"
                      />
                      <p className="text-xs text-[#64748B]">Se asigna automáticamente desde tu sesión.</p>
                    </>
                  )}
                  {fieldErrors.id_docente && <p className="text-sm text-[#E30613]">{fieldErrors.id_docente}</p>}
                </label>
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
              <legend className="px-2 text-base font-bold text-[#003770]">Horario y ambiente</legend>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
                    <CalendarDays className="h-4 w-4 text-[#168FBD]" /> Fecha *
                  </span>
                  <input
                    type="date"
                    min={todayLocal()}
                    value={form.fecha}
                    onChange={(event) => setField('fecha', event.target.value)}
                    className="h-11 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#0056B3]"
                  />
                  {fieldErrors.fecha && <p className="text-sm text-[#E30613]">{fieldErrors.fecha}</p>}
                </label>

                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
                    <MapPin className="h-4 w-4 text-[#168FBD]" /> Aula disponible *
                  </span>
                  <select
                    value={form.id_aula}
                    onChange={(event) => setField('id_aula', event.target.value)}
                    className="h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#0056B3]"
                  >
                    <option value="">Seleccionar aula</option>
                    {aulas.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.nombre} · {room.ubicacion} · {room.capacidad || '—'} lugares
                      </option>
                    ))}
                  </select>
                  {fieldErrors.id_aula && <p className="text-sm text-[#E30613]">{fieldErrors.id_aula}</p>}
                </label>

                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
                    <Clock3 className="h-4 w-4 text-[#168FBD]" /> Hora de inicio *
                  </span>
                  <input
                    type="time"
                    value={form.hora_ini}
                    onChange={(event) => setField('hora_ini', event.target.value)}
                    className="h-11 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#0056B3]"
                  />
                  {fieldErrors.hora_ini && <p className="text-sm text-[#E30613]">{fieldErrors.hora_ini}</p>}
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#1E293B]">Duración en minutos *</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.duracion}
                    onChange={(event) => setField('duracion', event.target.value)}
                    className="h-11 w-full rounded-lg border border-[#E2E8F0] px-3 text-sm outline-none focus:border-[#0056B3]"
                  />
                  {fieldErrors.duracion && <p className="text-sm text-[#E30613]">{fieldErrors.duracion}</p>}
                </label>
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
              <legend className="px-2 text-base font-bold text-[#003770]">Normas aplicables *</legend>
              <p className="mb-4 text-sm text-[#64748B]">Selecciona una o varias normas del catálogo institucional.</p>
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {normas.map((rule) => {
                  const selected = selectedNorms.includes(rule.id)
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => toggleNorm(rule.id)}
                      className={`flex min-h-14 w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                        selected
                          ? 'border-[#0056B3] bg-[#0056B3]/5'
                          : 'border-[#E2E8F0] hover:border-[#168FBD]'
                      }`}
                    >
                      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded border ${selected ? 'border-[#0056B3] bg-[#0056B3] text-white' : 'border-[#E2E8F0] bg-white'}`}>
                        {selected && <Check className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm text-[#003770]">{rule.titulo}</strong>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${rule.tipo === 'General' ? 'bg-[#168FBD]/10 text-[#08759E]' : 'bg-[#D59A18]/10 text-[#946807]'}`}>{rule.tipo}</span>
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-[#64748B]">{rule.descripcion}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              {fieldErrors.normas && <p className="mt-3 text-sm text-[#E30613]">{fieldErrors.normas}</p>}
            </fieldset>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate('/examenes')}
                disabled={saving}
                className="h-11 rounded-lg border border-[#E2E8F0] bg-white px-5 text-sm font-semibold text-[#1E293B] hover:bg-[#F7F7F7]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0056B3] px-6 text-sm font-semibold text-white hover:bg-[#003770] disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Guardando...' : editId ? 'Guardar reprogramación' : 'Programar examen'}
              </button>
            </div>
          </form>
        )}
      </section>
    </MainLayout>
  )
}

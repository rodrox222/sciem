import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  BookOpenCheck,
  CalendarDays,
  Check,
  Clock3,
  LoaderCircle,
  MapPin,
  Save,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { aulasService, type Aula } from '@/services/aulas.service'
import { normasService, type Norma } from '@/services/normas.service'
import { materiasService, type Materia } from '@/services/materias.service'
import {
  examenesService,
  type DocenteItem,
  type Examen,
  type ExamenPayload,
} from '@/services/examenes.service'

interface DetalleEditarTabProps {
  exam: Examen
  onUpdated: () => void
}

interface FormState {
  nombre: string
  id_materia: string
  fecha: string
  hora_ini: string
  duracion: string
  id_aula: string
  id_docente: string
}

const normalizeDate = (date: string) => (date ? String(date).slice(0, 10) : '')
const normalizeTime = (time: string) => {
  if (!time) return '08:00'
  const limpio = String(time).trim()
  return limpio.length >= 5 ? limpio.slice(0, 5) : '08:00'
}

// Soporta duraciones largas sin retornar vacío
const addMinutes = (time: string, duration: number) => {
  const normTime = normalizeTime(time)
  if (!/^\d{2}:\d{2}$/.test(normTime)) return '23:59'
  const [hours, minutes] = normTime.split(':').map(Number)
  const validDuration = Number.isNaN(duration) || duration <= 0 ? 90 : duration
  
  let total = hours * 60 + minutes + validDuration
  // Si sobrepasa la medianoche, ajustar a 23:59 para no violar la jornada del día
  if (total >= 24 * 60) {
    return '23:59'
  }
  
  const endHours = Math.floor(total / 60)
  const endMins = total % 60
  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
}

const minutesBetween = (start: string, end: string) => {
  try {
    const [startHour, startMinute] = normalizeTime(start).split(':').map(Number)
    const [endHour, endMinute] = normalizeTime(end).split(':').map(Number)
    const diff = endHour * 60 + endMinute - (startHour * 60 + startMinute)
    return diff > 0 ? diff : 90
  } catch {
    return 90
  }
}

export function DetalleEditarTab({ exam, onUpdated }: DetalleEditarTabProps) {
  const role = (localStorage.getItem('user_role') ?? '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'administrador'

  // Rescate seguro de IDs de relaciones
  const idMateriaSeguro = exam.id_materia || (exam.materia as any)?.id || ''
  const idAulaSeguro = exam.id_aula || (exam.aula as any)?.id || ''
  const idDocenteSeguro = exam.id_docente || (exam.docente as any)?.id || ''

  const [form, setForm] = useState<FormState>({
    nombre: exam.nombre || '',
    id_materia: idMateriaSeguro,
    fecha: normalizeDate(exam.fecha),
    hora_ini: normalizeTime(exam.hora_ini),
    duracion: String(minutesBetween(exam.hora_ini, exam.hora_fin)),
    id_aula: idAulaSeguro,
    id_docente: idDocenteSeguro,
  })

  const [materias, setMaterias] = useState<Materia[]>([])
  const [aulas, setAulas] = useState<Aula[]>([])
  const [docentes, setDocentes] = useState<DocenteItem[]>([])
  const [normas, setNormas] = useState<Norma[]>(exam.normas ?? [])
  const [selectedNorms, setSelectedNorms] = useState<string[]>(
    (exam.normas ?? []).map((n) => n.id)
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const endTime = useMemo(
    () => addMinutes(form.hora_ini, Number(form.duracion)),
    [form.duracion, form.hora_ini]
  )

  const loadDependencies = useCallback(async () => {
    // Si estamos en modo desconectado, poblamos con los datos del examen para no dejar selects vacíos
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (exam.materia) {
        setMaterias([{ id: idMateriaSeguro, nombre: exam.materia.nombre } as any])
      }
      if (exam.aula || idAulaSeguro) {
        setAulas([
          {
            id: idAulaSeguro,
            nombre: exam.aula?.nombre ?? 'Aula actual asignada',
            ubicacion: 'Ubicación registrada',
            capacidad: 0,
            estado: 'Disponible',
          },
        ])
      }
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const [subjects, rooms, rules, teachersRes] = await Promise.all([
        materiasService.listAll().catch(() => []),
        aulasService.list({ estado: 'Disponible', perPage: 100 }).catch(() => ({ data: [] })),
        normasService.listAll({ tipo: 'General' }).catch(() => []),
        isAdmin ? examenesService.listDocentes().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ])

      if (subjects.length > 0) {
        setMaterias(subjects)
        if (!form.id_materia && subjects[0]?.id) {
          setForm((c) => ({ ...c, id_materia: subjects[0].id }))
        }
      } else if (exam.materia) {
        setMaterias([{ id: idMateriaSeguro, nombre: exam.materia.nombre } as any])
      }

      const roomsList = rooms.data || []
      if (roomsList.length > 0) {
        const existeAula = roomsList.some((r: Aula) => r.id === idAulaSeguro)
        setAulas(
          existeAula
            ? roomsList
            : [
                ...roomsList,
                {
                  id: idAulaSeguro,
                  nombre: exam.aula?.nombre ?? 'Aula actual asignada',
                  ubicacion: 'Ubicación registrada',
                  capacidad: 0,
                  estado: 'Disponible',
                },
              ]
        )
      } else if (idAulaSeguro) {
        setAulas([
          {
            id: idAulaSeguro,
            nombre: exam.aula?.nombre ?? 'Aula actual asignada',
            ubicacion: 'Ubicación registrada',
            capacidad: 0,
            estado: 'Disponible',
          },
        ])
      }

      if (rules.length > 0) setNormas(rules)
      if (teachersRes.data?.length > 0) setDocentes(teachersRes.data)
    } catch (err) {
      console.warn('Advertencia cargando dependencias:', err)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, idMateriaSeguro, idAulaSeguro, exam.materia, exam.aula?.nombre, form.id_materia])

  useEffect(() => {
    void loadDependencies()
  }, [loadDependencies])

  const toggleNorm = (id: string) => {
    setSelectedNorms((curr) =>
      curr.includes(id) ? curr.filter((i) => i !== id) : [...curr, id]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const horaFinValida = endTime || '23:59'

      const payload: ExamenPayload = {
        nombre: form.nombre.trim(),
        id_materia: form.id_materia || idMateriaSeguro,
        estado: exam.estado,
        fecha: form.fecha,
        hora_ini: form.hora_ini,
        hora_fin: horaFinValida,
        id_aula: form.id_aula || idAulaSeguro,
        id_docente: form.id_docente || idDocenteSeguro,
        normas_ids: selectedNorms,
      }

      const response = await examenesService.update(exam.id, payload)
      const mensajeExito = !navigator.onLine
        ? 'Modificación guardada localmente en este dispositivo. Se sincronizará automáticamente al detectar conexión.'
        : (response.message || 'Evaluación actualizada correctamente.')

      setSuccess(mensajeExito)
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar cambios del examen.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-64 place-items-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-sci-cyan" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {success && (
        <div className="rounded-xl border border-sci-cyan/30 bg-sci-cyan/10 px-4 py-3 text-xs font-semibold text-sci-navy">
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-sci-red/30 bg-sci-red/10 p-4 text-xs font-semibold text-sci-red">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nombre de la evaluación *</Label>
            <Input
              value={form.nombre}
              onChange={(e) => setForm((c) => ({ ...c, nombre: e.target.value }))}
              className="h-10 text-xs border-border"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <BookOpenCheck className="h-3.5 w-3.5 text-sci-cyan" /> Asignatura *
              </Label>
              <select
                value={form.id_materia}
                onChange={(e) => setForm((c) => ({ ...c, id_materia: e.target.value }))}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
                required
              >
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <MapPin className="h-3.5 w-3.5 text-sci-cyan" /> Aula asignada *
              </Label>
              <select
                value={form.id_aula}
                onChange={(e) => setForm((c) => ({ ...c, id_aula: e.target.value }))}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
                required
              >
                {aulas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} {a.ubicacion ? `· ${a.ubicacion}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {isAdmin && docentes.length > 0 && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <UserCheck className="h-3.5 w-3.5 text-sci-cyan" /> Docente asignado *
                </Label>
                <select
                  value={form.id_docente}
                  onChange={(e) => setForm((c) => ({ ...c, id_docente: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-sci-blue/20"
                  required
                >
                  {docentes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {[d.nombre, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <CalendarDays className="h-3.5 w-3.5 text-sci-cyan" /> Fecha *
              </Label>
              <Input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((c) => ({ ...c, fecha: e.target.value }))}
                className="h-10 text-xs border-border"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs font-semibold">
                  <Clock3 className="h-3.5 w-3.5 text-sci-cyan" /> Inicio *
                </Label>
                <Input
                  type="time"
                  value={form.hora_ini}
                  onChange={(e) => setForm((c) => ({ ...c, hora_ini: e.target.value }))}
                  className="h-10 text-xs border-border"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Duración (min) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.duracion}
                  onChange={(e) => setForm((c) => ({ ...c, duracion: e.target.value }))}
                  className="h-10 text-xs border-border"
                  required
                />
              </div>
            </div>
          </div>

          {normas.length > 0 && (
            <div className="pt-2">
              <Label className="mb-2 block text-xs font-semibold">Normas generales aplicables</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {normas.map((rule) => {
                  const selected = selectedNorms.includes(rule.id)
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => toggleNorm(rule.id)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-2.5 text-left text-xs transition cursor-pointer ${
                        selected ? 'border-sci-blue bg-sci-blue/5' : 'border-border bg-card'
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${
                          selected ? 'border-sci-blue bg-sci-blue text-white' : 'border-border'
                        }`}
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="font-semibold text-sci-navy">{rule.titulo}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              disabled={saving}
              className="cursor-pointer gap-2 bg-sci-blue text-xs font-semibold text-white hover:opacity-90"
            >
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Guardando...' : 'Guardar modificaciones'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
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

const normalizeDate = (date: string) => (date ? date.slice(0, 10) : '')
const normalizeTime = (time: string) => (time ? time.slice(0, 5) : '')

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

export function DetalleEditarTab({ exam, onUpdated }: DetalleEditarTabProps) {
  const role = (localStorage.getItem('user_role') ?? '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'administrador'

  const [form, setForm] = useState<FormState>({
    nombre: exam.nombre,
    id_materia: exam.id_materia,
    fecha: normalizeDate(exam.fecha),
    hora_ini: normalizeTime(exam.hora_ini),
    duracion: String(minutesBetween(exam.hora_ini, exam.hora_fin)),
    id_aula: exam.id_aula,
    id_docente: exam.id_docente,
  })

  const [materias, setMaterias] = useState<Materia[]>([])
  const [aulas, setAulas] = useState<Aula[]>([])
  const [docentes, setDocentes] = useState<DocenteItem[]>([])
  const [normas, setNormas] = useState<Norma[]>([])
  const [selectedNorms, setSelectedNorms] = useState<string[]>(
    (exam.normas ?? []).map((n) => n.id),
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const endTime = useMemo(
    () => addMinutes(form.hora_ini, Number(form.duracion)),
    [form.duracion, form.hora_ini],
  )

  const loadDependencies = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [subjects, rooms, rules, teachersRes] = await Promise.all([
        materiasService.listAll(),
        aulasService.list({ estado: 'Disponible', perPage: 100 }),
        normasService.listAll({ tipo: 'General' }),
        isAdmin ? examenesService.listDocentes() : Promise.resolve({ data: [] }),
      ])
      setMaterias(subjects)
      setAulas(
        rooms.data.some((r: Aula) => r.id === exam.id_aula)
          ? rooms.data
          : [
              ...rooms.data,
              {
                id: exam.id_aula,
                nombre: exam.aula?.nombre ?? 'Aula actual',
                ubicacion: 'Ubicación registrada',
                capacidad: 0,
                estado: 'Disponible',
              },
            ],
      )
      setNormas(rules)
      setDocentes(teachersRes.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar opciones de edición.')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, exam.id_aula])

  useEffect(() => {
    void loadDependencies()
  }, [loadDependencies])

  const toggleNorm = (id: string) => {
    setSelectedNorms((curr) =>
      curr.includes(id) ? curr.filter((i) => i !== id) : [...curr, id],
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const payload: ExamenPayload = {
        nombre: form.nombre.trim(),
        id_materia: form.id_materia,
        estado: exam.estado,
        fecha: form.fecha,
        hora_ini: form.hora_ini,
        hora_fin: endTime,
        id_aula: form.id_aula,
        id_docente: form.id_docente,
        normas_ids: selectedNorms,
      }

      await examenesService.update(exam.id, payload)
      setSuccess('Evaluación actualizada correctamente.')
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
              >
                {materias.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
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
              >
                {aulas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre} · {a.ubicacion}</option>
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
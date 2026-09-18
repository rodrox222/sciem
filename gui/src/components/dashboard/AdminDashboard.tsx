import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  BookOpenCheck,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock3,
  GraduationCap,
  MapPin,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'

import { aulasService, type PaginatedResponse } from '../../services/aulas.service'
import { apiRequest } from '../../services/apiClient'
import { estudiantesService } from '../../services/estudiantes.service'
import { examenesService, type Examen } from '../../services/examenes.service'

interface AuditEntry {
  id: string | number
  accion: string
  modulo?: string | null
  usuario_nombre?: string | null
  created_at: string
}

interface DashboardData {
  users: number | null
  rooms: number | null
  exams: number | null
  students: number | null
  upcoming: Examen[]
  activity: AuditEntry[]
  checks: boolean[]
}

const actions = [
  { title: 'Usuarios', description: 'Gestionar usuarios y roles', href: '/usuarios', icon: <UsersRound className="h-6 w-6" />, tone: 'text-blue-700 bg-blue-50' },
  { title: 'Ambientes', description: 'Administrar aulas y espacios', href: '/aulas', icon: <Building2 className="h-6 w-6" />, tone: 'text-emerald-700 bg-emerald-50' },
  { title: 'Normativas', description: 'Gestionar normas y reglas', href: '/normas', icon: <BookOpenCheck className="h-6 w-6" />, tone: 'text-violet-700 bg-violet-50' },
  { title: 'Exámenes', description: 'Programar y administrar', href: '/examenes', icon: <ClipboardList className="h-6 w-6" />, tone: 'text-amber-700 bg-amber-50' },
  { title: 'Estudiantes', description: 'Consultar el padrón', href: '/estudiantes', icon: <GraduationCap className="h-6 w-6" />, tone: 'text-rose-700 bg-rose-50' },
  { title: 'Auditoría', description: 'Revisar la actividad registrada', href: '/dashboard/auditoria', icon: <ShieldCheck className="h-6 w-6" />, tone: 'text-sky-700 bg-sky-50' },
]

const activityLabel = (entry: AuditEntry) => {
  const labels: Record<string, string> = {
    USUARIO_CREADO: 'Usuario registrado',
    MATERIA_CREADA: 'Materia registrada',
    EXAMEN_CREADO: 'Examen programado',
    ESTUDIANTE_INSCRITO_EXAMEN: 'Estudiante inscrito',
    NORMA_CREADA: 'Norma registrada',
    AULA_CREADA: 'Ambiente registrado',
  }
  return labels[entry.accion] ?? entry.accion.replaceAll('_', ' ').toLocaleLowerCase('es')
}

const dateLabel = (value: string, withTime = false) => {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T12:00:00' : value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  onClick,
  loading,
}: {
  title: string
  value: number | null
  subtitle: string
  icon: ReactNode
  accent: string
  onClick: () => void
  loading: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={'flex min-h-28 w-full items-center gap-4 rounded-xl border border-slate-200 border-l-4 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ' + accent}
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-sky-50 text-[#0056B3]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#193657]">{title}</span>
        <span className="block text-2xl font-extrabold text-[#193657]">{loading ? '…' : value ?? '—'}</span>
        <span className="block text-xs text-slate-500">{subtitle}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#0056B3]" />
    </button>
  )
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void Promise.allSettled([
      apiRequest<PaginatedResponse<unknown>>('/users'),
      aulasService.list({ estado: 'Disponible', perPage: 1 }),
      examenesService.list({ estado: 'Programado', perPage: 100 }),
      estudiantesService.list({ perPage: 1 }),
      apiRequest<PaginatedResponse<AuditEntry>>('/auditoria?per_page=4'),
    ]).then(([users, rooms, exams, students, audits]) => {
      if (!active) return
      const today = new Date()
      const upcoming = exams.status === 'fulfilled'
        ? exams.value.data
          .filter((exam) => {
            const startsAt = new Date(exam.fecha.slice(0, 10) + 'T' + exam.hora_ini.slice(0, 5) + ':00')
            return !Number.isNaN(startsAt.getTime()) && startsAt >= today
          })
          .sort((a, b) => (a.fecha + a.hora_ini).localeCompare(b.fecha + b.hora_ini))
          .slice(0, 4)
        : []

      setData({
        users: users.status === 'fulfilled' ? users.value.total : null,
        rooms: rooms.status === 'fulfilled' ? rooms.value.total : null,
        exams: exams.status === 'fulfilled' ? exams.value.total : null,
        students: students.status === 'fulfilled' ? students.value.total : null,
        upcoming,
        activity: audits.status === 'fulfilled' ? audits.value.data : [],
        checks: [users, rooms, exams, students, audits].map((result) => result.status === 'fulfilled'),
      })
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const now = new Date()
  const checks = [
    { name: 'Usuarios', ok: data?.checks[0] },
    { name: 'Ambientes', ok: data?.checks[1] },
    { name: 'Exámenes', ok: data?.checks[2] },
    { name: 'Estudiantes', ok: data?.checks[3] },
    { name: 'Auditoría', ok: data?.checks[4] },
  ]

  return (
    <div className="space-y-5 text-[#193657]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Bienvenido, Administrador</h1>
          <p className="mt-1 text-sm text-slate-600">Gestiona y supervisa los recursos del Sistema de Control de Ingreso (SCI).</p>
          <span className="mt-3 block h-0.5 w-14 rounded-full bg-[#0056B3]" />
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-[#0056B3]"><CalendarDays className="h-5 w-5" /></span>
          <div className="text-xs text-slate-500">
            <p>Hoy es</p>
            <p className="text-sm font-bold text-[#193657]">{dateLabel(now.toISOString())}</p>
            <p>{new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit' }).format(now)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen administrativo">
        <MetricCard title="Usuarios" value={data?.users ?? null} subtitle="registrados en el sistema" icon={<UsersRound className="h-6 w-6" />} accent="border-l-blue-600" loading={loading} onClick={() => navigate('/usuarios')} />
        <MetricCard title="Ambientes" value={data?.rooms ?? null} subtitle="aulas disponibles" icon={<Building2 className="h-6 w-6" />} accent="border-l-emerald-500" loading={loading} onClick={() => navigate('/aulas')} />
        <MetricCard title="Exámenes" value={data?.exams ?? null} subtitle="programados" icon={<ClipboardList className="h-6 w-6" />} accent="border-l-amber-500" loading={loading} onClick={() => navigate('/examenes')} />
        <MetricCard title="Estudiantes" value={data?.students ?? null} subtitle="registrados" icon={<GraduationCap className="h-6 w-6" />} accent="border-l-rose-500" loading={loading} onClick={() => navigate('/estudiantes')} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-[#0056B3]"><Activity className="h-5 w-5" /></span>
            <div>
              <h2 className="text-lg font-bold">Acciones principales</h2>
              <p className="text-sm text-slate-500">Accede rápidamente a las funciones del sistema.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {actions.map((action) => (
              <button key={action.title} type="button" onClick={() => navigate(action.href)} className="flex min-h-28 items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-[#0056B3] hover:shadow-sm">
                <span className={'grid h-11 w-11 shrink-0 place-items-center rounded-full ' + action.tone}>{action.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{action.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">{action.description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#0056B3]" />
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="flex items-center gap-2 text-base font-bold"><CalendarDays className="h-5 w-5 text-[#0056B3]" /> Próximos exámenes</h2>
            <button type="button" onClick={() => navigate('/examenes')} className="min-h-10 text-xs font-semibold text-[#0056B3]">Ver todos →</button>
          </div>
          {loading ? <p className="py-5 text-sm text-slate-500">Cargando exámenes…</p> : !data?.checks[2] ? (
            <p className="py-5 text-sm text-slate-500">No se pudieron consultar los exámenes.</p>
          ) : data.upcoming.length === 0 ? (
            <p className="py-5 text-sm text-slate-500">No hay próximos exámenes en la lista consultada.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {data.upcoming.map((exam) => (
                <button key={exam.id} type="button" onClick={() => navigate('/examenes')} className="flex min-h-16 w-full items-center gap-3 py-3 text-left">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-[#0056B3]"><BookOpenCheck className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{exam.nombre}</span>
                    <span className="block text-xs text-slate-500">{exam.materia?.nombre ?? 'Materia sin detalle'}</span>
                    <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{dateLabel(exam.fecha)} · {exam.hora_ini.slice(0, 5)}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{exam.aula?.nombre ?? 'Sin aula'}</span>
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#0056B3]" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="flex items-center gap-2 text-base font-bold"><Clock3 className="h-5 w-5 text-[#0056B3]" /> Actividad reciente</h2>
            <button type="button" onClick={() => navigate('/dashboard/auditoria')} className="min-h-10 text-xs font-semibold text-[#0056B3]">Ver todas →</button>
          </div>
          {loading ? <p className="py-5 text-sm text-slate-500">Cargando actividad…</p> : !data?.checks[4] ? (
            <p className="py-5 text-sm text-slate-500">No se pudo consultar la auditoría.</p>
          ) : data.activity.length === 0 ? (
            <p className="py-5 text-sm text-slate-500">No hay actividad registrada.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {data.activity.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-50 text-[#0056B3]"><Activity className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{activityLabel(entry)}</p>
                    <p className="truncate text-xs text-slate-500">{entry.usuario_nombre ?? entry.modulo ?? 'Sistema'}</p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-500" dateTime={entry.created_at}>{dateLabel(entry.created_at, true)}</time>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="flex items-center gap-2 text-base font-bold"><ShieldCheck className="h-5 w-5 text-[#0056B3]" /> Estado del sistema</h2>
            <p className="mt-1 text-xs text-slate-500">Disponibilidad de las consultas del panel.</p>
          </div>
          <div className="divide-y divide-slate-200">
            {checks.map((check) => (
              <div key={check.name} className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm">
                <span className="font-semibold">{check.name}</span>
                <span className={'rounded-full px-3 py-1 text-xs font-semibold ' + (
                  loading ? 'bg-slate-100 text-slate-600' : check.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                )}>
                  {loading ? 'Consultando' : check.ok ? 'Disponible' : 'Sin respuesta'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

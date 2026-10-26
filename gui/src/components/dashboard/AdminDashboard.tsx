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
  UsersRound,
} from 'lucide-react'

import { api } from '../../services/api'
import { examenesService, type Examen } from '../../services/examenes.service'
import type { PaginatedResponse } from '@/types/api'

interface AuditEntry {
  id: string | number
  accion: string
  modulo?: string | null
  usuario_nombre?: string | null
  created_at: string
}

interface StatsResponse {
  users: number
  rooms: number
  exams: number
  students: number
}

interface DashboardData {
  users: number | null
  rooms: number | null
  exams: number | null
  students: number | null
  upcoming: Examen[]
  activity: AuditEntry[]
  hasAuditError: boolean
  hasExamsError: boolean
}

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
  const clean = value.trim()
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean + 'T12:00:00' : clean)
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
  borderAccent,
  onClick,
  loading,
}: {
  title: string
  value: number | null
  subtitle: string
  icon: ReactNode
  borderAccent: string
  onClick: () => void
  loading: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-28 w-full items-center gap-4 rounded-2xl border border-border border-l-4 bg-card p-5 text-left shadow-xs transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${borderAccent}`}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted text-sci-navy">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
        <span className="block text-2xl font-extrabold text-sci-navy">{loading ? '…' : value ?? '—'}</span>
        <span className="block text-xs text-muted-foreground truncate">{subtitle}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      try {
        // 1. Obtener métricas consolidadas en una sola petición
        const stats = await api.get<StatsResponse>('/dashboard/stats').catch(() => null)

        // 2. Obtener actividad y próximos exámenes en paralelo pero ligero
        const [auditsRes, examsRes] = await Promise.allSettled([
          api.get<PaginatedResponse<AuditEntry>>('/auditoria?per_page=4'),
          examenesService.list({ estado: 'Programado', perPage: 10 }),
        ])

        if (!active) return

        const today = new Date()
        const upcoming =
          examsRes.status === 'fulfilled'
            ? examsRes.value.data
                .filter((exam) => {
                  if (!exam.fecha) return false
                  const cleanDate = exam.fecha.slice(0, 10)
                  const cleanTime = (exam.hora_ini || '00:00').slice(0, 5)
                  const startsAt = new Date(`${cleanDate}T${cleanTime}:00`)
                  return !Number.isNaN(startsAt.getTime()) && startsAt >= today
                })
                .sort((a, b) => (a.fecha + a.hora_ini).localeCompare(b.fecha + b.hora_ini))
                .slice(0, 4)
            : []

        setData({
          users: stats?.users ?? null,
          rooms: stats?.rooms ?? null,
          exams: stats?.exams ?? null,
          students: stats?.students ?? null,
          upcoming,
          activity: auditsRes.status === 'fulfilled' ? auditsRes.value.data : [],
          hasAuditError: auditsRes.status === 'rejected',
          hasExamsError: examsRes.status === 'rejected',
        })
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadDashboard()

    return () => {
      active = false
    }
  }, [])

  const now = new Date()

  return (
    <div className="space-y-6">
      {/* Encabezado y Fecha Actual */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
            Panel de Administración
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-sci-navy sm:text-3xl tracking-tight">
            Bienvenido, Administrador
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Supervisa los recursos y actividades académicas del Sistema de Control de Ingreso (SCI).
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-3 shadow-xs">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-sci-blue/10 text-sci-blue">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div className="text-xs text-muted-foreground">
            <p className="font-medium">Fecha y hora oficial</p>
            <p className="text-sm font-bold text-sci-navy">{dateLabel(now.toISOString())}</p>
            <p className="text-[11px] font-medium">
              {new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit' }).format(now)}
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen administrativo">
        <MetricCard
          title="Usuarios"
          value={data?.users ?? null}
          subtitle="registrados en el sistema"
          icon={<UsersRound className="h-6 w-6 text-sci-navy" />}
          borderAccent="border-l-sci-navy"
          loading={loading}
          onClick={() => navigate('/usuarios')}
        />
        <MetricCard
          title="Ambientes"
          value={data?.rooms ?? null}
          subtitle="aulas disponibles"
          icon={<Building2 className="h-6 w-6 text-sci-cyan" />}
          borderAccent="border-l-sci-cyan"
          loading={loading}
          onClick={() => navigate('/aulas')}
        />
        <MetricCard
          title="Exámenes"
          value={data?.exams ?? null}
          subtitle="programados activos"
          icon={<ClipboardList className="h-6 w-6 text-sci-amber" />}
          borderAccent="border-l-sci-amber"
          loading={loading}
          onClick={() => navigate('/examenes')}
        />
        <MetricCard
          title="Estudiantes"
          value={data?.students ?? null}
          subtitle="registrados en el padrón"
          icon={<GraduationCap className="h-6 w-6 text-sci-blue" />}
          borderAccent="border-l-sci-blue"
          loading={loading}
          onClick={() => navigate('/estudiantes')}
        />
      </div>

      {/* Secciones Inferiores: Actividad Reciente y Próximos Exámenes */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Auditoría / Actividad */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-sci-navy">
                <Clock3 className="h-5 w-5 text-sci-cyan" /> Actividad reciente
              </h2>
              <button
                type="button"
                onClick={() => navigate('/dashboard/auditoria')}
                className="text-xs font-semibold text-sci-blue hover:text-sci-navy transition-colors cursor-pointer"
              >
                Ver todas →
              </button>
            </div>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Cargando actividad…</p>
            ) : data?.hasAuditError ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No se pudo consultar la auditoría.</p>
            ) : data?.activity.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No hay actividad registrada.</p>
            ) : (
              <div className="divide-y divide-border">
                {data?.activity.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 py-3 text-sm">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sci-cyan/10 text-sci-cyan">
                      <Activity className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{activityLabel(entry)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.usuario_nombre ?? entry.modulo ?? 'Sistema'}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground" dateTime={entry.created_at}>
                      {dateLabel(entry.created_at, true)}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Próximos Exámenes */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-sci-navy">
                <CalendarDays className="h-5 w-5 text-sci-cyan" /> Próximos exámenes
              </h2>
              <button
                type="button"
                onClick={() => navigate('/examenes')}
                className="text-xs font-semibold text-sci-blue hover:text-sci-navy transition-colors cursor-pointer"
              >
                Ver todos →
              </button>
            </div>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Cargando exámenes…</p>
            ) : data?.hasExamsError ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No se pudieron consultar los exámenes.</p>
            ) : data?.upcoming.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No hay evaluaciones programadas próximas.</p>
            ) : (
              <div className="divide-y divide-border">
                {data?.upcoming.map((exam) => (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => navigate('/examenes')}
                    className="flex min-h-16 w-full items-center gap-3 py-3 text-left hover:bg-muted/40 rounded-xl px-2 transition-colors cursor-pointer"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sci-blue/10 text-sci-blue">
                      <BookOpenCheck className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-foreground">{exam.nombre}</span>
                      <span className="block text-xs text-muted-foreground">
                        {exam.materia?.nombre ?? 'Materia sin detalle'}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3 text-sci-cyan" />
                          {dateLabel(exam.fecha)} · {exam.hora_ini.slice(0, 5)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-sci-cyan" />
                          {exam.aula?.nombre ?? 'Sin aula'}
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
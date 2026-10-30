import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpenCheck, CalendarDays, ChevronRight, CircleAlert,
  ClipboardList, DoorOpen, GraduationCap, RefreshCw,
  ShieldCheck, UsersRound,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiError } from '@/services/api'
import {
  dashboardService, esErrorResumen, normalizarRolDashboard,
  type DashboardResponse, type ExamenDashboard,
  type ResumenAdmin, type ResumenConExamenes, type ResumenDocente,
  type RolDashboard,
} from '@/services/dashboard.service'

const TITULOS: Record<RolDashboard, string> = {
  admin: 'Administración',
  docente: 'Docente',
  auxiliar: 'Auxiliar',
  estudiante: 'Estudiante',
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'Fecha por confirmar'
  const soloFecha = fecha.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) return fecha
  const date = new Date(`${soloFecha}T12:00:00`)
  if (Number.isNaN(date.getTime())) return fecha
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(date)
}

function Indicador({ titulo, cantidad, icono, detalle, enlace }: {
  titulo: string
  cantidad: number | null
  icono: ReactNode
  detalle: string
  enlace?: string
}) {
  const contenido = (
    <Card className="h-full gap-2 border-l-4 border-l-sci-cyan">
      <CardHeader className="grid grid-cols-[1fr_auto] items-center gap-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground">{titulo}</CardTitle>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-sci-blue/10 text-sci-navy" aria-hidden="true">{icono}</span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-extrabold tabular-nums text-sci-navy">{cantidad ?? 'No disponible'}</p>
        <p className="mt-1 text-xs text-muted-foreground">{cantidad === null ? 'No fue posible cargar esta métrica.' : detalle}</p>
      </CardContent>
    </Card>
  )
  return enlace
    ? <Link to={enlace} className="block min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label={`${titulo}: ${cantidad}. Abrir módulo`}>{contenido}</Link>
    : <div className="min-w-0">{contenido}</div>
}

function ListaExamenes({ examenes, rol }: { examenes: ExamenDashboard[]; rol: RolDashboard }) {
  if (examenes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground" role="status">
        No hay exámenes asociados a tu usuario.
      </div>
    )
  }

  return (
    <ul className="grid min-w-0 gap-3 sm:grid-cols-2" aria-label="Exámenes asociados">
      {examenes.map((examen) => (
        <li key={examen.id} className="min-w-0">
          <Card className="h-full gap-3">
            <CardHeader>
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <CardTitle className="min-w-0 flex-1 break-words text-sci-navy">
                  {examen.nombre || examen.materia || 'Examen sin nombre'}
                </CardTitle>
                {rol === 'estudiante' && examen.estado_habilitacion
                  ? <Badge variant="outline">{examen.estado_habilitacion}</Badge>
                  : examen.estado ? <Badge variant="outline">{examen.estado}</Badge> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {examen.materia && <p className="break-words">Materia: {examen.materia}</p>}
              <p className="flex flex-wrap items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />{formatearFecha(examen.fecha)}</p>
              {(examen.hora_ini || examen.hora_fin) && <p className="flex flex-wrap gap-2">Horario: {examen.hora_ini?.slice(0, 5) || '—'} – {examen.hora_fin?.slice(0, 5) || '—'}</p>}
              {examen.aula && <p className="break-words">Ambiente: {examen.aula}</p>}
              {rol === 'auxiliar' && examen.docente && <p className="break-words">Docente: {examen.docente}</p>}
              {rol === 'estudiante' && examen.estado_habilitacion === 'Inhabilitado' && examen.motivo_estado &&
                <p className="break-words text-destructive">Motivo: {examen.motivo_estado}</p>}
              <Link
                to={rol === 'estudiante' ? '/estudiante' : `/examenes/${encodeURIComponent(String(examen.id))}`}
                className="inline-flex items-center gap-1 font-semibold text-sci-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {rol === 'estudiante' ? 'Abrir mi módulo' : 'Ver examen'}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}

function ResumenPorRol({ data }: { data: DashboardResponse }) {
  const resumen = data.secciones.resumen
  if (esErrorResumen(resumen)) {
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Resumen no disponible</AlertTitle>
        <AlertDescription>{resumen.error}</AlertDescription>
      </Alert>
    )
  }

  if (data.rol === 'admin') {
    const valores = resumen as ResumenAdmin
    return (
      <section aria-labelledby="hu20-resumen" className="space-y-4">
        <h2 id="hu20-resumen" className="text-lg font-bold text-sci-navy">Resumen institucional</h2>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador titulo="Usuarios" cantidad={valores.usuarios} detalle="Administradores, docentes y auxiliares" icono={<UsersRound className="h-5 w-5" />} enlace="/usuarios" />
          <Indicador titulo="Estudiantes" cantidad={valores.estudiantes} detalle="Registrados en el sistema" icono={<GraduationCap className="h-5 w-5" />} enlace="/estudiantes" />
          <Indicador titulo="Ambientes disponibles" cantidad={valores.aulas_disponibles} detalle="Ambientes con disponibilidad" icono={<DoorOpen className="h-5 w-5" />} enlace="/aulas" />
          <Indicador titulo="Exámenes programados" cantidad={valores.examenes_programados} detalle="Evaluaciones programadas" icono={<ClipboardList className="h-5 w-5" />} enlace="/examenes" />
        </div>
      </section>
    )
  }

  const valores = resumen as ResumenConExamenes & Partial<ResumenDocente>
  const exams = Array.isArray(valores.examenes) ? valores.examenes : []
  return (
    <div className="space-y-6">
      <section aria-labelledby="hu20-resumen" className="space-y-4">
        <h2 id="hu20-resumen" className="text-lg font-bold text-sci-navy">Mi resumen</h2>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Indicador titulo="Mis exámenes" cantidad={valores.total_examenes} detalle="Asociados a tu usuario" icono={<BookOpenCheck className="h-5 w-5" />} />
          {data.rol === 'docente' && (
            <>
              <Indicador titulo="Estudiantes inscritos" cantidad={valores.total_inscritos ?? null} detalle="En tus exámenes" icono={<UsersRound className="h-5 w-5" />} />
              <Indicador titulo="Ingresos registrados" cantidad={valores.total_ingresados ?? null} detalle="Ingresos autorizados" icono={<ShieldCheck className="h-5 w-5" />} />
            </>
          )}
        </div>
      </section>
      <section aria-labelledby="hu20-examenes" className="space-y-4">
        <h2 id="hu20-examenes" className="text-lg font-bold text-sci-navy">
          {data.rol === 'estudiante' ? 'Mis evaluaciones' : 'Exámenes asignados'}
        </h2>
        {data.errores_secciones?.examenes ? <p role="alert">{data.errores_secciones.examenes}</p> : <ListaExamenes examenes={exams} rol={data.rol} />}
      </section>
    </div>
  )
}

export function DashboardUnificado() {
  const [rolActivo, setRolActivo] = useState<RolDashboard>(() => {
    return normalizarRolDashboard(localStorage.getItem('user_role')) || 'estudiante'
  })

  // Detectar si el usuario tiene doble rol (es_auxiliar = true)
  const [esUsuarioDual] = useState<boolean>(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user_data') || '{}')
      return Boolean(u.es_auxiliar || u.roles_disponibles?.includes('auxiliar'))
    } catch {
      return false
    }
  })

  const [revision, setRevision] = useState(0)
  const [respuesta, setRespuesta] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    setLoading(true)
    setError('')

    dashboardService.obtener()
      .then((data) => {
        if (!activo) return
        if (!data.success || !data.secciones?.resumen) {
          setError('El servidor no devolvió información válida para el dashboard.')
          setRespuesta(null)
          return
        }

        // Si es usuario dual, adaptamos la visualización al rol seleccionado
        const dataAdaptada: DashboardResponse = {
          ...data,
          rol: esUsuarioDual ? rolActivo : data.rol,
        }

        setRespuesta(dataAdaptada)
        setError('')
      })
      .catch((e: unknown) => {
        if (!activo) return
        setRespuesta(null)
        setError(e instanceof ApiError && e.status === 403
          ? 'No tienes autorización para consultar este dashboard.'
          : e instanceof ApiError && e.status === 401
            ? 'La sesión ha expirado. Inicia sesión nuevamente.'
            : 'No se pudo obtener el dashboard. Revisa la conexión e inténtalo de nuevo.')
      })
      .finally(() => { if (activo) setLoading(false) })
    return () => { activo = false }
  }, [revision, rolActivo, esUsuarioDual])

  const alternarModo = (nuevoRol: RolDashboard) => {
    if (nuevoRol === rolActivo) return
    setRolActivo(nuevoRol)
    
    localStorage.setItem('user_role', nuevoRol)

    try {
      const rawUser = localStorage.getItem('user_data')
      if (rawUser) {
        const parsed = JSON.parse(rawUser)
        parsed.rol = nuevoRol
        localStorage.setItem('user_data', JSON.stringify(parsed))
      }
    } catch {
    }

    window.dispatchEvent(new CustomEvent('rolCambiado', { detail: nuevoRol }))
  }

  const reintentar = () => {
    setLoading(true)
    setRespuesta(null)
    setError('')
    setRevision((v) => v + 1)
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-sci-cyan">Panel unificado de SCI</p>
          <h1 className="mt-1 break-words text-2xl font-extrabold text-sci-navy sm:text-3xl">
            {`Dashboard de ${TITULOS[rolActivo] || 'Usuario'}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen del usuario autenticado, según los datos autorizados por el servidor.
          </p>

          {/* Switch de modo para estudiantes que son auxiliares */}
          {esUsuarioDual && (
            <div className="mt-3 inline-flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1 shadow-2xs">
              <span className="px-2.5 text-xs font-semibold text-muted-foreground">
                Vista actual:
              </span>
              <button
                type="button"
                onClick={() => alternarModo('estudiante')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  rolActivo === 'estudiante'
                    ? 'bg-card text-sci-navy shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Estudiante
              </button>
              <button
                type="button"
                onClick={() => alternarModo('auxiliar')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  rolActivo === 'auxiliar'
                    ? 'bg-card text-sci-navy shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Auxiliar
              </button>
            </div>
          )}
        </div>

        <Button type="button" variant="outline" onClick={reintentar} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Actualizar
        </Button>
      </div>

      {loading && (
        <div className="space-y-3" role="status" aria-live="polite">
          <p className="text-sm text-muted-foreground">Cargando el resumen de tu dashboard…</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((v) => <div key={v} className="h-32 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />)}
          </div>
        </div>
      )}

      {!loading && error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>No fue posible cargar el dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && respuesta && <ResumenPorRol data={respuesta} />}

      {!loading && rolActivo === 'estudiante' && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Para generar tu QR, verificar habilitación o actualizar tu fotografía, visita{' '}
          <Link to="/estudiante" className="font-semibold text-sci-blue underline underline-offset-2">Mi módulo de estudiante</Link>.
        </div>
      )}
    </div>
  )
}
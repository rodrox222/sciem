import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpenCheck, CalendarDays, ChevronRight, CircleAlert,
  ClipboardList, DoorOpen, Download, GraduationCap, RefreshCw,
  ShieldCheck, Smartphone, UsersRound,
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
import { examenesService } from '@/services/examenes.service'
import { estudiantesService } from '@/services/estudiantes.service'

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
                to={rol === 'estudiante' ? `/estudiante/examenes/${encodeURIComponent(String(examen.id))}` : `/examenes/${encodeURIComponent(String(examen.id))}`}
                className="inline-flex items-center gap-1 font-semibold text-sci-blue hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer pt-2"
              >
                {rol === 'estudiante' ? 'Ver evaluación' : 'Gestionar evaluación'}
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

  // Escuchar el cambio de rol originado desde el tab del Header
  useEffect(() => {
    const handleRolCambiado = (e: Event) => {
      const customEvent = e as CustomEvent<string>
      const nuevo = normalizarRolDashboard(customEvent.detail || localStorage.getItem('user_role'))
      if (nuevo) {
        setRolActivo(nuevo)
      }
    }

    window.addEventListener('rolCambiado', handleRolCambiado)
    window.addEventListener('storage', handleRolCambiado)

    return () => {
      window.removeEventListener('rolCambiado', handleRolCambiado)
      window.removeEventListener('storage', handleRolCambiado)
    }
  }, [])

  const [revision, setRevision] = useState(0)
  const [respuesta, setRespuesta] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    setLoading(true)
    setError('')

    const cargarDatos = async () => {
      try {
        const data = await dashboardService.obtener()
        if (!activo) return

        let dataAdaptada: DashboardResponse = {
          ...data,
          rol: esUsuarioDual ? rolActivo : data.rol,
        }

        // Si es AUXILIAR, traemos los exámenes y excluimos los que cursa como estudiante
        if (rolActivo === 'auxiliar') {
          try {
            let idsComoEstudiante: string[] = []
            try {
              const resMisEx = await estudiantesService.misExamenes()
              const examenesEstudiante = Array.isArray(resMisEx.examenes) ? resMisEx.examenes : []
              idsComoEstudiante = examenesEstudiante.map((e) => String(e.id_examen))
            } catch (errMisEx) {
              console.warn('No se pudieron obtener exámenes de estudiante para exclusión:', errMisEx)
            }

            const res = await examenesService.list({ perPage: 50 })
            const lista = Array.isArray(res.data) ? res.data : []

            const examenesParaGestionar = lista.filter(
              (ex: any) => !idsComoEstudiante.includes(String(ex.id))
            )

            const examenesMapeados: ExamenDashboard[] = examenesParaGestionar.map((ex: any) => ({
              id: ex.id,
              nombre: ex.nombre,
              materia: ex.materia?.nombre || ex.materia || 'Sin asignatura',
              fecha: ex.fecha,
              hora_ini: ex.hora_ini,
              hora_fin: ex.hora_fin,
              aula: ex.aula?.nombre || ex.aula || 'Aula asignada',
              docente: ex.docente?.nombre 
                ? `${ex.docente.nombre} ${ex.docente.apellido_paterno || ''}`.trim()
                : (typeof ex.docente === 'string' ? ex.docente : 'Docente titular'),
              estado: ex.estado || 'Programado',
            }))

            dataAdaptada = {
              ...dataAdaptada,
              secciones: {
                ...dataAdaptada.secciones,
                resumen: {
                  total_examenes: examenesMapeados.length,
                  examenes: examenesMapeados,
                } as any,
              },
            }
          } catch (errEx) {
            console.error('Error al cargar exámenes para auxiliar:', errEx)
          }
        }

        setRespuesta(dataAdaptada)
        setError('')
      } catch (e: unknown) {
        if (!activo) return
        setRespuesta(null)
        setError(
          e instanceof ApiError && e.status === 403
            ? 'No tienes autorización para consultar este dashboard.'
            : e instanceof ApiError && e.status === 401
            ? 'La sesión ha expirado. Inicia sesión nuevamente.'
            : 'No se pudo obtener el dashboard. Revisa la conexión e inténtalo de nuevo.'
        )
      } finally {
        if (activo) setLoading(false)
      }
    }

    void cargarDatos()

    return () => {
      activo = false
    }
  }, [revision, rolActivo, esUsuarioDual])

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
        </div>

        {/* Acciones superiores: Solo Auxiliar puede ver la descarga del APK institucional */}
        <div className="flex flex-wrap items-center gap-2.5">
          {rolActivo === 'auxiliar' && (
            <Button
              asChild
              variant="outline"
              className="cursor-pointer gap-2 border-sci-cyan/40 bg-sci-cyan/5 font-semibold text-sci-navy shadow-xs hover:bg-sci-cyan/15 hover:text-sci-blue"
            >
              <a
                href="/apk/sci-control-ingreso.apk"
                download="SCI_Control_Ingreso.apk"
                target="_blank"
                rel="noopener noreferrer"
                title="Descargar instalador APK para control de ingreso"
              >
                <Smartphone className="h-4 w-4 text-sci-cyan" aria-hidden="true" />
                <span>Descargar APK</span>
                <Download className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </a>
            </Button>
          )}

          <Button type="button" variant="outline" onClick={reintentar} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Actualizar
          </Button>
        </div>
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
    </div>
  )
}
import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, LoaderCircle, RefreshCw, Search, Users, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Examen, ExamenEstado } from '@/services/examenes.service'
import { examenesService } from '@/services/examenes.service'
import { monitoreoService, validarResumenYListas, type ResumenMonitoreo, type ListasMonitoreo, type EstudianteMonitoreo } from '@/services/monitoreo.service'
import { EtapasExamen } from './EtapasExamen'
import { permiteMonitoreoFrontend } from './permisoMonitoreo'
import { ApiError } from '@/services/api'

// Frecuencia provisional hasta acordar el SLA con Klever; no renueva la sesión.
const ACTUALIZACION_PROVISIONAL_MS = 15_000
const FILAS_INICIALES = 30

function ListaEstudiantes({
  titulo,
  estudiantes,
  estado,
  ingresados,
  busqueda,
}: {
  titulo: string
  estudiantes: EstudianteMonitoreo[]
  estado: ExamenEstado
  ingresados: boolean
  busqueda: string
}) {
  const [mostrarTodo, setMostrarTodo] = useState(false)
  const visibles = mostrarTodo ? estudiantes : estudiantes.slice(0, FILAS_INICIALES)
  const etiqueta = ingresados ? 'Ingresó' : estado === 'Programado' ? 'Pendiente de ingreso' : estado === 'En proceso' ? 'Ausente' : 'No se presentó'

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="text-sm font-bold text-sci-navy">{titulo}</h3>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-sci-navy">{estudiantes.length}</span>
      </div>
      {estudiantes.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted-foreground" role="status">
          {busqueda.trim() ? 'No se encontraron estudiantes para esta búsqueda.' : ingresados ? 'Todavía no hay ingresos autorizados registrados.' : 'No hay estudiantes en esta lista.'}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-border" aria-label={titulo}>
            {visibles.map((estudiante) => (
              <li key={estudiante.id} className="flex min-w-0 flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-foreground">{estudiante.nombre}</p>
                  <p className="text-xs text-muted-foreground">SIS: {estudiante.sis}</p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ingresados ? 'bg-sci-cyan/10 text-sci-blue' : 'bg-muted text-muted-foreground'}`}>{etiqueta}</span>
                  {ingresados && <span className="text-[11px] text-muted-foreground">{estudiante.fechaIngreso} · {estudiante.horaIngreso}</span>}
                </div>
              </li>
            ))}
          </ul>
          {estudiantes.length > FILAS_INICIALES && (
            <div className="border-t border-border p-3 text-center">
              <Button type="button" variant="outline" size="sm" onClick={() => setMostrarTodo((actual) => !actual)}>
                {mostrarTodo ? 'Mostrar menos' : `Mostrar todos (${estudiantes.length})`}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

interface DatosMonitoreo {
  resumen: ResumenMonitoreo
  listas: ListasMonitoreo
}

function MonitoreoContenido({ exam }: { exam: Examen }) {
  const [datos, setDatos] = useState<DatosMonitoreo | null>(null)
  const [etapa, setEtapa] = useState<ExamenEstado>(exam.estado)
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState('')
  const [accesoDenegado, setAccesoDenegado] = useState(false)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [vistaMovil, setVistaMovil] = useState<'ingresados' | 'ausentes'>('ingresados')
  const [revisionManual, setRevisionManual] = useState(0)

  useEffect(() => {
    let cancelado = false
    let timer: number | undefined
    let turno = 0
    let ultimaVersion: DatosMonitoreo | null = null
    let denegado = false

    async function actualizar(inicial: boolean) {
      // Las consultas periódicas son exclusivamente GET; no tocan el temporizador de inactividad.
      if (cancelado || !localStorage.getItem('auth_token')) return
      if (!inicial && document.visibilityState === 'hidden') {
        timer = window.setTimeout(() => { void actualizar(false) }, ACTUALIZACION_PROVISIONAL_MS)
        return
      }

      if (!inicial) setActualizando(true)
      try {
        const resumen = await monitoreoService.resumen(exam.id)
        if (cancelado) return
        const conteosCambiaron = !ultimaVersion ||
          ultimaVersion.resumen.inscritos !== resumen.inscritos ||
          ultimaVersion.resumen.ingresados !== resumen.ingresados ||
          ultimaVersion.resumen.ausentes !== resumen.ausentes

        // Solo se consultan las dos listas si cambiaron los totales o en la primera carga.
        if (conteosCambiaron) {
          const listas = await monitoreoService.listas(exam.id)
          if (cancelado) return
          validarResumenYListas(resumen, listas)
          ultimaVersion = { resumen, listas }
          setDatos(ultimaVersion)
        }

        turno += 1
        if (turno % 4 === 0) {
          try {
            const detalle = await examenesService.get(exam.id)
            if (!cancelado) setEtapa(detalle.estado)
          } catch {
            // La próxima ronda reintentará el estado sin descartar listas válidas.
          }
        }
        if (cancelado) return
        setError('')
        setUltimaActualizacion(new Date())
      } catch (err) {
        if (cancelado) return
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          denegado = true
          setAccesoDenegado(true)
          setDatos(null)
          setError('No tienes autorización para consultar este monitoreo.')
        } else {
          setError(err instanceof Error ? err.message : 'No se pudo actualizar el monitoreo.')
        }
      } finally {
        if (!cancelado) {
          setCargando(false)
          setActualizando(false)
          // Las siguientes consultas solo se programan tras concluir la actual.
          if (!denegado) {
            timer = window.setTimeout(() => { void actualizar(false) }, ACTUALIZACION_PROVISIONAL_MS)
          }
        }
      }
    }

    const inicio = window.setTimeout(() => { void actualizar(true) }, 0)
    return () => {
      cancelado = true
      window.clearTimeout(inicio)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [exam.id, revisionManual])

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase('es')
    const filtrar = (items: EstudianteMonitoreo[]) =>
      !texto ? items : items.filter((item) => `${item.nombre} ${item.sis}`.toLocaleLowerCase('es').includes(texto))
    return {
      ingresados: filtrar(datos?.listas.ingresados ?? []),
      ausentes: filtrar(datos?.listas.ausentes ?? []),
    }
  }, [busqueda, datos])

  const totalIngresados = datos?.resumen.ingresados ?? 0
  const totalAusentes = datos?.resumen.ausentes ?? 0

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-extrabold text-sci-navy">Monitoreo de asistencia</h2>
          <p className="text-sm font-semibold text-foreground">{exam.nombre} · {exam.materia?.nombre ?? 'Asignatura'}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{exam.fecha?.slice(0, 10)}</span>
            <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{exam.hora_ini?.slice(0, 5)} a {exam.hora_fin?.slice(0, 5)}</span>
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2" disabled={cargando || actualizando || accesoDenegado} onClick={() => setRevisionManual((prev) => prev + 1)}>
          <RefreshCw className={`size-4 ${actualizando ? 'animate-spin' : ''}`} />Actualizar ahora
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">Totales oficiales del servidor · actualización automática cada 15 s (intervalo provisional).</p>

      <div className="grid grid-cols-3 gap-2 sm:gap-4" aria-label="Indicadores de asistencia">
        {[
          { nombre: 'Inscritos', valor: datos?.resumen.inscritos ?? 0, icono: <Users className="size-5" /> },
          { nombre: 'Ingresados', valor: totalIngresados, icono: <CheckCircle2 className="size-5" /> },
          { nombre: 'Ausentes', valor: totalAusentes, icono: <UserX className="size-5" /> },
        ].map((item) => (
          <div key={item.nombre} className="min-w-0 rounded-2xl border border-border bg-card p-3 shadow-xs sm:p-5">
            <div className="mb-2 text-sci-cyan" aria-hidden="true">{item.icono}</div>
            <p className="text-[11px] font-medium text-muted-foreground sm:text-sm">{item.nombre}</p>
            <p className="text-2xl font-extrabold tabular-nums text-sci-navy sm:text-3xl">{datos ? item.valor : '—'}</p>
          </div>
        ))}
      </div>

      <EtapasExamen estado={etapa} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs" aria-live="polite">
        <span className={error ? 'font-semibold text-sci-red' : 'text-muted-foreground'}>
          {cargando ? 'Cargando información…' : error ? 'Sin sincronización / datos posiblemente desactualizados' : 'Datos actualizados'}
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          {actualizando && <LoaderCircle className="size-3 animate-spin" />}
          {ultimaActualizacion ? `Última actualización: ${ultimaActualizacion.toLocaleTimeString('es-BO')}` : 'Sin actualización confirmada'}
        </span>
      </div>
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-sci-red/30 bg-sci-red/5 p-3 text-xs text-sci-red"><AlertCircle className="size-4 shrink-0" />{error}{accesoDenegado ? '' : ' Se reintentará automáticamente.'}</div>}
      {cargando && !datos && <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Consultando resumen y estudiantes del examen…</div>}

      {datos && (
        <>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">Buscar por nombre, apellido o código SIS</span>
            <Input className="pl-10" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por nombre, apellido o SIS…" />
          </label>
          {datos.resumen.inscritos === 0 && <p className="rounded-xl border border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">Este examen no tiene estudiantes asociados.</p>}
          <div className="grid grid-cols-2 gap-2 md:hidden" role="tablist" aria-label="Listas de asistencia">
            <button type="button" role="tab" aria-selected={vistaMovil === 'ingresados'} onClick={() => setVistaMovil('ingresados')} className={`rounded-xl border p-3 text-xs font-semibold ${vistaMovil === 'ingresados' ? 'border-sci-blue bg-sci-blue/10 text-sci-blue' : 'border-border bg-card'}`}>Ingresados ({totalIngresados})</button>
            <button type="button" role="tab" aria-selected={vistaMovil === 'ausentes'} onClick={() => setVistaMovil('ausentes')} className={`rounded-xl border p-3 text-xs font-semibold ${vistaMovil === 'ausentes' ? 'border-sci-blue bg-sci-blue/10 text-sci-blue' : 'border-border bg-card'}`}>Sin ingreso ({totalAusentes})</button>
          </div>
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <div className={vistaMovil === 'ingresados' ? '' : 'hidden md:block'}>
              <ListaEstudiantes titulo="Estudiantes ingresados" estudiantes={filtradas.ingresados} estado={etapa} ingresados busqueda={busqueda} />
            </div>
            <div className={vistaMovil === 'ausentes' ? '' : 'hidden md:block'}>
              <ListaEstudiantes titulo="Estudiantes sin ingreso" estudiantes={filtradas.ausentes} estado={etapa} ingresados={false} busqueda={busqueda} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function DetalleMonitoreoTab({ exam }: { exam: Examen }) {
  if (!permiteMonitoreoFrontend(exam)) {
    return <p className="rounded-xl border border-sci-red/30 bg-sci-red/5 p-5 text-sm font-semibold text-sci-red" role="alert">No tienes autorización para monitorear este examen.</p>
  }
  return <MonitoreoContenido key={exam.id} exam={exam} />
}

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, AlertTriangle, ArrowLeft, CalendarDays, Download, FileSpreadsheet, Filter, LoaderCircle, RefreshCw, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { BalanceAsistencia, TarjetasEstadisticas } from '@/components/reportes/TarjetasEstadisticas'
import { GraficoFranjas } from '@/components/reportes/GraficoFranjas'
import { examenesService, type Examen } from '@/services/examenes.service'
import { api, ApiError } from '@/services/api'
import {
  reportesService,
  type FiltrosReporte,
  type RespuestaResumenReporte,
  type RespuestaFranjasReporte,
} from '@/services/reportes.service'

const SIN_FILTROS: FiltrosReporte = { fecha_desde: '', fecha_hasta: '' }

function describirError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Acceso denegado: no tienes permisos para consultar este reporte.'
    if (error.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
    if (error.status === 422) {
      const detalles = error.errors ? Object.values(error.errors).flat().join(' ') : ''
      return detalles || error.message
    }
    return error.message
  }
  return error instanceof Error ? error.message : 'No fue posible consultar el reporte.'
}

function formatoFecha(fecha: string | null | undefined): string {
  if (!fecha) return 'Fecha sin especificar'
  const dia = fecha.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return fecha
  return new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${dia}T00:00:00Z`))
}

function claveConsulta(examenId: string, filtros: FiltrosReporte): string {
  return `${examenId}:${filtros.fecha_desde}:${filtros.fecha_hasta}`
}

interface DatosReporte {
  clave: string
  resumen: RespuestaResumenReporte
  franjas: RespuestaFranjasReporte
}

export default function ReportesEstadisticosPage() {
  const [urlParams] = useSearchParams()
  const solicitado = urlParams.get('examen') ?? ''
  const [examenes, setExamenes] = useState<Examen[]>([])
  const [examenId, setExamenId] = useState(solicitado)
  const [cargandoExamenes, setCargandoExamenes] = useState(true)
  const [errorExamenes, setErrorExamenes] = useState('')
  const [recargaExamenes, setRecargaExamenes] = useState(0)
  const [borrador, setBorrador] = useState<FiltrosReporte>(SIN_FILTROS)
  const [filtros, setFiltros] = useState<FiltrosReporte>(SIN_FILTROS)
  const [errorFiltros, setErrorFiltros] = useState('')
  const [datos, setDatos] = useState<DatosReporte | null>(null)
  const [cargandoClave, setCargandoClave] = useState('')
  const [fallo, setFallo] = useState<{ clave: string; mensaje: string } | null>(null)
  const [revision, setRevision] = useState(0)
  const [descargando, setDescargando] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState('')

  const clave = claveConsulta(examenId, filtros)
  const reporte = datos?.clave === clave ? datos : null
  const cargando = cargandoClave === clave
  const errorReporte = fallo?.clave === clave ? fallo.mensaje : ''
  const filtrosActivos = Boolean(filtros.fecha_desde || filtros.fecha_hasta)
  const filtrosSinAplicar = borrador.fecha_desde !== filtros.fecha_desde || borrador.fecha_hasta !== filtros.fecha_hasta
  const examenElegido = useMemo(() => examenes.find((examen) => String(examen.id) === examenId), [examenes, examenId])

  // El endpoint general /examenes no filtra por docente.
  // Mostrar solo los examenes asociados al usuario autenticado en el selector.
  // La autorizacion definitiva de cada reporte sigue siendo responsabilidad de Laravel.
  useEffect(() => {
    let vigente = true
    async function cargarExamenes() {
      setCargandoExamenes(true)
      setErrorExamenes('')
      try {
        const usuario = await api.get<{ id: string; rol: string }>('/me')
        if (!vigente) return
        const rol = usuario.rol?.toLowerCase()
        const esDocente = rol === 'docente'
        if (!usuario.id || (!esDocente && rol !== 'admin' && rol !== 'administrador')) {
          throw new ApiError('No tienes permiso para consultar reportes estadisticos.', 403)
        }

        const lista: Examen[] = []
        let pagina = 1
        let ultima = 1
        do {
          const respuesta = await examenesService.list({ page: pagina, perPage: 100 })
          if (!vigente) return
          const autorizados = esDocente
            ? respuesta.data.filter((examen) => String(examen.id_docente) === String(usuario.id))
            : respuesta.data
          lista.push(...autorizados)
          ultima = respuesta.last_page
          pagina += 1
        } while (pagina <= ultima)
        if (!vigente) return
        setExamenes(lista)
        setExamenId((actual) => lista.some((examen) => String(examen.id) === actual) ? actual : String(lista[0]?.id ?? ''))
      } catch (error) {
        if (vigente) {
          setExamenes([])
          setExamenId('')
          setErrorExamenes(describirError(error))
        }
      } finally {
        if (vigente) setCargandoExamenes(false)
      }
    }
    void cargarExamenes()
    return () => { vigente = false }
  }, [recargaExamenes])

  // Cancelar solicitudes anteriores evita mezclar exámenes o filtros entre consultas.
  useEffect(() => {
    if (!examenId || cargandoExamenes || !examenElegido) return
    const controlador = new AbortController()
    const consultaActual = clave
    async function cargar() {
      setCargandoClave(consultaActual)
      setFallo(null)
      try {
        const [resumen, franjas] = await Promise.all([
          reportesService.resumen(examenId, filtros, controlador.signal),
          reportesService.franjas(examenId, filtros, controlador.signal),
        ])
        if (controlador.signal.aborted) return
        if (String(resumen.examen.id) !== examenId || String(franjas.examen.id) !== examenId) {
          throw new Error('El servidor devolvió información de otro examen.')
        }
        setDatos({ clave: consultaActual, resumen, franjas })
      } catch (error) {
        if (!controlador.signal.aborted) {
          setDatos(null)
          setFallo({ clave: consultaActual, mensaje: describirError(error) })
        }
      } finally {
        if (!controlador.signal.aborted) setCargandoClave('')
      }
    }
    void cargar()
    return () => { controlador.abort() }
  }, [clave, examenId, examenElegido, filtros, revision, cargandoExamenes])

  function aplicarFiltros(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (borrador.fecha_desde && borrador.fecha_hasta && borrador.fecha_hasta < borrador.fecha_desde) {
      setErrorFiltros('La fecha final no puede ser anterior a la fecha inicial.')
      return
    }
    setErrorFiltros('')
    setFiltros({ ...borrador })
    setRevision((actual) => actual + 1)
  }

  function limpiarFiltros() {
    setBorrador(SIN_FILTROS)
    setFiltros(SIN_FILTROS)
    setErrorFiltros('')
    setRevision((actual) => actual + 1)
  }

  async function descargar() {
    if (!reporte || descargando || !examenId) return
    setDescargando(true)
    setErrorDescarga('')
    try {
      const respuesta = await reportesService.descargar(examenId, filtros)
      if (respuesta.blob.size === 0) throw new Error('El servidor devolvió un archivo vacío.')
      const nombre = respuesta.filename || `reporte_estadistico_${examenId}.xlsx`
      const enlace = document.createElement('a')
      const archivoUrl = URL.createObjectURL(respuesta.blob)
      enlace.href = archivoUrl
      enlace.download = nombre
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      window.setTimeout(() => URL.revokeObjectURL(archivoUrl), 1000)
    } catch (error) {
      setErrorDescarga(describirError(error))
    } finally {
      setDescargando(false)
    }
  }

  const resumen = reporte?.resumen.resumen
  const sinRegistros = Boolean(resumen && Object.values(resumen).every((valor) => valor === 0))


  const porcentajeAsistencia = resumen && resumen.total_inscritos > 0
    ? Math.round((resumen.total_asistentes / resumen.total_inscritos) * 100)
    : 0

  return (
    <div className="mx-auto min-w-0 max-w-7xl space-y-6 pb-10">
      <header className="relative isolate overflow-hidden rounded-[28px] bg-sci-navy px-5 pb-12 pt-6 text-white shadow-[0_18px_48px_-28px_rgba(0,55,112,0.7)] sm:px-8 sm:pb-14 sm:pt-8 lg:px-10">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border-[50px] border-white/[0.055]" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-[-100px] right-[20%] size-64 rounded-full bg-sci-cyan/20 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 max-w-2xl">
            <Link to="/examenes" className="inline-flex min-h-8 items-center gap-1.5 rounded-md text-xs font-semibold text-white/75 underline-offset-4 transition hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <ArrowLeft className="size-4" aria-hidden="true" /> Volver a exámenes
            </Link>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/90">
              <Activity className="size-3.5 text-sci-cyan" aria-hidden="true" /> SCI · Inteligencia operativa
            </div>
            <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              Reportes estadísticos
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
              Una vista clara de la asistencia, el control de accesos y la actividad por horario de cada examen.
            </p>
          </div>

          {reporte && resumen && (
            <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm sm:min-w-[218px]">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15">
                <ShieldCheck className="size-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-white/70">Asistencia registrada</span>
                <span className="block text-3xl font-extrabold tracking-tight tabular-nums">{porcentajeAsistencia}%</span>
                <span className="block text-[10px] text-white/70">
                  {resumen.total_asistentes.toLocaleString('es-BO')} de {resumen.total_inscritos.toLocaleString('es-BO')} inscritos
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="relative z-10 mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/15 pt-4 text-[11px] text-white/70">
          <span className="inline-flex items-center gap-2"><FileSpreadsheet className="size-4" aria-hidden="true" /> Datos oficiales de SCIEM</span>
          <span className="inline-flex items-center gap-2"><CalendarDays className="size-4" aria-hidden="true" /> Análisis por examen y fechas</span>
        </div>
      </header>

      <section className="relative z-10 -mt-12 mx-2 space-y-5 rounded-2xl border border-border bg-card p-4 shadow-[0_20px_55px_-32px_rgba(0,55,112,0.4)] sm:mx-4 sm:p-6 lg:mx-6" aria-label="Seleccionar examen y filtros">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="text-base font-bold text-sci-navy dark:text-foreground">Configurar reporte</h2>
            <p className="mt-1 text-xs text-muted-foreground">Selecciona un examen y acota la consulta cuando lo necesites.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sci-cyan/10 px-3 py-1 text-[11px] font-semibold text-sci-navy dark:text-foreground">
            <Filter className="size-3.5" aria-hidden="true" /> Filtros de consulta
          </span>
        </div>

        <div>
          <label htmlFor="reporte-examen" className="mb-2 block text-xs font-semibold text-foreground">Examen seleccionado</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              id="reporte-examen"
              value={examenId}
              onChange={(event) => { setExamenId(event.target.value); setErrorDescarga('') }}
              disabled={cargandoExamenes || descargando || examenes.length === 0}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sci-cyan disabled:opacity-60"
            >
              {examenes.length === 0 && <option value="">No hay exámenes disponibles</option>}
              {examenes.map((examen) => <option key={examen.id} value={examen.id}>{examen.nombre} · {examen.fecha?.slice(0, 10)}</option>)}
            </select>
            <Button type="button" variant="outline" className="min-h-11 w-full gap-2 px-4 sm:w-auto" disabled={cargandoExamenes || descargando} onClick={() => setRecargaExamenes((actual) => actual + 1)}>
              <RefreshCw className="size-4" aria-hidden="true" /> Actualizar exámenes
            </Button>
          </div>
          {cargandoExamenes && <p role="status" className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Cargando exámenes autorizados...</p>}
          {errorExamenes && <Alert variant="destructive" className="mt-3"><AlertTriangle /><AlertTitle>No fue posible cargar los exámenes</AlertTitle><AlertDescription>{errorExamenes}</AlertDescription></Alert>}
          {examenElegido && <p className="mt-2 text-xs text-muted-foreground">{examenElegido.materia?.nombre ?? 'Asignatura no especificada'} · {formatoFecha(examenElegido.fecha)}</p>}
        </div>

        <form onSubmit={aplicarFiltros} className="space-y-4 rounded-xl bg-muted/30 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="fecha-desde" className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground"><CalendarDays className="size-3.5 text-sci-cyan" aria-hidden="true" /> Fecha desde</label>
              <input id="fecha-desde" type="date" value={borrador.fecha_desde} disabled={descargando} onChange={(event) => setBorrador((valor) => ({ ...valor, fecha_desde: event.target.value }))} className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sci-cyan" />
            </div>
            <div>
              <label htmlFor="fecha-hasta" className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground"><CalendarDays className="size-3.5 text-sci-cyan" aria-hidden="true" /> Fecha hasta</label>
              <input id="fecha-hasta" type="date" value={borrador.fecha_hasta} disabled={descargando} onChange={(event) => setBorrador((valor) => ({ ...valor, fecha_hasta: event.target.value }))} className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sci-cyan" />
            </div>
          </div>
          {errorFiltros && <p className="text-xs font-semibold text-destructive" role="alert">{errorFiltros}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className="min-h-10 gap-2 px-4" disabled={!examenId || descargando}>
              <Filter className="size-4" aria-hidden="true" /> Aplicar filtros
            </Button>
            <Button type="button" variant="outline" className="min-h-10 gap-2 px-4" disabled={descargando} onClick={limpiarFiltros}>
              <RotateCcw className="size-4" aria-hidden="true" /> Limpiar
            </Button>
            {filtrosActivos && <span className="rounded-full bg-sci-cyan/10 px-3 py-1 text-[11px] font-bold text-sci-navy dark:text-foreground">Filtros activos</span>}
            {filtrosSinAplicar && <span className="text-xs text-muted-foreground">Hay cambios de fecha sin aplicar.</span>}
          </div>
        </form>
      </section>

      {!cargandoExamenes && !errorExamenes && examenes.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No tienes exámenes autorizados para consultar reportes.</p>
      )}

      {cargando && (
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin text-sci-cyan" aria-hidden="true" /> Consultando cifras y franjas del examen...
        </div>
      )}
      {errorReporte && <Alert variant="destructive"><AlertTriangle /><AlertTitle>No fue posible consultar el reporte</AlertTitle><AlertDescription>{errorReporte}</AlertDescription><Button type="button" variant="outline" size="sm" className="mt-2 w-fit" onClick={() => setRevision((actual) => actual + 1)}>Reintentar consulta</Button></Alert>}

      {!cargando && reporte && resumen && (
        <div className="space-y-5">
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm sm:px-6" aria-label="Reporte del examen">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sci-cyan/10 text-sci-blue">
                <FileSpreadsheet className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sci-cyan">Resumen oficial</p>
                <h2 className="mt-1 break-words text-base font-bold text-sci-navy dark:text-foreground">{reporte.resumen.examen.nombre}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatoFecha(reporte.resumen.examen.fecha)} · {filtrosActivos ? 'Vista filtrada' : 'Reporte general'}
                </p>
              </div>
            </div>
            <Button type="button" className="min-h-11 w-full gap-2 px-4 sm:w-auto" disabled={descargando} onClick={() => void descargar()}>
              {descargando ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
              {descargando ? 'Generando archivo...' : 'Descargar reporte (.xlsx)'}
            </Button>
          </section>

          {errorDescarga && <Alert variant="destructive"><AlertTriangle /><AlertTitle>No se pudo descargar</AlertTitle><AlertDescription>{errorDescarga}</AlertDescription></Alert>}
          {sinRegistros && <p className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">No hay registros estadísticos para el examen y las fechas seleccionadas. Los valores oficiales reportados son cero.</p>}

          <section className="space-y-4" aria-labelledby="titulo-indicadores">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-sci-cyan">
                  <Sparkles className="size-4" aria-hidden="true" /> Panorama general
                </div>
                <h2 id="titulo-indicadores" className="mt-1 text-xl font-extrabold text-sci-navy dark:text-foreground sm:text-2xl">Indicadores clave</h2>
              </div>
              <p className="text-xs text-muted-foreground">Valores oficiales del examen seleccionado</p>
            </div>
            <TarjetasEstadisticas resumen={resumen} />
          </section>

          <section aria-label="Visualización de los datos" className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(280px,1fr)]">
            <GraficoFranjas franjas={reporte.franjas.franjas} zonaHoraria={reporte.franjas.zona_horaria} />
            <BalanceAsistencia resumen={resumen} />
          </section>

          <p className="flex items-start gap-2 rounded-xl border border-border bg-card/70 p-3 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-sci-cyan" aria-hidden="true" />
            Las cifras se presentan tal como las entrega SCIEM. Las proporciones y visualizaciones se calculan únicamente a partir de esos resultados.
          </p>
        </div>
      )}
    </div>
  )
}

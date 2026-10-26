import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, ArrowLeft, Download, FileSpreadsheet, Filter, LoaderCircle, RefreshCw, RotateCcw } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TarjetasEstadisticas } from '@/components/reportes/TarjetasEstadisticas'
import { GraficoFranjas } from '@/components/reportes/GraficoFranjas'
import { examenesService, type Examen } from '@/services/examenes.service'
import { ApiError } from '@/services/api'
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

  // /mis-examenes aplica la pertenencia del docente en Laravel y ofrece todos al administrador.
  useEffect(() => {
    let vigente = true
    async function cargarExamenes() {
      setCargandoExamenes(true)
      setErrorExamenes('')
      try {
        const lista: Examen[] = []
        let pagina = 1
        let ultima = 1
        do {
          const respuesta = await examenesService.misExamenes({ page: pagina, perPage: 100 })
          if (!vigente) return
          lista.push(...respuesta.data)
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <header className="space-y-2">
        <Link to="/examenes" className="inline-flex items-center gap-1 text-xs font-semibold text-sci-blue hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver a exámenes
        </Link>
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-7 w-7 text-sci-cyan" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-extrabold text-sci-navy sm:text-3xl">Reportes estadísticos</h1>
            <p className="mt-1 text-xs text-muted-foreground">Consulta los datos oficiales de asistencia e intentos de ingreso por examen.</p>
          </div>
        </div>
      </header>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6" aria-label="Seleccionar examen y filtros">
        <div>
          <label htmlFor="reporte-examen" className="mb-1 block text-xs font-bold text-sci-navy">Examen</label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="reporte-examen"
              value={examenId}
              onChange={(event) => { setExamenId(event.target.value); setErrorDescarga('') }}
              disabled={cargandoExamenes || descargando || examenes.length === 0}
              className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            >
              {examenes.length === 0 && <option value="">No hay exámenes disponibles</option>}
              {examenes.map((examen) => <option key={examen.id} value={examen.id}>{examen.nombre} · {examen.fecha?.slice(0, 10)}</option>)}
            </select>
            <Button type="button" variant="outline" disabled={cargandoExamenes || descargando} onClick={() => setRecargaExamenes((actual) => actual + 1)}>
              <RefreshCw className="h-4 w-4" /> Actualizar exámenes
            </Button>
          </div>
          {cargandoExamenes && <p role="status" className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Cargando exámenes autorizados...</p>}
          {errorExamenes && <Alert variant="destructive" className="mt-3"><AlertTriangle /><AlertTitle>No fue posible cargar los exámenes</AlertTitle><AlertDescription>{errorExamenes}</AlertDescription></Alert>}
          {examenElegido && <p className="mt-2 text-xs text-muted-foreground">{examenElegido.materia?.nombre ?? 'Asignatura no especificada'} · {formatoFecha(examenElegido.fecha)}</p>}
        </div>

        <form onSubmit={aplicarFiltros} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="fecha-desde" className="mb-1 block text-xs font-semibold text-sci-navy">Fecha desde</label>
              <input id="fecha-desde" type="date" value={borrador.fecha_desde} disabled={descargando} onChange={(event) => setBorrador((valor) => ({ ...valor, fecha_desde: event.target.value }))} className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
            </div>
            <div>
              <label htmlFor="fecha-hasta" className="mb-1 block text-xs font-semibold text-sci-navy">Fecha hasta</label>
              <input id="fecha-hasta" type="date" value={borrador.fecha_hasta} disabled={descargando} onChange={(event) => setBorrador((valor) => ({ ...valor, fecha_hasta: event.target.value }))} className="min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
            </div>
          </div>
          {errorFiltros && <p className="text-xs font-semibold text-destructive" role="alert">{errorFiltros}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={!examenId || descargando}><Filter className="h-4 w-4" /> Aplicar filtros</Button>
            <Button type="button" variant="outline" disabled={descargando} onClick={limpiarFiltros}><RotateCcw className="h-4 w-4" /> Limpiar</Button>
            {filtrosActivos && <span className="rounded-full bg-sci-cyan/10 px-3 py-1 text-xs font-bold text-sci-navy">Filtros activos</span>}
            {filtrosSinAplicar && <span className="text-xs text-muted-foreground">Hay cambios de fecha sin aplicar.</span>}
          </div>
        </form>
      </section>

      {!cargandoExamenes && !errorExamenes && examenes.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No tienes exámenes autorizados para consultar reportes.</p>
      )}

      {cargando && <div role="status" className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" /> Consultando cifras y franjas del examen...</div>}
      {errorReporte && <Alert variant="destructive"><AlertTriangle /><AlertTitle>No fue posible consultar el reporte</AlertTitle><AlertDescription>{errorReporte}</AlertDescription><Button type="button" variant="outline" size="sm" className="mt-2 w-fit" onClick={() => setRevision((actual) => actual + 1)}>Reintentar consulta</Button></Alert>}

      {!cargando && reporte && resumen && (
        <div className="space-y-5">
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-sci-navy">{reporte.resumen.examen.nombre}</h2>
              <p className="text-xs text-muted-foreground">{formatoFecha(reporte.resumen.examen.fecha)}{filtrosActivos ? ' · Vista filtrada' : ' · Reporte general'}</p>
            </div>
            <Button type="button" disabled={descargando} onClick={() => void descargar()}>
              {descargando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {descargando ? 'Generando archivo...' : 'Descargar reporte (.xlsx)'}
            </Button>
          </section>
          {errorDescarga && <Alert variant="destructive"><AlertTriangle /><AlertTitle>No se pudo descargar</AlertTitle><AlertDescription>{errorDescarga}</AlertDescription></Alert>}
          {sinRegistros && <p className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">No hay registros estadísticos para el examen y las fechas seleccionadas. Los valores oficiales reportados son cero.</p>}
          <TarjetasEstadisticas resumen={resumen} />
          <GraficoFranjas franjas={reporte.franjas.franjas} zonaHoraria={reporte.franjas.zona_horaria} />
        </div>
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Camera,
  Clock3,
  IdCard,
  FileText,
  CalendarClock,
  ListFilter,
  PencilLine,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRoundCheck,
  UserRoundX,
  VideoOff,
} from 'lucide-react'

import { ExpulsionForm } from '@/components/examenes/ExpulsionForm'
import { EditarMotivoExpulsionForm } from '@/components/examenes/EditarMotivoExpulsionForm'
import { verificarHorarioExpulsion } from '@/components/examenes/horarioExpulsion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/services/api'
import {
  expulsionesService,
  type AsistenciaExpulsion,
  type EstudianteElegible,
  type ExpulsionHistorial,
  type ExpulsionRegistrada,
} from '@/services/expulsiones.service'
import type { Examen } from '@/services/examenes.service'

const READER_ID = 'expulsion-qr-reader'

type EstudianteParaExpulsion = Pick<
  EstudianteElegible,
  'id' | 'codigo_sis' | 'nombre_completo'
>

type SeleccionExpulsion = {
  estudiante: EstudianteParaExpulsion
  asistencia: AsistenciaExpulsion
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

const compararEspanol = new Intl.Collator('es', { sensitivity: 'base', numeric: true })

// El padrón actual solo envía nombre_completo. Este criterio por apellido
// supone apellido paterno y materno al final; no es exacto para nombres compuestos.
const claveApellido = (nombreCompleto: string) => {
  const partes = nombreCompleto.trim().split(/\s+/)
  return partes.length >= 3 ? partes.slice(-2).join(' ') : partes.at(-1) ?? ''
}

const normalizar = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()

export function DetalleExpulsionesTab({ exam }: { exam: Examen }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [ordenAlfabetico, setOrdenAlfabetico] = useState<'nombre' | 'apellido'>('nombre')
  const [desfaseServidor, setDesfaseServidor] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [motivoEliminacion, setMotivoEliminacion] = useState('')
  const [eliminacionError, setEliminacionError] = useState('')
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [filtroHistorial, setFiltroHistorial] = useState('')
  const [estadoHistorial, setEstadoHistorial] = useState('todas')
  const [instanteActual, setInstanteActual] = useState(() => Date.now())

  useEffect(() => {
    const intervalo = window.setInterval(() => setInstanteActual(Date.now()), 10_000)
    return () => window.clearInterval(intervalo)
  }, [])

  const horario = verificarHorarioExpulsion(exam, new Date(instanteActual + desfaseServidor))
  const [roster, setRoster] = useState<EstudianteElegible[]>([])
  const [asistencias, setAsistencias] = useState<AsistenciaExpulsion[]>([])
  const [contextLoading, setContextLoading] = useState(true)
  const [contextError, setContextError] = useState('')
  const [selected, setSelected] = useState<SeleccionExpulsion | null>(null)
  const [expulsiones, setExpulsiones] = useState<ExpulsionHistorial[]>([])
  const [editandoMotivo, setEditandoMotivo] = useState(false)
  const [detalleExpulsion, setDetalleExpulsion] = useState<{
    estudiante: EstudianteParaExpulsion
    registro: ExpulsionHistorial
  } | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [qrSearching, setQrSearching] = useState(false)
  const [qrError, setQrError] = useState('')

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scanLockedRef = useRef(false)
  const contextAbortRef = useRef<AbortController | null>(null)
  const contextRequestRef = useRef(0)

  // Los ingresos permitidos son los datos disponibles para identificar a quienes
  // ingresaron; no se infiere presencia física ni se registra una nueva asistencia.
  const asistenciaPorEstudiante = useMemo(() => {
    const map = new Map<string, AsistenciaExpulsion>()
    for (const asistencia of asistencias) {
      // El endpoint devuelve los ingresos más recientes primero.
      if (!map.has(asistencia.estudiante_id)) {
        map.set(asistencia.estudiante_id, asistencia)
      }
    }
    return map
  }, [asistencias])

  // GET de expulsiones devuelve registros ordenados del más nuevo al más antiguo.
  // El primero por estudiante es el que se muestra; no se crean duplicados visuales.
  const expulsionPorEstudiante = useMemo(() => {
    const map = new Map<string, ExpulsionHistorial>()
    for (const registro of expulsiones) {
      if (!registro.deleted_at && !map.has(registro.id_estudiante)) map.set(registro.id_estudiante, registro)
    }
    return map
  }, [expulsiones])

  const historialVisible = expulsiones.filter((e) => (estadoHistorial === 'todas' || (estadoHistorial === 'eliminadas') === Boolean(e.deleted_at)) && normalizar(`${e.estudiante?.nombre_completo ?? ''} ${e.estudiante?.codigo_sis ?? ''}`).includes(normalizar(filtroHistorial)))

  const visibles = useMemo(() => {
    const query = normalizar(searchQuery)
    const filtrados = !query ? roster : roster.filter((estudiante) =>
      normalizar([
        estudiante.nombre_completo,
        estudiante.codigo_sis,
        estudiante.ci ?? '',
        estudiante.email_institucional ?? '',
      ].join(' ')).includes(query),
    )

    return [...filtrados].sort((a, b) => {
      const claveA = ordenAlfabetico === 'apellido' ? [a.apellido_paterno, a.apellido_materno].filter(Boolean).join(' ') || claveApellido(a.nombre_completo) : a.nombre_completo
      const claveB = ordenAlfabetico === 'apellido' ? [b.apellido_paterno, b.apellido_materno].filter(Boolean).join(' ') || claveApellido(b.nombre_completo) : b.nombre_completo
      return compararEspanol.compare(claveA, claveB)
        || compararEspanol.compare(a.nombre_completo, b.nombre_completo)
        || compararEspanol.compare(a.codigo_sis, b.codigo_sis)
    })
  }, [roster, searchQuery, ordenAlfabetico])

  const loadContext = useCallback(async () => {
    contextAbortRef.current?.abort()
    const controller = new AbortController()
    contextAbortRef.current = controller
    const requestId = ++contextRequestRef.current
    setContextLoading(true)
    setContextError('')
    try {
      // Leemos el historial oficial: así «Ver motivo» funciona tras recargar
      // y no solo con expulsiones hechas durante esta sesión del navegador.
      const cargarHistorial = async (): Promise<ExpulsionHistorial[]> => {
        const primera = await expulsionesService.listarExpulsiones(exam.id, 1, controller.signal)
        const todos = [...primera.expulsiones]
        for (let pagina = 2; pagina <= primera.last_page; pagina += 1) {
          const resultado = await expulsionesService.listarExpulsiones(exam.id, pagina, controller.signal)
          todos.push(...resultado.expulsiones)
        }
        return [...new Map(todos.map((e) => [e.id, e])).values()]
      }

      const [rosterResponse, historial] = await Promise.all([
        expulsionesService.identificar(exam.id, undefined, controller.signal),
        cargarHistorial(),
      ])
      if (requestId !== contextRequestRef.current) return
      setDesfaseServidor(new Date(rosterResponse.hora_servidor).getTime() - Date.now())
      setRoster(rosterResponse.estudiantes)
      setAsistencias(rosterResponse.estudiantes.filter((e) => e.fecha_ingreso).map((e) => ({
        id: e.id, estudiante_id: e.id, nombre_completo: e.nombre_completo, codigo_sis: e.codigo_sis,
        ci: e.ci, fecha_ingreso: e.fecha_ingreso!, hora_ingreso: '', metodo: 'QR' as const,
      })))
      setExpulsiones(historial)
    } catch (error) {
      if (requestId !== contextRequestRef.current) return
      setContextError(getErrorMessage(
        error,
        'No se pudo verificar el padrón, los ingresos y el historial de expulsiones de este examen.',
      ))
    } finally {
      if (requestId === contextRequestRef.current) setContextLoading(false)
    }
  }, [exam.id])

  useEffect(() => {
    // Posponer la carga evita actualizar estado sincrónicamente desde el efecto.
    // El temporizador se cancela si el componente se desmonta antes de ejecutarse.
    const timerId = window.setTimeout(() => {
      void loadContext()
    }, 0)
    return () => { window.clearTimeout(timerId); contextRequestRef.current += 1; contextAbortRef.current?.abort() }
  }, [loadContext])

  const seleccionar = useCallback((estudiante: EstudianteParaExpulsion) => {
    const inscrito = roster.some((item) => item.id === estudiante.id)
    const asistencia = asistenciaPorEstudiante.get(estudiante.id)

    if (contextLoading || contextError || !inscrito || !asistencia) return false
    if (!verificarHorarioExpulsion(exam, new Date(Date.now() + desfaseServidor)).permitido) return false
    if (expulsionPorEstudiante.has(estudiante.id)) return false

    setSelected({ estudiante, asistencia })
    return true
  }, [roster, asistenciaPorEstudiante, contextLoading, contextError, expulsionPorEstudiante, exam, desfaseServidor])

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    scannerRef.current = null
    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop()
        await scanner.clear()
      } catch {
        // El navegador puede liberar la cámara antes de completar el cierre.
      }
    }
    scanLockedRef.current = false
    setCameraActive(false)
  }, [])

  const buscarQr = useCallback(async (decodedText: string) => {
    if (scanLockedRef.current) return
    scanLockedRef.current = true
    setQrSearching(true)
    setQrError('')

    try {
      const resultado = await expulsionesService.identificar(exam.id, decodedText)
      const exacto = resultado.estudiantes[0]
      if (!exacto) {
        setQrError('El QR no corresponde a un estudiante inscrito en este examen.')
        return
      }
      setDesfaseServidor(new Date(resultado.hora_servidor).getTime() - Date.now())
      // Volver a consultar el registro oficial: un compañero pudo expulsar al
      // estudiante después de que cargamos el listado inicialmente.
      const registroExistente = await expulsionesService.buscarExpulsionEstudiante(exam.id, exacto.id)
      if (registroExistente) {
        setExpulsiones((actual) => [
          registroExistente,
          ...actual.filter((item) => item.id !== registroExistente.id),
        ])
        // Es exactamente el mismo modal de «Ver motivo», sin permitir un segundo POST.
        setDetalleExpulsion({ estudiante: exacto, registro: registroExistente })
        return
      }

      if (exacto.elegible && exacto.fecha_ingreso) {
        setSelected({ estudiante: exacto, asistencia: { id: exacto.id, estudiante_id: exacto.id, nombre_completo: exacto.nombre_completo, codigo_sis: exacto.codigo_sis, ci: exacto.ci, fecha_ingreso: exacto.fecha_ingreso, hora_ingreso: '', metodo: 'QR' } })
      } else {
        setQrError(!verificarHorarioExpulsion(exam, new Date(Date.now() + desfaseServidor)).permitido
          ? 'Fuera del horario del examen solo se permite consultar expulsiones anteriores.'
          : 'El estudiante todavía no tiene un ingreso autorizado verificado en este examen.')
      }
    } catch (error) {
      setQrError(error instanceof SyntaxError
        ? 'El contenido del QR no tiene el formato esperado.'
        : getErrorMessage(error, 'No se pudo identificar al estudiante mediante QR.'))
    } finally {
      setQrSearching(false)
      await stopScanner()
    }
  }, [stopScanner, exam, desfaseServidor])

  const startScanner = useCallback(async () => {
    setCameraError('')
    setQrError('')
    await stopScanner()

    try {
      const scanner = new Html5Qrcode(READER_ID)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: (width, height) => {
            const edge = Math.floor(Math.min(width, height) * 0.68)
            return { width: edge, height: edge }
          },
          aspectRatio: 1,
        },
        (decodedText) => void buscarQr(decodedText),
        () => {},
      )
      setCameraActive(true)
    } catch (error) {
      scannerRef.current = null
      setCameraActive(false)
      setCameraError(getErrorMessage(error, 'No se pudo acceder a la cámara. Revisa sus permisos.'))
    }
  }, [buscarQr, stopScanner])

  useEffect(() => () => { void stopScanner() }, [stopScanner])

  const abrirManualmente = async (estudiante: EstudianteParaExpulsion) => {
    // La selección manual también debe liberar la cámara antes de abrir el modal.
    if (cameraActive) await stopScanner()
    seleccionar(estudiante)
  }

  const registrarLocalmente = (registro: ExpulsionRegistrada) => {
    setExpulsiones((actual) => [
      {
        ...registro,
        estudiante: null,
      },
      ...actual.filter((item) => item.id !== registro.id),
    ])
  }

  const formatFecha = (value: string) => {
    const fecha = new Date(value)
    if (Number.isNaN(fecha.getTime())) return value
    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/La_Paz',
    }).format(fecha)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="min-w-0 space-y-6 xl:col-span-8">
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
                Registro de expulsiones
              </span>
              <h2 className="mt-1 text-lg font-extrabold text-sci-navy">
                Estudiantes con ingreso registrado
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Lista de estudiantes inscritos que registraron un ingreso autorizado a este examen.
                El buscador sirve para filtrar la lista, sin necesidad de escribir para verla.
              </p>
            </div>

            <div role="status" className={`rounded-xl border px-3 py-2.5 text-xs ${horario.permitido
              ? 'border-emerald-600/25 bg-emerald-600/5 text-emerald-800'
              : 'border-sci-amber/30 bg-sci-amber/10 text-sci-navy'}`}>
              <p className="flex items-start gap-2">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {horario.mensaje}
              </p>
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Filtrar por nombre, apellido, SIS o CI..."
                className="h-10 bg-background pl-9 text-xs"
                aria-label="Filtrar estudiantes con ingreso autorizado"
                autoComplete="off"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <p className="text-[11px] text-muted-foreground" aria-live="polite">
                  {contextLoading ? 'Consultando ingresos...' : `${visibles.length} de ${roster.length} estudiantes inscritos`}
                </p>
                <div className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <label htmlFor="orden-estudiantes" className="text-xs text-muted-foreground">Ordenar por</label>
                  <Select value={ordenAlfabetico} onValueChange={(valor) => setOrdenAlfabetico(valor as 'nombre' | 'apellido')}>
                    <SelectTrigger id="orden-estudiantes" size="sm" className="min-w-[125px] bg-background text-xs" aria-label="Ordenar estudiantes alfabéticamente">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nombre">Nombre (A–Z)</SelectItem>
                      <SelectItem value="apellido">Apellido (A–Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadContext()}
                disabled={contextLoading || cameraActive || qrSearching}
                className="cursor-pointer gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${contextLoading ? 'animate-spin' : ''}`} />
                Actualizar lista
              </Button>
            </div>

            {contextError && (
              <div role="alert" className="rounded-xl border border-sci-amber/30 bg-sci-amber/10 p-3 text-xs">
                <p className="flex items-center gap-2 font-bold"><ShieldAlert className="h-4 w-4" /> No se pudo verificar el listado.</p>
                <p className="mt-1 text-muted-foreground">{contextError}</p>
              </div>
            )}

            {contextLoading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed p-8 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando estudiantes e ingresos...
              </div>
            ) : !contextError && visibles.length > 0 ? (
              <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1" aria-label="Estudiantes con ingreso registrado">
                {visibles.map((estudiante) => {
                  const asistencia = asistenciaPorEstudiante.get(estudiante.id)
                  const expulsionRegistrada = expulsionPorEstudiante.get(estudiante.id)
                  const registrado = Boolean(expulsionRegistrada)

                  return (
                    <div key={estudiante.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-words text-sm font-extrabold text-sci-navy">
                              {estudiante.nombre_completo}
                            </p>
                            <Badge variant="outline" className={registrado
                              ? 'border-sci-amber/30 bg-sci-amber/10 text-sci-amber'
                              : 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700'}>
                              {registrado ? 'Expulsión registrada' : asistencia ? 'Ingreso verificado' : 'Sin ingreso previo'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                            <span className="font-mono">SIS: {estudiante.codigo_sis}</span>
                            <span className="flex items-center gap-1">
                              <IdCard className="h-3.5 w-3.5 text-sci-cyan" />
                              CI: {estudiante.ci || 'No registrado'}{estudiante.ci_extension ? ` ${estudiante.ci_extension}` : ''}
                            </span>
                            <span className="break-all">{estudiante.email_institucional}</span>
                          </div>
                          <p className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <Clock3 className="h-3.5 w-3.5" />
                            {asistencia ? `Ingreso: ${asistencia.fecha_ingreso}` : 'No elegible para expulsión: requiere ingreso autorizado.'}
                          </p>
                        </div>
                        {expulsionRegistrada ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDetalleExpulsion({ estudiante, registro: expulsionRegistrada })}
                            className="w-full cursor-pointer gap-2 border-sci-amber/50 text-xs font-bold text-sci-navy hover:bg-sci-amber/10 sm:w-auto"
                            aria-label={`Ver motivo de expulsión de ${estudiante.nombre_completo}`}
                          >
                            <FileText className="h-4 w-4 text-sci-amber" aria-hidden="true" />
                            Ver motivo
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => void abrirManualmente(estudiante)}
                            disabled={!asistencia || !horario.permitido || contextLoading || Boolean(contextError)}
                            title={!horario.permitido ? horario.mensaje : undefined}
                            className="w-full cursor-pointer bg-sci-blue text-xs font-bold text-white hover:opacity-90 sm:w-auto"
                          >
                            <UserRoundCheck className="h-4 w-4" />
                            Registrar expulsión
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : !contextError && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
                <UserRoundX className="mx-auto h-8 w-8 text-muted-foreground/70" />
                <p className="mt-3 text-xs font-bold text-foreground">
                  {searchQuery.trim() ? 'No hay coincidencias' : 'Todavía no hay ingresos registrados'}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {searchQuery.trim()
                    ? 'Prueba con otro nombre, apellido, código SIS o CI.'
                    : 'Cuando se registren ingresos autorizados, aparecerán aquí. Puedes actualizar la lista.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 space-y-6 xl:col-span-4">
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="space-y-4 p-5">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-sci-navy">
                <QrCode className="h-4 w-4 text-sci-cyan" /> Identificación por QR
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Al identificar un estudiante con ingreso autorizado se abrirá directamente
                el formulario de expulsión. Si ya fue expulsado, se mostrará su motivo.
                Escanear no registra otro ingreso ni una expulsión.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border-2 border-border bg-black">
              <div
                id={READER_ID}
                className="aspect-square w-full overflow-hidden [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
              />
              {!cameraActive && !qrSearching && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card p-6 text-center">
                  <Camera className="h-9 w-9 text-sci-cyan" />
                  <p className="mt-3 text-xs font-bold text-foreground">Lector QR en espera</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Activa la cámara para identificar la credencial.
                  </p>
                </div>
              )}
              {cameraActive && !qrSearching && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-44 w-44 rounded-2xl border-2 border-sci-cyan/80 shadow-[0_0_18px_rgba(22,143,189,0.35)]">
                    <div className="h-0.5 w-full animate-pulse bg-sci-cyan" />
                  </div>
                </div>
              )}
              {qrSearching && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-sci-navy/85 text-white">
                  <Loader2 className="h-8 w-8 animate-spin text-sci-cyan" />
                  <p className="mt-3 text-xs font-bold">Identificando estudiante...</p>
                </div>
              )}
            </div>

            {(cameraError || qrError) && (
              <div role="alert" className="rounded-xl border border-sci-red/20 bg-sci-red/10 p-3 text-[11px] font-semibold text-sci-red">
                {cameraError || qrError}
              </div>
            )}

            <Button
              type="button"
              variant={cameraActive ? 'outline' : 'default'}
              onClick={() => cameraActive ? void stopScanner() : void startScanner()}
              disabled={qrSearching || contextLoading || Boolean(contextError) || Boolean(selected) || Boolean(detalleExpulsion)}
              className={cameraActive
                ? 'w-full cursor-pointer text-xs text-sci-red hover:text-sci-red'
                : 'w-full cursor-pointer bg-sci-blue text-xs font-bold text-white hover:opacity-90'}
            >
              {cameraActive ? (
                <><VideoOff className="h-4 w-4" /> Detener cámara</>
              ) : (
                <><Camera className="h-4 w-4" /> {horario.permitido ? 'Escanear código QR' : 'Consultar motivo por QR'}</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="min-w-0 space-y-3 rounded-2xl border border-border p-4 xl:col-span-12" aria-label="Historial completo de expulsiones">
        <h3 className="font-bold text-sci-navy">Historial de expulsiones · {exam.nombre}</h3>
        <div className="flex flex-wrap gap-2">
          <Input aria-label="Filtrar historial por estudiante o SIS" placeholder="Nombre o SIS" value={filtroHistorial} onChange={(e) => setFiltroHistorial(e.target.value)} />
          <select aria-label="Estado de expulsión" value={estadoHistorial} onChange={(e) => setEstadoHistorial(e.target.value)} className="rounded border p-2">
            <option value="todas">Todas</option><option value="vigentes">Vigentes</option><option value="eliminadas">Eliminadas</option>
          </select>
        </div>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {historialVisible.map((e) => (
            <button key={e.id} className="block w-full rounded-xl border p-3 text-left text-sm hover:bg-muted" onClick={() => { setEditandoMotivo(false); setConfirmarEliminar(false); setDetalleExpulsion({ registro: e, estudiante: { id: e.id_estudiante, codigo_sis: e.estudiante?.codigo_sis ?? '', nombre_completo: e.estudiante?.nombre_completo ?? 'Estudiante' } }) }}>
              <strong>{e.estudiante?.nombre_completo ?? 'Estudiante'}</strong> · {e.estudiante?.codigo_sis} · {e.deleted_at ? 'Eliminada' : 'Vigente'}
              <p className="text-xs text-muted-foreground">{formatFecha(e.fecha_hora)} · {e.responsable?.nombre ?? 'Responsable no disponible'}</p>
              <p className="break-words">{e.motivo}</p>
            </button>
          ))}
          {historialVisible.length === 0 && <p className="text-sm text-muted-foreground">{expulsiones.length === 0 ? 'Sin expulsiones registradas.' : 'Sin coincidencias con los filtros actuales.'}</p>}
        </div>
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open && !guardando) setSelected(null) }}>
        <DialogContent
          className="max-h-[90dvh] w-full overflow-y-auto sm:max-w-lg"
          aria-describedby="expulsion-dialog-description"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center gap-2 text-sci-navy">
              <UserRoundX className="h-5 w-5 text-sci-red" /> Registro de expulsión
            </DialogTitle>
            <DialogDescription id="expulsion-dialog-description" className="text-xs">
              Estudiante: <strong>{selected?.estudiante.nombre_completo}</strong> · SIS: {selected?.estudiante.codigo_sis}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <ExpulsionForm
              key={selected.estudiante.id}
              exam={exam}
              estudiante={selected.estudiante}
              asistencia={selected.asistencia}
              horarioPermitido={horario.permitido}
              desfaseServidor={desfaseServidor}
              onSubmittingChange={setGuardando}
              onRegistered={registrarLocalmente}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Consulta de solo lectura de una expulsión ya registrada. */}
      <Dialog
        open={Boolean(detalleExpulsion)}
        onOpenChange={(open) => { if (!open && !eliminando && !guardando) { setDetalleExpulsion(null); setEditandoMotivo(false); setConfirmarEliminar(false); setMotivoEliminacion(''); setEliminacionError('') } }}
      >
        <DialogContent className="max-h-[90dvh] w-full overflow-y-auto sm:max-w-lg">
          <DialogHeader className="pr-8">
            <DialogTitle className="flex items-center gap-2 text-sci-navy">
              <FileText className="h-5 w-5 text-sci-amber" aria-hidden="true" />
              {editandoMotivo ? 'Editar motivo de expulsión' : 'Motivo de expulsión'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registro de expulsión del examen {exam.nombre}.
            </DialogDescription>
          </DialogHeader>
          {detalleExpulsion && (editandoMotivo ? (
            <EditarMotivoExpulsionForm
              key={detalleExpulsion.registro.id}
              exam={exam}
              registro={detalleExpulsion.registro}
              horarioPermitido={horario.permitido}
              desfaseServidor={desfaseServidor}
              onSubmittingChange={setGuardando}
              onCancel={() => setEditandoMotivo(false)}
              onSaved={(nuevoRegistro) => {
                setExpulsiones((actual) => actual.map((item) =>
                  item.id === nuevoRegistro.id ? nuevoRegistro : item,
                ))
                setDetalleExpulsion((actual) => actual ? { ...actual, registro: nuevoRegistro } : null)
                setEditandoMotivo(false)
              }}
            />
          ) : (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="font-bold text-sci-navy">{detalleExpulsion.estudiante.nombre_completo}</p>
                <p className="mt-1 text-muted-foreground">
                  SIS: {detalleExpulsion.estudiante.codigo_sis}
                </p>
              </div>
              <div className="rounded-xl border border-sci-amber/30 bg-sci-amber/5 p-4">
                <p className="font-semibold text-muted-foreground">Motivo vigente</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                  {detalleExpulsion.registro.motivo}
                </p>
              </div>
              {detalleExpulsion.registro.motivo_original &&
               detalleExpulsion.registro.motivo_original !== detalleExpulsion.registro.motivo && (
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="font-semibold text-muted-foreground">Motivo original (conservado)</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {detalleExpulsion.registro.motivo_original}
                  </p>
                </div>
              )}
              <div className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                <div>
                  <p className="flex items-center gap-1 font-semibold text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" /> Fecha y hora de expulsión
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {formatFecha(detalleExpulsion.registro.fecha_hora)}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Expulsión registrada por</p>
                  <p className="mt-1 font-medium text-foreground">
                    {detalleExpulsion.registro.responsable?.nombre || 'No disponible'}
                  </p>
                  {detalleExpulsion.registro.responsable?.rol && (
                    <p className="mt-0.5 uppercase text-muted-foreground">
                      {detalleExpulsion.registro.responsable.rol}
                    </p>
                  )}
                </div>
              </div>
              {detalleExpulsion.registro.ultima_edicion && (
                <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
                  <div>
                    <p className="font-semibold text-muted-foreground">Última edición</p>
                    <p className="mt-1 font-medium">{formatFecha(detalleExpulsion.registro.ultima_edicion.fecha_hora)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">Editado por</p>
                    <p className="mt-1 font-medium">
                      {detalleExpulsion.registro.ultima_edicion.responsable?.nombre || 'No disponible'}
                    </p>
                  </div>
                </div>
              )}
              {detalleExpulsion.registro.ediciones && detalleExpulsion.registro.ediciones.length > 0 && (
                <details className="rounded-xl border border-border p-3">
                  <summary className="cursor-pointer font-bold text-sci-navy">Historial de ediciones</summary>
                  <ol className="mt-3 space-y-3">
                    {detalleExpulsion.registro.ediciones.map((edicion, indice) => (
                      <li key={`${edicion.fecha_hora}-${indice}`} className="border-t border-border pt-2">
                        <p className="font-semibold">{formatFecha(edicion.fecha_hora)} · {edicion.responsable?.nombre ?? 'No disponible'}</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">Anterior: {edicion.motivo_anterior}</p>
                        <p className="mt-1 whitespace-pre-wrap break-words">Nuevo: {edicion.motivo_nuevo}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              {detalleExpulsion.registro.deleted_at && <p role="status" className="rounded border p-3">Eliminada el {formatFecha(detalleExpulsion.registro.deleted_at)}. Motivo: {detalleExpulsion.registro.motivo_eliminacion}</p>}
              {confirmarEliminar && <form className="space-y-2 rounded border border-destructive p-3" onSubmit={async (event) => {
                event.preventDefault()
                if (eliminando) return
                setEliminando(true); setEliminacionError('')
                try {
                  const respuesta = await expulsionesService.eliminar(exam.id, detalleExpulsion.registro.id, motivoEliminacion)
                  setDetalleExpulsion({ ...detalleExpulsion, registro: respuesta.expulsion })
                  setConfirmarEliminar(false); setMotivoEliminacion(''); await loadContext()
                } catch (error) { setEliminacionError(getErrorMessage(error, 'No se pudo eliminar la expulsión.')) }
                finally { setEliminando(false) }
              }}>
                <p>Se retirará la expulsión vigente y se conservarán el registro y su auditoría. El ingreso previo seguirá registrado.</p>
                <label htmlFor="motivo-eliminacion">Motivo de eliminación</label>
                <Input id="motivo-eliminacion" required minLength={3} maxLength={2000} value={motivoEliminacion} onChange={(e) => setMotivoEliminacion(e.target.value)} disabled={eliminando} />
                {eliminacionError && <p role="alert">{eliminacionError}</p>}
                <Button type="button" variant="outline" disabled={eliminando} onClick={() => setConfirmarEliminar(false)}>Cancelar</Button>
                <Button type="submit" variant="destructive" disabled={eliminando || motivoEliminacion.trim().length < 3}>{eliminando ? 'Eliminando…' : 'Confirmar eliminación'}</Button>
              </form>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setDetalleExpulsion(null)}>
                  Cerrar
                </Button>
                <Button
                  type="button"
                  onClick={() => setEditandoMotivo(true)}
                  disabled={!horario.permitido || Boolean(detalleExpulsion.registro.deleted_at)}
                  title={!horario.permitido ? horario.mensaje : undefined}
                >
                  <PencilLine className="h-4 w-4" aria-hidden="true" /> Editar motivo
                </Button>
                <Button type="button" variant="destructive" disabled={!horario.permitido || Boolean(detalleExpulsion.registro.deleted_at) || eliminando} onClick={() => { setConfirmarEliminar(true); setEliminacionError('') }}>Eliminar</Button>
              </div>
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  )
}

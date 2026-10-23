import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Camera,
  Clock,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  VideoOff,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  ResultadoValidacionDialog,
  type ResultadoValidacionAcceso,
} from '@/components/examenes/ResultadoValidacionDialog'
import { api, ApiError } from '@/services/api'
import {
  estudiantesService,
  type EstudianteInscritoExamen,
} from '@/services/estudiantes.service'
import type { Examen } from '@/services/examenes.service'

import { ControlesOffline } from '@/components/ControlesOffline'
import { procesarIngresoEscaneado } from '@/services/verificacionScannerService'

const READER_ID = 'qr-camera-stream-unique'

interface AsistenciaItem {
  id: string
  estudiante_id: string
  nombre_completo: string
  codigo_sis: string
  ci: string | null
  hora_ingreso: string
  fecha_ingreso: string
  metodo: 'QR' | 'MANUAL'
}

interface VerificationResponse {
  success?: boolean
  message: string
  resultado: string
  estudiante?: {
    id?: string
    nombre?: string
    nombre_completo?: string
    sis?: string
    codigo_sis?: string
    ci?: string | null
    foto_url?: string | null
  }
  detalles?: {
    materia?: string
    aula?: string
    hora_ingreso?: string
    motivo_inhabilitacion?: string
    primer_ingreso?: string
  }
}

interface VerificationErrorPayload {
  message?: string
  resultado?: string
  detalles?: {
    motivo_inhabilitacion?: string
    primer_ingreso?: string
  }
}

const mapVerificationError = (error: unknown): ResultadoValidacionAcceso => {
  if (!(error instanceof ApiError)) {
    return {
      estado: 'rechazado',
      codigo: 'ERROR_VALIDACION',
      motivo: error instanceof Error ? error.message : 'Ocurrió un error inesperado al validar el ingreso.',
    }
  }

  const payload =
    error.data && typeof error.data === 'object'
      ? (error.data as VerificationErrorPayload)
      : undefined

  switch (payload?.resultado) {
    case 'RECHAZADO_YA_INGRESO':
      return {
        estado: 'rechazado',
        codigo: 'YA_INGRESO',
        motivo: payload.message ?? error.message,
        primerIngreso: payload.detalles?.primer_ingreso,
      }
    case 'RECHAZADO_INHABILITADO':
      return {
        estado: 'rechazado',
        codigo: 'INHABILITADO',
        motivo: payload.detalles?.motivo_inhabilitacion ?? payload.message ?? error.message,
      }
    case 'RECHAZADO_NO_INSCRITO':
      return {
        estado: 'rechazado',
        codigo: 'NO_INSCRITO',
        motivo: payload.message ?? error.message,
      }
    case 'RECHAZADO_EXAMEN_DISTINTO':
    case 'RECHAZADO_MATERIA_INCORRECTA':
      return {
        estado: 'rechazado',
        codigo: 'MATERIA_INCORRECTA',
        motivo: payload.message ?? error.message,
      }
    case 'RECHAZADO_QR_EXPIRADO':
    case 'HORARIO_EXPIRADO':
      return {
        estado: 'rechazado',
        codigo: 'QR_INVALIDO',
        motivo: payload.message ?? 'El código QR ha expirado. El horario concluyó.',
      }
    case 'EXAMEN_NO_ENCONTRADO':
      return {
        estado: 'rechazado',
        codigo: 'EXAMEN_NO_ENCONTRADO',
        motivo: payload.message ?? error.message,
      }
    case 'ERROR_DATOS_INVALIDOS':
    case 'FIRMA_INVALIDA':
      return {
        estado: 'rechazado',
        codigo: 'QR_INVALIDO',
        motivo: payload.message ?? error.message,
      }
    default:
      if (error.status === 409) {
        return {
          estado: 'rechazado',
          codigo: 'YA_INGRESO',
          motivo: payload?.message ?? error.message,
          primerIngreso: payload?.detalles?.primer_ingreso,
        }
      }

      return {
        estado: 'rechazado',
        codigo: 'ERROR_VALIDACION',
        motivo: payload?.message ?? error.message,
      }
  }
}

export function DetalleEscanerTab({ exam }: { exam: Examen }) {
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [validationResult, setValidationResult] =
    useState<ResultadoValidacionAcceso | null>(null)

  // Asistencias en tiempo real
  const [asistencias, setAsistencias] = useState<AsistenciaItem[]>([])
  const [loadingAsistencias, setLoadingAsistencias] = useState(false)

  // Roster y búsqueda para ingreso manual
  const [roster, setRoster] = useState<EstudianteInscritoExamen[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

  const isPausedRef = useRef(false)
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null)

  const token = localStorage.getItem('auth_token') ?? localStorage.getItem('token') ?? ''

  // Cargar estudiantes que ya ingresaron
  const loadAsistencias = useCallback(async () => {
    setLoadingAsistencias(true)
    try {
      const res = await api.get<{ total_ingresados: number; asistencias: AsistenciaItem[] }>(
        `/examenes/${exam.id}/asistencias`
      )
      setAsistencias(res.asistencias || [])
    } catch {
      // Ignorar fallo silencioso si está offline
    } finally {
      setLoadingAsistencias(false)
    }
  }, [exam.id])

  // Cargar padrón del examen para la búsqueda de ingreso manual
  const loadRoster = useCallback(async () => {
    try {
      const res = await estudiantesService.listByExam(exam.id)
      setRoster(res.estudiantes || [])
    } catch {
      // Ignorar fallo silencioso si está offline
    }
  }, [exam.id])

  useEffect(() => {
    void loadAsistencias()
    void loadRoster()
  }, [loadAsistencias, loadRoster])

  const stopScanner = useCallback(async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop()
        }
        await scannerInstanceRef.current.clear()
      } catch (err) {
        console.warn('Error al liberar cámara:', err)
      } finally {
        scannerInstanceRef.current = null
      }
    }
    setCameraActive(false)
  }, [])

  // Proceso de escaneo con soporte híbrido Online/Offline
  const handleScan = useCallback(
  async (decodedText: string) => {
    if (isPausedRef.current) return

    isPausedRef.current = true
    setValidationResult(null)
    setIsValidating(true)

    try {
      // 1. Intentar validar directamente contra la API de Laravel
      const res = await api.post<VerificationResponse>(
        `/examenes/${exam.id}/verificar-ingreso`,
        { qr_data: decodedText }
      )

      // Si fue exitoso (200 OK)
      setValidationResult({
        estado: 'autorizado',
        estudiante: {
          nombreCompleto: res.estudiante?.nombre_completo || res.estudiante?.nombre,
          codigoSis: res.estudiante?.codigo_sis || res.estudiante?.sis,
        },
        horaIngreso: res.detalles?.hora_ingreso || new Date().toLocaleTimeString(),
      })
      void loadAsistencias()
      setShowModal(true)
    } catch (error: any) {
      // 2. Solo cortamos si el servidor SÍ respondió con un código HTTP real (400, 403, 409)
      const tieneRespuestaDelServidor = Boolean(error?.status && error.status >= 400)

      if (tieneRespuestaDelServidor && error instanceof ApiError) {
        setValidationResult(mapVerificationError(error))
        setShowModal(true)
        return
      }

      // 3. Respaldo Offline: Si no hubo respuesta del servidor (sin Wi-Fi / red caída)
      console.warn('Sin conexión al servidor. Procesando escaneo en modo offline...')

      try {
        const resOffline = await procesarIngresoEscaneado(decodedText, exam.id, token)

        if (resOffline.success) {
          setValidationResult({
            estado: 'autorizado',
            estudiante: {
              nombreCompleto: resOffline.estudiante?.nombre_completo,
              codigoSis: resOffline.estudiante?.codigo_sis,
            },
            horaIngreso: resOffline.detalles?.hora_ingreso || new Date().toLocaleTimeString(),
          })
          void loadAsistencias()
        } else {
          const esDuplicado =
            resOffline.mensaje?.toLowerCase().includes('ya ingresó') ||
            resOffline.mensaje?.toLowerCase().includes('duplicado') ||
            resOffline.detalles?.resultado === 'RECHAZADO_YA_INGRESO'

          const esInhabilitado =
            resOffline.mensaje?.toLowerCase().includes('inhabilitado') ||
            resOffline.mensaje?.toLowerCase().includes('sin cumplir') ||
            resOffline.detalles?.resultado === 'RECHAZADO_INHABILITADO'

          setValidationResult({
            estado: 'rechazado',
            codigo: esDuplicado
              ? 'YA_INGRESO'
              : esInhabilitado
                ? 'INHABILITADO'
                : 'ERROR_VALIDACION',
            motivo: resOffline.mensaje,
            primerIngreso: resOffline.detalles?.primer_ingreso,
          })
        }
      } catch (offlineErr) {
        setValidationResult(mapVerificationError(offlineErr))
      }

      setShowModal(true)
    } finally {
      setIsValidating(false)
    }
  },
  [exam.id, token, loadAsistencias]
)

  // Ingreso Manual Asistido sin QR
  const handleIngresoManual = async (student: EstudianteInscritoExamen) => {
    setManualLoading(true)
    setValidationResult({ estado: 'pendiente' })
    setShowModal(true)

    try {
      const response = await api.post<VerificationResponse>(
        `/examenes/${exam.id}/registro-manual`,
        { id_estudiante: student.id, motivo: 'Autorizado manualmente desde panel' }
      )

      setValidationResult({
        estado: 'autorizado',
        estudiante: {
          nombreCompleto: student.nombre_completo,
          codigoSis: student.codigo_sis,
        },
        horaIngreso: response.detalles?.hora_ingreso,
      })
      setSearchQuery('')
      void loadAsistencias()
    } catch (error) {
      setValidationResult(mapVerificationError(error))
    } finally {
      setManualLoading(false)
    }
  }

  const startScanner = useCallback(async () => {
    setCameraError(null)
    setIsValidating(false)
    isPausedRef.current = false

    await stopScanner()

    const container = document.getElementById(READER_ID)
    if (!container) return

    try {
      const scanner = new Html5Qrcode(READER_ID)
      scannerInstanceRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
            const edgeSize = Math.floor(minEdge * 0.7)
            return { width: edgeSize, height: edgeSize }
          },
          aspectRatio: 1,
        },
        (decodedText) => void handleScan(decodedText),
        () => {}
      )

      setCameraActive(true)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo acceder a la cámara. Revisa los permisos del navegador.'
      setCameraError(message)
      setCameraActive(false)
    }
  }, [handleScan, stopScanner])

  useEffect(() => {
    let mounted = true
    const timeout = setTimeout(() => {
      if (mounted) void startScanner()
    }, 150)

    return () => {
      mounted = false
      clearTimeout(timeout)
      void stopScanner()
    }
  }, [startScanner, stopScanner])

  const handleCloseModal = () => {
    setShowModal(false)
    setValidationResult(null)

    setTimeout(() => {
      isPausedRef.current = false
    }, 300)
  }

  // Filtrar candidatos para ingreso manual (excluyendo los que ya ingresaron)
  const filteredCandidates = searchQuery.trim()
    ? roster.filter((st) => {
        const query = searchQuery.toLowerCase()
        const matchText = `${st.nombre_completo} ${st.codigo_sis} ${st.ci}`.toLowerCase()
        const yaIngreso = asistencias.some((a) => a.estudiante_id === st.id)
        return matchText.includes(query) && !yaIngreso
      })
    : []

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Columna Izquierda: Cámara y Búsqueda Manual (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Lector de Cámara */}
          <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6">
              <div className="mb-4 w-full max-w-sm text-left">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
                  Control de ingreso
                </span>
                <h2 className="mt-1 flex items-center gap-2 text-lg font-extrabold text-foreground">
                  <QrCode className="h-5 w-5 text-sci-cyan" aria-hidden="true" />
                  Escáner de credenciales
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Centre el código QR del estudiante dentro del recuadro para validar su ingreso.
                </p>
              </div>

              <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border-2 border-border bg-black shadow-inner">
                <div
                  id={READER_ID}
                  className="aspect-square w-full overflow-hidden [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
                />

                {cameraActive && !showModal && !isValidating && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-48 w-48 rounded-2xl border-2 border-sci-cyan/70 shadow-[0_0_15px_rgba(22,143,189,0.3)]">
                      <div className="h-0.5 w-full animate-pulse bg-gradient-to-r from-transparent via-sci-cyan to-transparent" />
                    </div>
                  </div>
                )}

                {isValidating && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center bg-sci-navy/85 p-6 text-center text-white backdrop-blur-[1px]"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-white/95 shadow-lg">
                      <Loader2 className="h-8 w-8 animate-spin text-sci-cyan" aria-hidden="true" />
                    </div>
                    <p className="mt-4 text-sm font-extrabold">Validando ingreso...</p>
                    <p className="mt-1 text-xs font-medium text-white/75">
                      Verificando credencial de acceso
                    </p>
                  </div>
                )}

                {!cameraActive && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 p-6 text-center text-muted-foreground">
                    <Camera className="h-10 w-10 animate-pulse text-sci-cyan" />
                    <p className="mt-3 text-xs font-semibold text-foreground">Iniciando cámara...</p>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card p-6 text-center">
                    <VideoOff className="h-10 w-10 text-sci-red" />
                    <p className="mt-3 text-xs font-semibold text-sci-red">{cameraError}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void startScanner()}
                      className="mt-4 cursor-pointer gap-1.5 text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Reintentar
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {cameraActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void stopScanner()}
                    disabled={isValidating}
                    className="cursor-pointer gap-1.5 text-xs text-sci-red hover:text-sci-red"
                  >
                    <VideoOff className="h-3.5 w-3.5" /> Detener cámara
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void startScanner()}
                    disabled={isValidating}
                    className="cursor-pointer gap-1.5 bg-sci-blue text-xs text-white hover:opacity-90"
                  >
                    <Camera className="h-3.5 w-3.5" /> Encender cámara
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ingreso Manual por Nombre o SIS */}
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-sci-cyan" />
                <h3 className="font-bold text-xs text-sci-navy">
                  Ingreso manual sin QR
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Busca al alumno por nombre, apellido o código SIS para permitir su ingreso manualmente.
              </p>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Escribe el nombre o código SIS del estudiante..."
                  className="h-10 pl-9 text-xs bg-background"
                />
              </div>

              {searchQuery.trim() !== '' && (
                <div className="max-h-48 overflow-y-auto divide-y divide-border rounded-xl border border-border bg-muted/20">
                  {filteredCandidates.map((cand) => (
                    <div
                      key={cand.id}
                      className="flex items-center justify-between p-3 text-xs hover:bg-muted/40 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-sci-navy">{cand.nombre_completo}</p>
                        <p className="text-[11px] text-muted-foreground">
                          SIS: {cand.codigo_sis} · CI: {cand.ci}
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        disabled={manualLoading}
                        onClick={() => void handleIngresoManual(cand)}
                        className="cursor-pointer bg-sci-blue text-[11px] font-semibold text-white hover:opacity-90 h-8"
                      >
                        Dar Ingreso
                      </Button>
                    </div>
                  ))}

                  {filteredCandidates.length === 0 && (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No se hallaron estudiantes pendientes con ese criterio.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Controles Offline, Control de Sesión y Estudiantes en Sala (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          {/* Bloque de Gestión Offline (HU-21) */}
          <ControlesOffline idExamen={exam.id} token={token} />

          {/* Tarjeta de Control de Sesión */}
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="space-y-3 p-5 text-xs">
              <h3 className="flex items-center gap-2 font-bold text-sci-navy">
                <ShieldCheck className="h-4 w-4 text-sci-cyan" /> Control de sesión
              </h3>

              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground">Evaluación activa:</p>
                <p className="break-words font-semibold leading-snug text-foreground">
                  {exam.nombre}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground">Ambiente asignado:</p>
                <p className="font-semibold text-foreground">
                  {exam.aula?.nombre ?? 'Aula general'}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-sci-cyan" aria-hidden="true" />
                ) : (
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      cameraActive ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground'
                    }`}
                  />
                )}
                <span className="font-medium text-foreground">
                  {isValidating
                    ? 'Validando ingreso...'
                    : cameraActive
                      ? 'Lector activo y listo'
                      : 'Lector en espera'}
                </span>
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                El lector se pausa automáticamente al detectar un QR y se habilita nuevamente al
                cerrar el resultado.
              </p>
            </CardContent>
          </Card>

          {/* Tarjeta de Estudiantes en Sala */}
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-sci-cyan" />
                  <h3 className="font-bold text-xs text-sci-navy">
                    Estudiantes en Sala ({asistencias.length})
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void loadAsistencias()}
                  className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                  title="Actualizar lista"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingAsistencias ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                {asistencias.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-sci-navy truncate max-w-[170px] sm:max-w-[200px]">
                        {item.nombre_completo}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        SIS: {item.codigo_sis}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3 text-sci-cyan" />
                        {item.hora_ingreso}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          item.metodo === 'QR'
                            ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                            : 'border border-blue-500/30 bg-blue-500/10 text-blue-700'
                        }`}
                      >
                        {item.metodo === 'QR' ? (
                          <>
                            <QrCode className="h-2.5 w-2.5" /> QR
                          </>
                        ) : (
                          'MANUAL'
                        )}
                      </span>
                    </div>
                  </div>
                ))}

                {asistencias.length === 0 && (
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    Aún no se registran ingresos en este examen.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Feedback usando el componente dedicado */}
      <ResultadoValidacionDialog
        open={showModal}
        resultado={validationResult}
        examen={exam}
        onClose={handleCloseModal}
      />
    </>
  )
}
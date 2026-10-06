import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Camera,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  VideoOff,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ResultadoValidacionDialog,
  type ResultadoValidacionAcceso,
} from '@/components/examenes/ResultadoValidacionDialog'
import { api, ApiError } from '@/services/api'
import type { Examen } from '@/services/examenes.service'

const READER_ID = 'qr-camera-stream-unique'

interface VerificationResponse {
  message: string
  resultado: string
  estudiante?: {
    id: string
    nombre_completo: string
    codigo_sis: string
    ci: string
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
      motivo: 'Ocurrió un error inesperado al validar el ingreso.',
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
    case 'RECHAZADO_MATERIA_INCORRECTA':
      return {
        estado: 'rechazado',
        codigo: 'MATERIA_INCORRECTA',
        motivo: payload.message ?? error.message,
      }
    case 'EXAMEN_NO_ENCONTRADO':
      return {
        estado: 'rechazado',
        codigo: 'EXAMEN_NO_ENCONTRADO',
        motivo: payload.message ?? error.message,
      }
    case 'ERROR_DATOS_INVALIDOS':
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

  const isPausedRef = useRef(false)
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null)

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

  const handleScan = useCallback(
    async (decodedText: string) => {
      if (isPausedRef.current) return

      isPausedRef.current = true
      setValidationResult(null)
      setIsValidating(true)

      try {
        const response = await api.post<VerificationResponse>(
          `/examenes/${exam.id}/verificar-ingreso`,
          { qr_data: decodedText },
        )

        setValidationResult({
          estado: 'autorizado',
          estudiante: {
            nombreCompleto: response.estudiante?.nombre_completo,
            codigoSis: response.estudiante?.codigo_sis,
          },
          horaIngreso: response.detalles?.hora_ingreso,
        })
        setShowModal(true)
      } catch (error) {
        setValidationResult(mapVerificationError(error))
        setShowModal(true)
      } finally {
        setIsValidating(false)
      }
    },
    [exam.id],
  )

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
        () => {},
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

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-xs lg:col-span-2">
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
                    Esperando respuesta del sistema
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

        <div className="space-y-4">
          <Card className="rounded-2xl border-border bg-card shadow-xs">
            <CardContent className="space-y-4 p-5 text-xs">
              <h3 className="flex items-center gap-2 font-bold text-foreground">
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
        </div>
      </div>

      <ResultadoValidacionDialog
        open={showModal}
        resultado={validationResult}
        examen={exam}
        onClose={handleCloseModal}
      />
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  VideoOff,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
    hora_ingreso?: string
    aula?: string
    motivo_inhabilitacion?: string
    primer_ingreso?: string
  }
}

export function DetalleEscanerTab({ exam }: { exam: Examen }) {
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [, setVerifying] = useState(false)
  const [scanResult, setScanResult] = useState<{
    status: 'PERMITIDO' | 'YA_INGRESO' | 'INHABILITADO' | 'NO_INSCRITO' | 'INVALIDO'
    title: string
    message: string
    estudianteNombre?: string
    codigoSis?: string
    detalle?: string
  } | null>(null)

  const isPausedRef = useRef(false)
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null)

  const stopScanner = async () => {
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
  }

  const handleScan = async (decodedText: string) => {
    if (isPausedRef.current) return
    isPausedRef.current = true
    setVerifying(true)

    try {
      const response = await api.post<VerificationResponse>(
        `/examenes/${exam.id}/verificar-ingreso`,
        { qr_data: decodedText }
      )

      setScanResult({
        status: 'PERMITIDO',
        title: 'Ingreso Autorizado',
        message: response.message,
        estudianteNombre: response.estudiante?.nombre_completo,
        codigoSis: response.estudiante?.codigo_sis,
        detalle: response.detalles?.hora_ingreso ? `Hora: ${response.detalles.hora_ingreso}` : undefined,
      })
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.message

        if (err.status === 409) {
          setScanResult({
            status: 'YA_INGRESO',
            title: 'Acceso Denegado (Reingreso)',
            message: msg,
            detalle: 'El estudiante ya registró su entrada a este examen.',
          })
        } else if (err.status === 403) {
          setScanResult({
            status: msg.toLowerCase().includes('inhabilitado') ? 'INHABILITADO' : 'NO_INSCRITO',
            title: 'Acceso Denegado',
            message: msg,
            detalle: 'No cumple con las condiciones requeridas para rendir el examen.',
          })
        } else {
          setScanResult({
            status: 'INVALIDO',
            title: 'QR No Reconocido',
            message: msg,
            detalle: 'El código escaneado no tiene un formato válido para este sistema.',
          })
        }
      } else {
        setScanResult({
          status: 'INVALIDO',
          title: 'Error de Red',
          message: 'No se pudo comunicar con el servidor.',
        })
      }
    } finally {
      setVerifying(false)
      setShowModal(true)
    }
  }

  const startScanner = async () => {
    setCameraError(null)
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
          aspectRatio: 1.0,
        },
        (decodedText) => void handleScan(decodedText),
        () => {}
      )

      setCameraActive(true)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudo acceder a la cámara. Revisa los permisos del navegador.'
      setCameraError(msg)
      setCameraActive(false)
    }
  }

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
  }, [])

  const handleCloseModal = () => {
    setShowModal(false)
    setScanResult(null)
    setTimeout(() => {
      isPausedRef.current = false
    }, 500)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Contenedor del visor de cámara */}
      <Card className="rounded-2xl border-border bg-card shadow-xs lg:col-span-2 overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border-2 border-border bg-black shadow-inner">
            <div
              id={READER_ID}
              className="w-full aspect-square overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
            />

            {cameraActive && !showModal && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-48 rounded-2xl border-2 border-sci-cyan/70 shadow-[0_0_15px_rgba(22,143,189,0.3)]">
                  <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-sci-cyan to-transparent animate-pulse" />
                </div>
              </div>
            )}

            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 text-muted-foreground p-6 text-center">
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
                  className="mt-4 gap-1.5 text-xs cursor-pointer"
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
                className="gap-1.5 text-xs cursor-pointer text-sci-red hover:text-sci-red"
              >
                <VideoOff className="h-3.5 w-3.5" /> Detener cámara
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => void startScanner()}
                className="gap-1.5 text-xs cursor-pointer bg-sci-blue text-white hover:opacity-90"
              >
                <Camera className="h-3.5 w-3.5" /> Encender cámara
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Control de Sesión */}
      <div className="space-y-4">
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="space-y-4 p-5 text-xs">
            <h3 className="flex items-center gap-2 font-bold text-sci-navy">
              <ShieldCheck className="h-4 w-4 text-sci-cyan" /> Control de Sesión
            </h3>

            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground">Evaluación activa:</p>
              <p className="font-semibold text-sci-navy truncate">{exam.nombre}</p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground">Ambiente asignado:</p>
              <p className="font-semibold text-sci-navy">{exam.aula?.nombre ?? 'Aula general'}</p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
                }`}
              />
              <span className="font-medium text-foreground">
                {cameraActive ? 'Lector activo y listo' : 'Lector en espera'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Feedback del Escaneo */}
      <Dialog open={showModal} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-md overflow-hidden rounded-2xl border-border bg-card p-0 text-card-foreground shadow-2xl">
          {/* Cabecera con color dinámico */}
          <div
            className={`p-6 text-center ${
              scanResult?.status === 'PERMITIDO'
                ? 'bg-emerald-500/10'
                : scanResult?.status === 'YA_INGRESO'
                ? 'bg-amber-500/10'
                : 'bg-red-500/10'
            }`}
          >
            <div
              className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-white shadow-md ${
                scanResult?.status === 'PERMITIDO'
                  ? 'bg-emerald-500'
                  : scanResult?.status === 'YA_INGRESO'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
            >
              {scanResult?.status === 'PERMITIDO' && <CheckCircle2 className="h-8 w-8" />}
              {scanResult?.status === 'YA_INGRESO' && <AlertTriangle className="h-8 w-8" />}
              {(scanResult?.status === 'INHABILITADO' || scanResult?.status === 'NO_INSCRITO') && (
                <XCircle className="h-8 w-8" />
              )}
              {scanResult?.status === 'INVALIDO' && <AlertCircle className="h-8 w-8" />}
            </div>

            <DialogTitle className="mt-3 text-lg font-extrabold text-sci-navy">
              {scanResult?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {scanResult?.message}
            </DialogDescription>
          </div>

          <div className="space-y-3 px-6 py-5 text-xs">
            {scanResult?.estudianteNombre && (
              <div className="flex justify-between border-b border-border pb-2">
                <span className="font-semibold text-foreground">Estudiante:</span>
                <span className="font-bold text-sci-navy">{scanResult.estudianteNombre}</span>
              </div>
            )}
            {scanResult?.codigoSis && (
              <div className="flex justify-between border-b border-border pb-2">
                <span className="font-semibold text-foreground">Código SIS:</span>
                <span className="font-mono text-muted-foreground">{scanResult.codigoSis}</span>
              </div>
            )}
            {scanResult?.detalle && (
              <p className="rounded-xl border border-border bg-muted/40 p-3 text-muted-foreground">
                {scanResult.detalle}
              </p>
            )}
          </div>

          <div className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
            <Button
              type="button"
              className="cursor-pointer bg-sci-blue text-xs font-semibold text-white hover:opacity-90 w-full"
              onClick={handleCloseModal}
            >
              Continuar escaneando
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
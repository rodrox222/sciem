import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Camera,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  VideoOff,
  ScanLine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { Examen } from '@/services/examenes.service'

const READER_ID = 'qr-camera-stream-unique'

export function DetalleEscanerTab({ exam }: { exam: Examen }) {
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [qrRawData, setQrRawData] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [scanTimestamp, setScanTimestamp] = useState<string>('')

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

  const startScanner = async () => {
    setCameraError(null)
    isPausedRef.current = false

    // Asegurarse de limpiar cualquier instancia previa
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
        (decodedText) => {
          // Si el modal está abierto o está en pausa lógica, ignoramos lecturas consecutivas
          if (isPausedRef.current) return

          isPausedRef.current = true

          const now = new Intl.DateTimeFormat('es-BO', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }).format(new Date())

          setQrRawData(decodedText)
          setScanTimestamp(now)
          setShowModal(true)
        },
        () => {
          // Escaneo frame a frame sin detección
        },
      )

      setCameraActive(true)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'No se pudo acceder a la cámara. Revisa los permisos del navegador o conexión HTTPS/localhost.'
      setCameraError(msg)
      setCameraActive(false)
    }
  }

  useEffect(() => {
    let mounted = true

    // Retardo mínimo para asegurar que el contenedor DOM esté pintado en el Tab
    const timeout = setTimeout(() => {
      if (mounted) {
        void startScanner()
      }
    }, 150)

    return () => {
      mounted = false
      clearTimeout(timeout)
      void stopScanner()
    }
  }, [])

  const handleCloseModal = () => {
    setShowModal(false)
    // Desbloqueamos la pausa para permitir leer el siguiente QR sin reiniciar el hardware de la cámara
    setTimeout(() => {
      isPausedRef.current = false
    }, 300)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Contenedor del visor de cámara */}
      <Card className="rounded-2xl border-border bg-card shadow-xs lg:col-span-2 overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border-2 border-border bg-black shadow-inner">
            {/* Contenedor del visor QR con estilos limpios */}
            <div
              id={READER_ID}
              className="w-full aspect-square overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
            />

            {/* Efecto visual de visor de escaneo */}
            {cameraActive && !showModal && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-48 w-48 rounded-2xl border-2 border-sci-cyan/70 shadow-[0_0_15px_rgba(22,143,189,0.3)]">
                  <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-sci-cyan to-transparent animate-pulse" />
                </div>
              </div>
            )}

            {/* Estado de carga */}
            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 text-muted-foreground p-6 text-center">
                <Camera className="h-10 w-10 animate-pulse text-sci-cyan" />
                <p className="mt-3 text-xs font-semibold text-foreground">Iniciando cámara...</p>
              </div>
            )}

            {/* Estado de error */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-card p-6 text-center">
                <VideoOff className="h-10 w-10 text-sci-red" />
                <p className="mt-3 text-xs font-semibold text-sci-red">{cameraError}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Verifica que la cámara no esté en uso por otra pestaña y concede permisos.
                </p>
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

      {/* Información del examen y estado */}
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

      {/* Modal: Estudiante registrado con datos del QR crudos */}
      <Dialog open={showModal} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-md overflow-hidden rounded-2xl border-border bg-card p-0 text-card-foreground shadow-2xl">
          <div className="bg-emerald-500/10 p-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-md">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogTitle className="mt-3 text-lg font-extrabold text-sci-navy">
              Estudiante registrado
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Código QR detectado correctamente.
            </DialogDescription>
          </div>

          <div className="space-y-3 px-6 py-5 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-semibold text-foreground">Hora de registro:</span>
              <span className="font-mono text-muted-foreground">{scanTimestamp}</span>
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold text-foreground block">
                Información del QR detectado:
              </span>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-muted/50 p-3 font-mono text-[11px] text-sci-navy break-all whitespace-pre-wrap select-all">
                {qrRawData || 'Sin contenido'}
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
            <Button
              type="button"
              className="cursor-pointer bg-sci-blue text-xs font-semibold text-white hover:opacity-90"
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
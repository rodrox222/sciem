import { useEffect, useState } from 'react'
import { Camera, RefreshCw, X } from 'lucide-react'

interface CapturaFotoPerfilProps {
  camaraAbierta: boolean
  fotoCapturada: File | null
  subiendoFoto?: boolean
  errorCamara: string
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onAbrirCamara: () => void | Promise<void>
  onCapturarFotografia: () => void
  onCerrarCamara: () => void
  onDescartarFotografia: () => void
}

export default function CapturaFotoPerfil({
  camaraAbierta,
  fotoCapturada,
  errorCamara,
  videoRef,
  canvasRef,
  onAbrirCamara,
  onCapturarFotografia,
  onCerrarCamara,
  onDescartarFotografia,
}: CapturaFotoPerfilProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!fotoCapturada) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(fotoCapturada)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [fotoCapturada])

  return (
    <div className="mt-6 space-y-3 border-t pt-5">
      <div>
        <p className="text-sm font-medium">Fotografía de perfil</p>
        <p className="text-sm text-muted-foreground">
          Debes tomar la fotografía en vivo. No puedes seleccionar imágenes
          de tu galería.
        </p>
      </div>

      {!camaraAbierta && !fotoCapturada && (
        <button
          type="button"
          onClick={() => void onAbrirCamara()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Camera size={16} />
          Abrir cámara
        </button>
      )}

      {camaraAbierta && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Toma una fotografía en vivo para registrar tu identidad oficial.
          </p>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-semibold">
              Recomendaciones para la fotografía
            </p>
            <p className="mt-1">
              Utiliza un fondo claro, busca buena iluminación y asegúrate
              de que tu rostro se vea completo y claramente.
            </p>
          </div>

          <div className="relative w-full max-w-md overflow-hidden rounded-xl border bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-auto min-h-[240px] max-h-[65dvh] w-full rounded-xl border bg-black object-cover sm:max-w-md"
            />

            <svg
              viewBox="0 0 320 300"
              preserveAspectRatio="xMidYMid meet"
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              <path
                d="M160 35
                  C118 35 100 69 100 111
                  C100 140 111 159 128 173
                  L128 188
                  C113 199 89 204 66 216
                  C45 228 34 250 29 280
                  L291 280
                  C286 250 275 228 254 216
                  C231 204 207 199 192 188
                  L192 173
                  C209 159 220 140 220 111
                  C220 69 202 35 160 35 Z"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-3 py-2 text-xs font-medium text-white">
              Centra tu rostro y hombros
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-2">
            <button
              type="button"
              onClick={onCapturarFotografia}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground sm:w-auto"
            >
              <Camera size={16} />
              Tomar fotografía
            </button>

            <button
              type="button"
              onClick={onCerrarCamara}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm sm:w-auto"
            >
              <X size={16} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {fotoCapturada && (
        <div className="space-y-2.5">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Vista previa de fotografía capturada"
              className="h-44 w-44 rounded-xl border object-cover shadow-xs"
            />
          )}
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-green-700">
              ✓ Fotografía capturada correctamente
            </p>

            <button
              type="button"
              onClick={onDescartarFotografia}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline"
            >
              <RefreshCw size={13} />
              Volver a tomar
            </button>
          </div>
        </div>
      )}

      {errorCamara && (
        <p role="alert" className="text-sm text-red-700">
          {errorCamara}
        </p>
      )}
    </div>
  )
}

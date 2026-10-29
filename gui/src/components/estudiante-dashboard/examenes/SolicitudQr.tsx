import { Camera } from 'lucide-react'
import type { RefObject } from 'react'

interface SolicitudQrProps {
  camaraAbierta: boolean
  fotoVerificacion: File | null
  solicitandoQr: boolean
  errorQr: string
  mensajeQr: string
  videoRef: RefObject<HTMLVideoElement | null>
  onAbrirCamara: () => void | Promise<void>
  onCapturarFoto: () => void
  onCancelar: () => void
  onSolicitarQr: () => void | Promise<void>
  onVolverATomar: () => void | Promise<void>
}

export default function SolicitudQr({
  camaraAbierta,
  fotoVerificacion,
  solicitandoQr,
  errorQr,
  mensajeQr,
  videoRef,
  onAbrirCamara,
  onCapturarFoto,
  onCancelar,
  onSolicitarQr,
  onVolverATomar,
}: SolicitudQrProps) {
  return (
    <div className="mt-5 space-y-3 border-t pt-4">
      {!camaraAbierta && !fotoVerificacion && (
        <button
          type="button"
          onClick={() => void onAbrirCamara()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Camera size={16} />
          Solicitar QR
        </button>
      )}

      {camaraAbierta && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Toma una fotografía en vivo para verificar tu identidad.
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
              onClick={onCapturarFoto}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground sm:w-auto"
            >
              <Camera size={16} />
              Capturar verificación
            </button>

            <button
              type="button"
              onClick={onCancelar}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border px-4 py-3 text-sm sm:w-auto"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {fotoVerificacion && (
        <div className="space-y-3">
          <p className="text-sm text-green-700">
            Fotografía de verificación capturada.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void onSolicitarQr()}
              disabled={solicitandoQr}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {solicitandoQr ? 'Generando QR...' : 'Confirmar y generar QR'}
            </button>

            <button
              type="button"
              onClick={() => void onVolverATomar()}
              disabled={solicitandoQr}
              className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
            >
              Volver a tomar
            </button>
          </div>
        </div>
      )}

      {mensajeQr && (
        <p className="text-sm text-green-700">{mensajeQr}</p>
      )}

      {errorQr && (
        <p role="alert" className="text-sm text-red-700">
          {errorQr}
        </p>
      )}
    </div>
  )
}
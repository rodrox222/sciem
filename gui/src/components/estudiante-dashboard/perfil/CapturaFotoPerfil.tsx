import { Camera, X } from 'lucide-react'

interface CapturaFotoPerfilProps {
  camaraAbierta: boolean
  fotoCapturada: File | null
  subiendoFoto: boolean
  errorCamara: string
  errorPerfil: string
  mensajePerfil: string
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onAbrirCamara: () => void | Promise<void>
  onCapturarFotografia: () => void
  onCerrarCamara: () => void
  onDescartarFotografia: () => void
  onSubirFotografia: () => void | Promise<void>
}

export default function CapturaFotoPerfil({
  camaraAbierta,
  fotoCapturada,
  subiendoFoto,
  errorCamara,
  errorPerfil,
  mensajePerfil,
  videoRef,
  canvasRef,
  onAbrirCamara,
  onCapturarFotografia,
  onCerrarCamara,
  onDescartarFotografia,
  onSubirFotografia,
}: CapturaFotoPerfilProps) {
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
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-muted"
        >
          <Camera size={16} />
          Abrir cámara
        </button>
      )}

      {camaraAbierta && (
        <div className="max-w-md space-y-3">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-xl border bg-black"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCapturarFotografia}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              <Camera size={16} />
              Tomar fotografía
            </button>

            <button
              type="button"
              onClick={onCerrarCamara}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"
            >
              <X size={16} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {fotoCapturada && (
        <div className="space-y-3">
          <p className="text-sm text-green-700">
            Fotografía capturada correctamente.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onSubirFotografia()}
              disabled={subiendoFoto}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {subiendoFoto ? 'Subiendo fotografía...' : 'Guardar fotografía'}
            </button>

            <button
              type="button"
              onClick={onDescartarFotografia}
              disabled={subiendoFoto}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
            >
              <X size={16} />
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

      {errorPerfil && (
        <p role="alert" className="text-sm text-red-700">
          {errorPerfil}
        </p>
      )}

      {mensajePerfil && (
        <p role="status" className="text-sm text-green-700">
          {mensajePerfil}
        </p>
      )}
    </div>
  )
}
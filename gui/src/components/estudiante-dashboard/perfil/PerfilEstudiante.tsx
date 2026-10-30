import { Save, UserRound } from 'lucide-react'
import FormularioPerfil from './FormularioPerfil'
import CapturaFotoPerfil from './CapturaFotoPerfil'

interface PerfilEstudianteProps {
  ci: string
  ciExtension: string
  errorCi?: string         
  errorExtension?: string  
  errorFoto?: string
  guardandoPerfil: boolean
  camaraAbierta: boolean
  fotoCapturada: File | null
  errorCamara: string
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onCiChange: (valor: string) => void
  onCiExtensionChange: (valor: string) => void
  onGuardarTodo: () => void | Promise<void>
  onAbrirCamara: () => void | Promise<void>
  onCapturarFotografia: () => void
  onCerrarCamara: () => void
  onDescartarFotografia: () => void
}

export default function PerfilEstudiante({
  ci,
  ciExtension,
  errorCi = '',          
  errorExtension = '',   
  errorFoto = '',
  guardandoPerfil,
  camaraAbierta,
  fotoCapturada,
  errorCamara,
  videoRef,
  canvasRef,
  onCiChange,
  onCiExtensionChange,
  onGuardarTodo,
  onAbrirCamara,
  onCapturarFotografia,
  onCerrarCamara,
  onDescartarFotografia,
}: PerfilEstudianteProps) {
  return (
    <section className="space-y-6 rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <UserRound size={22} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Configuración de primer acceso</h2>
          <p className="text-sm text-muted-foreground">
            Ingresa tu carnet de identidad y registra tu fotografía obligatoria para continuar.
          </p>
        </div>
      </div>

      <FormularioPerfil
        ci={ci}
        ciExtension={ciExtension}
        errorCi={errorCi}
        errorExtension={errorExtension}
        onCiChange={onCiChange}
        onCiExtensionChange={onCiExtensionChange}
      />

      <div className="space-y-2">
        <CapturaFotoPerfil
          camaraAbierta={camaraAbierta}
          fotoCapturada={fotoCapturada}
          errorCamara={errorCamara}
          videoRef={videoRef}
          canvasRef={canvasRef}
          onAbrirCamara={onAbrirCamara}
          onCapturarFotografia={onCapturarFotografia}
          onCerrarCamara={onCerrarCamara}
          onDescartarFotografia={onDescartarFotografia}
        />
        {errorFoto && (
          <p role="alert" className="text-sm text-red-600">
            {errorFoto}
          </p>
        )}
      </div>

      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => void onGuardarTodo()}
          disabled={guardandoPerfil}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          <Save size={16} />
          {guardandoPerfil ? 'Guardando información...' : 'Completar y guardar perfil'}
        </button>
      </div>
    </section>
  )
}
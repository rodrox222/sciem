import { UserRound } from 'lucide-react'
import FormularioPerfil from './FormularioPerfil'
import CapturaFotoPerfil from './CapturaFotoPerfil'

interface PerfilEstudianteProps {
  ci: string
  ciExtension: string
  errorPerfil: string
  mensajePerfil: string
  guardandoPerfil: boolean
  camaraAbierta: boolean
  fotoCapturada: File | null
  subiendoFoto: boolean
  errorCamara: string
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onCiChange: (valor: string) => void
  onCiExtensionChange: (valor: string) => void
  onGuardarPerfil: () => void | Promise<void>
  onAbrirCamara: () => void | Promise<void>
  onCapturarFotografia: () => void
  onCerrarCamara: () => void
  onDescartarFotografia: () => void
  onSubirFotografia: () => void | Promise<void>
}

export default function PerfilEstudiante({
  ci,
  ciExtension,
  errorPerfil,
  mensajePerfil,
  guardandoPerfil,
  camaraAbierta,
  fotoCapturada,
  subiendoFoto,
  errorCamara,
  videoRef,
  canvasRef,
  onCiChange,
  onCiExtensionChange,
  onGuardarPerfil,
  onAbrirCamara,
  onCapturarFotografia,
  onCerrarCamara,
  onDescartarFotografia,
  onSubirFotografia,
}: PerfilEstudianteProps) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <UserRound size={22} />
        </div>

        <div>
          <h2 className="text-lg font-semibold">Mi perfil</h2>
          <p className="text-sm text-muted-foreground">
            Completa tus datos personales y registra tu fotografía.
          </p>
        </div>
      </div>

      <FormularioPerfil
        ci={ci}
        ciExtension={ciExtension}
        errorPerfil={errorPerfil}
        guardandoPerfil={guardandoPerfil}
        onCiChange={onCiChange}
        onCiExtensionChange={onCiExtensionChange}
        onGuardarPerfil={onGuardarPerfil}
      />

      <CapturaFotoPerfil
        camaraAbierta={camaraAbierta}
        fotoCapturada={fotoCapturada}
        subiendoFoto={subiendoFoto}
        errorCamara={errorCamara}
        errorPerfil={errorPerfil}
        mensajePerfil={mensajePerfil}
        videoRef={videoRef}
        canvasRef={canvasRef}
        onAbrirCamara={onAbrirCamara}
        onCapturarFotografia={onCapturarFotografia}
        onCerrarCamara={onCerrarCamara}
        onDescartarFotografia={onDescartarFotografia}
        onSubirFotografia={onSubirFotografia}
      />
    </section>
  )
}
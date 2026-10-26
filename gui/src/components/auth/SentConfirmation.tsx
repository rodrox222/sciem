
import React from 'react'
import { Button } from '@/components/ui/button'
import { MailCheck, ArrowLeft, ShieldCheck } from 'lucide-react'

interface SentConfirmationProps {
  email: string
  onRetry: () => void
  onBackToLogin?: () => void
}

export const SentConfirmation: React.FC<SentConfirmationProps> = ({
  email,
  onRetry,
  onBackToLogin,
}) => (
  <div className="mx-auto w-full max-w-md space-y-5 py-4">
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-sci-cyan/20 bg-sci-cyan/10 text-sci-blue">
        <MailCheck className="h-8 w-8" strokeWidth={1.8} />
      </div>

      <span className="mb-2 text-[11px] font-bold uppercase tracking-wider text-sci-cyan">
        Solicitud recibida
      </span>

      <h3 className="text-2xl font-extrabold tracking-tight text-sci-navy">
        Revisa tu correo institucional
      </h3>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Si el correo indicado está registrado, recibirás instrucciones para
        restablecer tu contraseña.
      </p>
    </div>

    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold text-muted-foreground">
        Correo indicado
      </p>
      <p className="mt-1 break-all text-sm font-semibold text-sci-navy">
        {email}
      </p>
    </div>

    <div className="flex items-start gap-3 rounded-xl border border-sci-cyan/20 bg-sci-cyan/5 p-4">
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sci-cyan" />

      <div className="space-y-1">
        <p className="text-xs font-bold text-sci-navy">
          Protege tu cuenta
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          El enlace expira en 60 minutos. Revisa también tu carpeta de correo no deseado.
        </p>
      </div>
    </div>

    <div className="flex flex-col gap-3 pt-1">
      <Button
        type="button"
        onClick={onBackToLogin}
        className="h-11 w-full cursor-pointer rounded-xl bg-sci-blue text-sm font-bold text-white shadow-sm hover:opacity-90"
      >
        Volver al inicio de sesión
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={onRetry}
        className="h-10 w-full cursor-pointer rounded-xl text-sm font-semibold"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Intentar con otro correo
      </Button>
    </div>
  </div>
)

export default SentConfirmation

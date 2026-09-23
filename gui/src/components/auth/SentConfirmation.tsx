import React from 'react'
import { Button } from '@/components/ui/button'
import { MailCheck, ArrowLeft } from 'lucide-react'

interface SentConfirmationProps {
  email: string
  onRetry: () => void
  onBackToLogin?: () => void
}

export const SentConfirmation: React.FC<SentConfirmationProps> = ({ email, onRetry, onBackToLogin }) => (
  <div className="text-center py-4 space-y-4">
    <div className="w-16 h-16 bg-sci-cyan/15 text-sci-cyan rounded-full flex items-center justify-center mx-auto mb-2">
      <MailCheck className="w-8 h-8" />
    </div>
    <h3 className="text-2xl font-bold text-sci-navy tracking-tight">Revisa tu correo institucional</h3>
    <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
      Si el correo <strong className="text-foreground">{email}</strong> está registrado, recibirás un mensaje seguro para restablecer tu acceso.
    </p>

    <div className="p-3 bg-sci-amber/10 border border-sci-amber/20 rounded-xl text-[11px] text-sci-amber max-w-md mx-auto text-left font-medium">
      El enlace expira en 60 minutos. Revisa también tu carpeta de correo no deseado.
    </div>

    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
      <Button type="button" variant="outline" onClick={onRetry} className="text-xs rounded-xl cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Reintentar con otro correo
      </Button>
      <Button type="button" onClick={onBackToLogin} className="bg-sci-blue hover:opacity-90 text-white text-xs rounded-xl cursor-pointer">
        Volver al login
      </Button>
    </div>
  </div>
)
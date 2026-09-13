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
    <div className="w-16 h-16 bg-blue-50 text-[#003770] rounded-full flex items-center justify-center mx-auto mb-2">
      <MailCheck className="w-8 h-8" />
    </div>
    <h3 className="text-2xl font-bold text-slate-900">Revisa tu correo institucional</h3>
    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
      Si el correo <strong className="text-slate-800">{email}</strong> está registrado en el sistema, recibirás un mensaje con un botón seguro para restablecer tu acceso.
    </p>

    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 max-w-md mx-auto text-left">
      El enlace expira en 60 minutos. Revisa también tu carpeta de spam o correo no deseado.
    </div>

    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
      <Button type="button" variant="outline" onClick={onRetry} className="text-xs">
        <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Reenviar a otro correo
      </Button>
      <Button type="button" onClick={onBackToLogin} className="bg-[#003770] hover:bg-[#002852] text-white text-xs">
        Volver al login
      </Button>
    </div>
  </div>
)
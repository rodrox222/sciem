import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ForgotPasswordView } from '../components/ForgotPasswordView'
import { AuthLayout } from '../layouts/AuthLayout'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export const ForgotPasswordPage: React.FC = () => {
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Recuperar contraseña | SCI'
  }, [])

  const handleBackToLogin = () => {
    navigate('/login')
  }

  // abri modal
  const handleSuccess = () => {
    setShowSuccessModal(true)
  }

  const handleConfirmLogin = () => {
    setShowSuccessModal(false)
    navigate('/login')
  }

  return (
    <AuthLayout>
      <ForgotPasswordView
        onBackToLogin={handleBackToLogin}
        onSuccess={handleSuccess}
      />

      {/* Modal de confirmación */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-3xl p-6 sm:p-8 text-center border border-slate-100 shadow-2xl">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>

            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-extrabold text-[#0a2e5c] text-center tracking-tight">
                Contraseña actualizada
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 text-center leading-relaxed">
                Tu clave ha sido restablecida exitosamente. Ya puedes ingresar al sistema con tus nuevas credenciales.
              </DialogDescription>
            </DialogHeader>
          </div>

          <DialogFooter className="mt-6 sm:justify-center">
            <Button
              type="button"
              onClick={handleConfirmLogin}
              className="w-full h-11 bg-[#0a2e5c] hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-950/15 transition-all"
            >
              Ir a Iniciar Sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
// src/pages/ForgotPasswordPage.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ForgotPasswordView } from '../components/ForgotPasswordView'
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

  const handleSuccess = () => {
    setShowSuccessModal(true)
  }

  const handleConfirmLogin = () => {
    setShowSuccessModal(false)
    navigate('/login')
  }

  return (
    <>
      <ForgotPasswordView
        onBackToLogin={handleBackToLogin}
        onSuccess={handleSuccess}
      />

      {/* Modal de confirmación con tokens semánticos */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-[420px] bg-card text-card-foreground rounded-3xl p-6 sm:p-8 text-center border border-border shadow-2xl">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>

            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-bold text-sci-navy text-center tracking-tight">
                Contraseña actualizada
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground text-center leading-relaxed">
                Tu clave ha sido restablecida exitosamente. Ya puedes ingresar al sistema con tus nuevas credenciales.
              </DialogDescription>
            </DialogHeader>
          </div>

          <DialogFooter className="mt-6 sm:justify-center">
            <Button
              type="button"
              onClick={handleConfirmLogin}
              className="w-full h-11 bg-sci-blue hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Ir a Iniciar Sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ForgotPasswordPage
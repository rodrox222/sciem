// src/components/ForgotPasswordView.tsx
import React from 'react'
import { useForgotPassword } from '@/hooks/useForgotPassword'
import { LoginBranding } from './login/LoginBranding'
import { RequestStepForm } from './auth/RequestStepForm'
import { SentConfirmation } from './auth/SentConfirmation'
import { ResetPasswordForm } from './auth/ResetPasswordForm'

interface ForgotPasswordProps {
  onBackToLogin?: () => void
  onSuccess?: () => void
}

export const ForgotPasswordView: React.FC<ForgotPasswordProps> = ({
  onBackToLogin,
  onSuccess,
}) => {
  const {
    step,
    setStep,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    isSubmitting,
    requestReset,
    submitNewPassword,
  } = useForgotPassword({ onSuccess, onBackToLogin })

  return (
    <div className="w-full max-w-[1100px] min-h-[520px] bg-white rounded-3xl shadow-xl border border-border flex flex-col md:flex-row overflow-hidden text-card-foreground">
     {/* Panel institucional con el diseño original del inicio de sesión */}
<div className="hidden md:flex md:w-[46%]">
  <LoginBranding />
</div>

      {/* Formulario derecho */}
      <div className="w-full md:w-[54%] p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
        <span className="text-[11px] font-bold text-sci-cyan tracking-wider uppercase block">
          GESTIÓN DE ACCESO
        </span>

        {step === 'request' && (
          <RequestStepForm
            email={email}
            setEmail={setEmail}
            error={error}
            isSubmitting={isSubmitting}
            onSubmit={requestReset}
          />
        )}

        {step === 'sent' && (
          <SentConfirmation
            email={email}
            onRetry={() => setStep('request')}
            onBackToLogin={onBackToLogin}
          />
        )}

        {step === 'reset' && (
          <ResetPasswordForm
            email={email}
            password={password}
            confirmPassword={confirmPassword}
            setPassword={setPassword}
            setConfirmPassword={setConfirmPassword}
            error={error}
            isSubmitting={isSubmitting}
            onSubmit={submitNewPassword}
          />
        )}

        {step !== 'sent' && (
          <div className="mt-6 pt-4 border-t border-border flex justify-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-xs font-semibold text-sci-blue hover:text-sci-navy hover:underline transition-colors cursor-pointer"
            >
              ¿Recordaste tu contraseña? Iniciar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
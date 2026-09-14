import React from 'react'
import { useForgotPassword } from '@/hooks/useForgotPassword'
import { AuthSidebar } from './auth/AuthSidebar'
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
    <div className="w-full max-w-[980px] bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col lg:flex-row overflow-hidden">
      {/* Banner Izquierdo */}
      <AuthSidebar />

      {/* Formulario Derecho */}
      <div className="w-full lg:w-[62%] p-6 sm:p-10 flex flex-col justify-center">
        <span className="text-[11px] font-bold text-[#003770] tracking-wider uppercase block">
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
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-xs font-semibold text-[#003770] hover:underline"
            >
              ¿Recordaste tu contraseña? Iniciar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
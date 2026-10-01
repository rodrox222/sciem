import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { authService } from '@/services/auth.service'

interface UseForgotPasswordOptions {
  onSuccess?: () => void
  onBackToLogin?: () => void
}

const DOMINIOS_PERMITIDOS = [
  '@gmail.com',
  '@est.umss.edu',
  '@fcyt.umss.edu.bo',
]

const esCorreoPermitido = (email: string): boolean => {
  const correo = email.trim().toLowerCase()
  return DOMINIOS_PERMITIDOS.some((dominio) => correo.endsWith(dominio))
}

export const useForgotPassword = (options?: UseForgotPasswordOptions) => {
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token') || ''
  const emailFromUrl = searchParams.get('email') || ''

  const [step, setStep] = useState<'request' | 'sent' | 'reset'>(
    tokenFromUrl ? 'reset' : 'request'
  )
  const [email, setEmail] = useState(emailFromUrl)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const emailNormalizado = email.trim().toLowerCase()

    if (!emailNormalizado || !emailNormalizado.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.')
      return
    }

    // Validación exclusiva en frontend para dominios autorizados
    if (!esCorreoPermitido(emailNormalizado)) {
      setError('Ingresar un correo valido.')
      return
    }

    setIsSubmitting(true)
    try {
      await authService.requestPasswordReset(emailNormalizado)
      setStep('sent')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al comunicarse con el servidor institucional.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsSubmitting(true)
    try {
      await authService.resetPassword({
        token: tokenFromUrl,
        email: email.trim(),
        password,
        password_confirmation: confirmPassword,
      })

      if (options?.onSuccess) options.onSuccess()
      else if (options?.onBackToLogin) options.onBackToLogin()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar la actualización de contraseña.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
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
  }
}
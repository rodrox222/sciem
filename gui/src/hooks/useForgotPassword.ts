// src/hooks/useForgotPassword.ts
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { authService } from '@/services/auth.service'

interface UseForgotPasswordOptions {
  onSuccess?: () => void
  onBackToLogin?: () => void
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

    if (!email.trim() || !email.includes('@')) {
      setError('Por favor ingresa un correo institucional válido.')
      return
    }

    setIsSubmitting(true)
    try {
      await authService.requestPasswordReset(email)
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
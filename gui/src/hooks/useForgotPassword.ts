import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8200/api'

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
      const res = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.errors?.email?.[0] || data.message || 'No se pudo procesar la solicitud.')
      }

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
      const res = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          token: tokenFromUrl,
          email: email.trim(),
          password,
          password_confirmation: confirmPassword,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(
          data.errors?.password?.[0] ||
          data.errors?.token?.[0] ||
          data.message ||
          'El enlace ha expirado o es inválido.'
        )
      }

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

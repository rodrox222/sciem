import { useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8200/api'

export type Role = 'Auxiliar' | 'Docente' | 'Administrador'

interface UseLoginOptions {
  onSuccess: (role: string, token: string) => void
}

export const useLogin = ({ onSuccess }: UseLoginOptions) => {
  const [selectedRole, setSelectedRole] = useState<Role>('Auxiliar')
  const [email, setEmail] = useState('auxiliar@est.umss.edu')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role)
    setError(null)
    if (role === 'Auxiliar') setEmail('auxiliar@est.umss.edu')
    if (role === 'Docente') setEmail('docente@umss.edu')
    if (role === 'Administrador') setEmail('admin@umss.edu')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !email.includes('@')) {
      setError('Ingresa un correo institucional válido.')
      return
    }

    if (!password.trim()) {
      setError('Ingresa tu contraseña.')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role: selectedRole,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 401 || res.status === 422) {
          const validationMsg =
            data.errors?.email?.[0] ||
            data.errors?.password?.[0] ||
            data.message

          if (validationMsg && !validationMsg.toLowerCase().includes('sql')) {
            throw new Error(validationMsg)
          }
          throw new Error('Credenciales inválidas o correo no registrado.')
        }

        throw new Error('Error interno del servidor institucional. Intente más tarde.')
      }

      // Guardar token y rol devueltos por el backend
      const token = data.token || data.access_token || 'demo-token'
      const userRole = data.user?.role || selectedRole
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user_role', userRole)

      onSuccess(userRole, token)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Error al comunicarse con el servidor institucional.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    selectedRole,
    handleRoleSelect,
    email,
    setEmail,
    password,
    setPassword,
    error,
    isSubmitting,
    handleSubmit,
  }
}
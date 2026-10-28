import { useState } from 'react'

//http://localhost:8200/api'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.17:8200'

export type Role = 'Auxiliar' | 'Docente' | 'Administrador'

interface UseLoginOptions {
  onSuccess: (role: string, token: string) => void
}

export const useLogin = ({ onSuccess }: UseLoginOptions) => {
  const [selectedRole, setSelectedRole] = useState<Role>('Docente')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role)
    setError(null)
    setEmail('')
    setPassword('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const identificador = email.trim()

    // Solo validamos formato de correo si NO es Administrador
    if (selectedRole !== 'Administrador' && (!identificador || !identificador.includes('@'))) {
      setError('Ingresa un correo institucional válido.')
      return
    }

    if (selectedRole === 'Administrador' && !identificador) {
      setError('Ingresa tu número de CI.')
      return
    }

    if (!password.trim()) {
      setError('Ingresa tu contraseña.')
      return
    }

    setIsSubmitting(true)

    // Normalizar a los valores que espera el backend: admin, docente, auxiliar
    const backendRole = selectedRole === 'Administrador' ? 'admin' : selectedRole.toLowerCase()

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: identificador,
          password,
          role: backendRole,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 401 || res.status === 422) {
          const validationMsg =
            data.errors?.email?.[0] ||
            data.errors?.role?.[0] ||
            data.errors?.password?.[0] ||
            data.message

          if (validationMsg && !validationMsg.toLowerCase().includes('sql')) {
            throw new Error(validationMsg)
          }
          throw new Error('Credenciales inválidas.')
        }

        throw new Error('Error interno del servidor institucional. Intente más tarde.')
      }

      const token = data.token || data.access_token
      const userRole = data.user?.rol || backendRole

      // Guardar tokens de sesión y rol operativo
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user_role', userRole)
      localStorage.setItem('sci_last_activity', Date.now().toString())

      // 2. Guardar únicamente datos de presentación visual (sin CI ni identificadores sensibles)
      const usuarioSeguro = {
        nombre: data.user?.nombre || '',
        apellido: data.user?.apellido_paterno || data.user?.apellido || '',
      }
      localStorage.setItem('user_data', JSON.stringify(usuarioSeguro))

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
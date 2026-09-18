import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { SciLogoIcon } from './ui/SciLogoIcon'
import { LoginBranding } from './login/LoginBranding'

interface LoginViewProps {
  onLoginSuccess: (role: string) => void
  onForgotPassword: () => void
}

// Dominios oficiales institucionales o número para administradores
const EMAIL_INSTITUCIONAL_REGEX =
  /^[a-zA-Z0-9._%+-]+@(est\.umss\.edu|fcyt\.umss\.edu\.bo)$/

const NUMERIC_REGEX = /^\d+$/

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onForgotPassword,
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanIdentifier = email.trim().toLowerCase()
    const esInstitucional =
      EMAIL_INSTITUCIONAL_REGEX.test(cleanIdentifier)
    const esIdentificadorNumerico =
      NUMERIC_REGEX.test(cleanIdentifier)

    if (!esInstitucional && !esIdentificadorNumerico) {
      setError('Ingrese un correo institucional válido.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('http://localhost:8200/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: cleanIdentifier,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Credenciales inválidas')
      }

      localStorage.setItem('auth_token', data.token)
      onLoginSuccess(data.user.rol)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Error al procesar el inicio de sesión.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-[980px] mx-auto bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl flex flex-col lg:flex-row font-sans">

      {/* Header móvil */}
      <div className="lg:hidden flex items-center px-6 py-4 border-b-2 border-sci-cyan bg-white">
        <div className="flex items-center gap-2.5">
          <SciLogoIcon className="h-10 w-auto" />

          <div className="leading-tight">
            <span className="block font-black text-xl text-sci-blue tracking-tight">
              SCI
            </span>

            <span className="block text-[10px] text-sci-muted font-semibold">
              SISTEMA DE CONTROL DE INGRESO
            </span>
          </div>
        </div>
      </div>

      {/* Información institucional */}
      <LoginBranding />

      {/* Formulario de acceso */}
      <div className="w-full lg:w-[54%] p-7 sm:p-10 lg:p-12 xl:p-14 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto">

          {/* Encabezado */}
          <div className="mb-8">
            <span className="text-[11px] font-bold text-sci-cyan uppercase tracking-wider">
              Bienvenido a SCI
            </span>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-sci-blue mt-1">
              Iniciar sesión
            </h2>

            <p className="text-sm text-sci-muted mt-2 leading-5">
              Ingresa tus credenciales institucionales para acceder al sistema.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 text-sci-red text-xs rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Correo */}
            <div className="space-y-2 text-left">
              <Label
                htmlFor="login-email"
                className="text-xs font-semibold text-sci-dark"
              >
                Correo institucional
              </Label>

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />

                <Input
                  id="login-email"
                  type="text"
                  required
                  placeholder="Ingresa tu correo institucional"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-11 text-sm text-sci-dark bg-white border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-sky-500/20 focus-visible:border-sky-500"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-2 text-left">
              <Label
                htmlFor="login-pass"
                className="text-xs font-semibold text-sci-dark"
              >
                Contraseña
              </Label>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />

                <Input
                  id="login-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-11 pr-11 text-sm text-sci-dark bg-white border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-sky-500/20 focus-visible:border-sky-500"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-sci-blue transition-colors focus:outline-none"
                  aria-label={
                    showPassword
                      ? 'Ocultar contraseña'
                      : 'Ver contraseña'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" strokeWidth={1.8} />
                  ) : (
                    <Eye className="w-5 h-5" strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            {/* Recuperar contraseña */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs font-semibold text-sci-blue hover:text-sky-600 hover:underline transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Ingresar */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-sci-blue hover:bg-[#064582] text-white font-bold text-sm rounded-xl shadow-md shadow-sci-blue/15 transition-all active:scale-[0.99]"
            >
              {isSubmitting
                ? 'Verificando credenciales...'
                : 'Ingresar a SCI'}
            </Button>

          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginView
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { LoginBranding } from './login/LoginBranding'

interface LoginViewProps {
  onLoginSuccess: (role: string) => void
  onForgotPassword: () => void
}

// Dominios oficiales institucionales (o gmail si aplica a la HU)
const EMAIL_INSTITUCIONAL_REGEX =
  /^[a-zA-Z0-9._%+-]+@(est\.umss\.edu|fcyt\.umss\.edu\.bo|gmail\.com)$/i
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
    const esInstitucional = EMAIL_INSTITUCIONAL_REGEX.test(cleanIdentifier)
    const esIdentificadorNumerico = NUMERIC_REGEX.test(cleanIdentifier)

    if (!esInstitucional && !esIdentificadorNumerico) {
      setError(
        'Ingrese un correo institucional válido (@fcyt.umss.edu.bo o @est.umss.edu).'
      )
      return
    }

    setIsSubmitting(true)

    try {
      const data = await authService.login(cleanIdentifier, password)
      onLoginSuccess(data.user.rol)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('No se pudo procesar el inicio de sesión.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-[980px] mx-auto bg-card rounded-3xl overflow-hidden border border-border shadow-xl flex flex-col md:flex-row font-sans text-card-foreground">
      {/* Panel izquierdo institucional */}
      <div className="hidden md:flex md:w-[46%]">
        <LoginBranding />
      </div>

      {/* Formulario de acceso */}
      <div className="w-full md:w-[54%] p-6 sm:p-10 lg:p-12 xl:p-14 flex flex-col justify-center bg-card">
        <div className="max-w-md w-full mx-auto">
          {/* Encabezado */}
          <div className="mb-6 sm:mb-8 text-left">
            <span className="text-[11px] font-bold text-sci-cyan uppercase tracking-wider">
              Bienvenido a SCI
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-sci-navy mt-1 tracking-tight">
              Iniciar sesión
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-5">
              Ingresa tus credenciales institucionales para acceder al sistema.
            </p>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="mb-5 px-4 py-3 bg-sci-red/10 border border-sci-red/20 text-sci-red text-xs font-semibold rounded-xl text-left">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Campo Correo */}
            <div className="space-y-1.5 sm:space-y-2 text-left">
              <Label
                htmlFor="login-email"
                className="text-xs font-semibold text-foreground"
              >
                Correo institucional
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="text"
                  required
                  placeholder="ejemplo@fcyt.umss.edu.bo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-10 text-sm bg-background border-input rounded-xl"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-1.5 sm:space-y-2 text-left">
              <Label
                htmlFor="login-pass"
                className="text-xs font-semibold text-foreground"
              >
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-pass"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-10 pr-10 text-sm bg-background border-input rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={
                    showPassword ? 'Ocultar contraseña' : 'Ver contraseña'
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Enlace Olvidaste tu contraseña */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs font-semibold text-sci-blue hover:text-sci-navy hover:underline transition-colors cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Botón Ingresar */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-sci-blue hover:opacity-90 text-white font-bold text-sm rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {isSubmitting ? 'Verificando credenciales...' : 'Ingresar a SCI'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginView
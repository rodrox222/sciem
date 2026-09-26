import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { SciLogoIcon } from './ui/SciLogoIcon'

interface LoginViewProps {
  onLoginSuccess: (role: string) => void
  onForgotPassword: () => void
}

// Dominios oficiales institucionales o número para administradores
const EMAIL_INSTITUCIONAL_REGEX = /^[a-zA-Z0-9._%+-]+@(est\.umss\.edu|fcyt\.umss\.edu\.bo|gmail\.com)$/i
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
    <div className="w-full max-w-[1020px] bg-white rounded-3xl lg:rounded-2xl shadow-xl border border-sci-border flex flex-col lg:flex-row overflow-hidden relative font-sans mx-auto">
      {/* Barra vertical celeste institucional */}
      <div className="hidden lg:block absolute left-0 top-6 bottom-6 w-1.5 bg-sci-cyan rounded-r-md" />

      {/* Header móvil */}
      <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b-2 border-sci-cyan bg-white">
        <div className="flex items-center gap-2.5">
          <SciLogoIcon className="h-10 w-auto" />
          <div className="leading-tight">
            <span className="font-black text-xl text-sci-blue tracking-tight block">
              SCI
            </span>
            <span className="text-[10px] text-sci-muted font-semibold block -mt-1">
              SISTEMA DE CONTROL INGRESO
            </span>
          </div>
        </div>
      </div>

      {/* Columna Izquierda: Información Institucional */}
      <div className="hidden lg:flex lg:w-[45%] bg-slate-50/50 p-10 flex-col justify-between pl-12 border-r border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <SciLogoIcon className="h-14 w-auto" />
            <div>
              <h1 className="font-extrabold text-2xl text-sci-blue tracking-tight leading-none">
                SCI
              </h1>
              <span className="text-[10px] text-sci-muted font-semibold tracking-wider block mt-1">
                SISTEMA DE CONTROL INGRESO
              </span>
            </div>
          </div>

          <div className="mt-8 inline-block px-3.5 py-1 bg-sky-50 text-sci-cyan text-[11px] font-semibold rounded-full border border-sky-100 tracking-wide">
            ACCESO INSTITUCIONAL
          </div>

          <h2 className="text-3xl font-bold text-sci-blue mt-4 leading-snug">
            Gestión segura de evaluaciones académicas.
          </h2>
          <p className="text-xs text-sci-muted mt-3 leading-relaxed">
            Ingresa tus credenciales institucionales asignadas para acceder a la plataforma.
          </p>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-sci-border flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xs font-bold text-sci-dark block">Sesión protegida</span>
            <span className="text-[10px] text-sci-muted block leading-tight">
              Control de acceso activo y trazabilidad por roles
            </span>
          </div>
        </div>
      </div>

      {/* Columna Derecha */}
      <div className="w-full lg:w-[55%] p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
        <span className="text-[11px] font-bold text-sci-cyan tracking-wider uppercase block">
          BIENVENIDO A SCI
        </span>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-sci-blue mt-1">
          Iniciar sesión
        </h3>
        <p className="text-xs text-sci-muted mt-1 mb-8">
          Ingresa tus credenciales institucionales para ingresar al sistema.
        </p>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border-l-4 border-sci-red text-sci-red text-xs rounded-xl flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
          <div className="space-y-1.5 text-left">
            <Label htmlFor="login-email" className="text-xs font-medium text-sci-dark">
              Correo institucional
            </Label>
            <Input
              id="login-email"
              name="login-email"
              type="text"
              required
              autoComplete="off"
              placeholder="ingrese correo institucional"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 text-sm text-sci-dark bg-white border-sci-border rounded-xl focus-visible:ring-sci-blue"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <Label htmlFor="login-pass" className="text-xs font-medium text-sci-dark">
              Contraseña
            </Label>
            <div className="relative">
              <Input
                id="login-pass"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-sm text-sci-dark bg-white border-sci-border rounded-xl pr-11 focus-visible:ring-sci-blue"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-sci-blue transition-colors focus:outline-none"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 stroke-[1.8]" />
                ) : (
                  <Eye className="w-5 h-5 stroke-[1.8]" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end text-xs pt-1">
            <button
              type="button"
              onClick={onForgotPassword}
              className="font-medium text-sci-blue hover:underline text-[11px] sm:text-xs"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-sci-blue hover:bg-[#002852] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-sci-blue/15 mt-2 transition-all"
          >
            {isSubmitting ? 'Verificando credenciales...' : 'Ingresar a SCI'}
          </Button>

          <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sci-muted text-[11px] mt-4">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Acceso seguro mediante autenticación de token centralizada.</span>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginView
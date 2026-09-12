import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ShieldCheck, Info, MailCheck, ArrowLeft, CheckCircle2 } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8200/api'

interface ForgotPasswordProps {
  onBackToLogin?: () => void
  onSuccess?: () => void
}

export const ForgotPasswordView: React.FC<ForgotPasswordProps> = ({
  onBackToLogin,
  onSuccess,
}) => {
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token') || ''
  const emailFromUrl = searchParams.get('email') || ''

  // Si viene token por URL desde el correo, arranca directo en 'reset'. Si no, en 'request'.
  const [step, setStep] = useState<'request' | 'sent' | 'reset'>(
    tokenFromUrl ? 'reset' : 'request'
  )

  const [email, setEmail] = useState(emailFromUrl)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (tokenFromUrl) {
      setStep('reset')
      if (emailFromUrl) setEmail(emailFromUrl)
    }
  }, [tokenFromUrl, emailFromUrl])

  // 1. Envío de solicitud de enlace al correo
  const handleRequestSubmit = async (e: React.SubmitEvent) => {
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
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.errors?.email?.[0] || data.message || 'No se pudo procesar la solicitud.')
      }

      // NO cambiamos a 'reset'. Cambiamos a la pantalla de confirmación de envío:
      setStep('sent')
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

  // 2. Definición de nueva contraseña tras abrir el correo
  const handleResetSubmit = async (e: React.SubmitEvent) => {
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
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
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
          'El enlace ha expirado o es inválido. Vuelve a solicitar uno nuevo.'
        )
      }

      if (onSuccess) {
        onSuccess()
      } else if (onBackToLogin) {
        onBackToLogin()
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Error al procesar la actualización de contraseña.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col justify-between font-sans">
      {/* Franja Superior Institucional */}
      <div className="w-full bg-[#003770] text-white px-4 sm:px-8 py-2 flex justify-between items-center text-xs">
        <span className="font-semibold tracking-wide truncate">
          FCyT - UNIVERSIDAD MAYOR DE SAN SIMÓN
        </span>
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-slate-200 hover:text-white underline text-xs transition-colors shrink-0 ml-2"
        >
          Volver al login
        </button>
      </div>

      {/* Contenedor Central */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[980px] bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Columna Izquierda: Banner Institucional */}
          <div className="hidden lg:flex lg:w-[38%] bg-white p-10 flex-col justify-between border-r border-slate-100 relative">
            <div className="absolute left-0 top-8 bottom-8 w-1.5 bg-[#003770] rounded-r" />

            <div>
              <div className="flex items-center gap-3">
                <img
                  src="/logo%20SSO.svg"
                  alt="SCI Logo"
                  className="h-14 w-auto object-contain"
                />
                <div>
                  <h1 className="font-bold text-2xl text-[#003770] tracking-tight leading-none">
                    SCI
                  </h1>
                  <span className="text-[10px] text-slate-400 font-semibold tracking-widest block mt-0.5">
                    SISTEMA DE CONTROL INGRESO
                  </span>
                </div>
              </div>

              <div className="mt-8 inline-block px-3 py-1 bg-blue-50 text-[#003770] text-[11px] font-semibold rounded-full border border-blue-100">
                SEGURIDAD DE CUENTA
              </div>

              <h2 className="text-2xl font-bold text-[#003770] mt-4 leading-snug">
                Recuperación y acceso protegido.
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Protegemos la integridad y trazabilidad de tus evaluaciones académicas y credenciales institucionales.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-800 block">Canal verificado</span>
                <span className="text-[10px] text-slate-400">Validación con servidor API UMSS</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha */}
          <div className="w-full lg:w-[62%] p-6 sm:p-10 flex flex-col justify-center">
            <span className="text-[11px] font-bold text-[#003770] tracking-wider uppercase block">
              GESTIÓN DE ACCESO
            </span>

            {/* PASO 1: Formulario para ingresar correo */}
            {step === 'request' && (
              <>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  Recuperar contraseña
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-6">
                  Ingresa tu correo institucional registrado para recibir el enlace de recuperación.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border-l-4 border-[#E30613] text-[#E30613] text-xs rounded">
                    {error}
                  </div>
                )}

                <form onSubmit={handleRequestSubmit} className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <Label htmlFor="req-email" className="text-xs font-semibold text-slate-700">
                      Correo institucional
                    </Label>
                    <Input
                      id="req-email"
                      type="email"
                      required
                      placeholder="usuario@est.umss.edu o docente@umss.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 text-sm focus-visible:ring-[#003770]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-[#003770] hover:bg-[#002852] text-white font-semibold text-sm shadow-md mt-2"
                  >
                    {isSubmitting ? 'Enviando correo...' : 'Enviar enlace de recuperación'}
                  </Button>

                  <Alert className="bg-sky-50/70 border-sky-100 text-slate-600 mt-4 py-2.5">
                    <Info className="h-4 w-4 text-[#00A3E0]" />
                    <AlertDescription className="text-[11px] leading-tight ml-2">
                      Si no tienes acceso a tu buzón institucional, contacta a soporte técnico de la facultad.
                    </AlertDescription>
                  </Alert>
                </form>
              </>
            )}

            {/* PASO 2: Confirmación de envío (El usuario va a su bandeja de entrada) */}
            {step === 'sent' && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 bg-blue-50 text-[#003770] rounded-full flex items-center justify-center mx-auto mb-2">
                  <MailCheck className="w-8 h-8" />
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900">
                  Revisa tu correo institucional
                </h3>
                
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Si el correo <strong className="text-slate-800">{email}</strong> está registrado en el sistema, recibirás un mensaje con un botón seguro para restablecer tu acceso.
                </p>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 max-w-md mx-auto text-left">
                  El enlace expira en 60 minutos. Revisa también tu carpeta de spam o correo no deseado.
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('request')}
                    className="text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Reenviar a otro correo
                  </Button>
                  <Button
                    type="button"
                    onClick={onBackToLogin}
                    className="bg-[#003770] hover:bg-[#002852] text-white text-xs"
                  >
                    Volver al login
                  </Button>
                </div>
              </div>
            )}

            {/* PASO 3: Nueva contraseña (Solo cuando entra con el enlace del correo) */}
            {step === 'reset' && (
              <>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  Crear nueva contraseña
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-6">
                  Define tu nueva credencial de acceso institucional.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border-l-4 border-[#E30613] text-[#E30613] text-xs rounded">
                    {error}
                  </div>
                )}

                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <Label className="text-xs font-semibold text-slate-700">
                      Cuenta a restablecer
                    </Label>
                    <Input
                      type="text"
                      disabled
                      value={email}
                      className="h-10 text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <Label htmlFor="new-pass" className="text-xs font-semibold text-slate-700">
                      Nueva contraseña
                    </Label>
                    <Input
                      id="new-pass"
                      type="password"
                      required
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 text-sm focus-visible:ring-[#003770]"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <Label htmlFor="confirm-pass" className="text-xs font-semibold text-slate-700">
                      Confirmar nueva contraseña
                    </Label>
                    <Input
                      id="confirm-pass"
                      type="password"
                      required
                      placeholder="Repite tu nueva contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-10 text-sm focus-visible:ring-[#003770]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-[#003770] hover:bg-[#002852] text-white font-semibold text-sm shadow-md mt-2"
                  >
                    {isSubmitting ? 'Guardando...' : 'Restablecer y acceder'}
                  </Button>
                </form>
              </>
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
      </div>

      <footer className="text-center py-4 text-xs text-slate-400">
        © 2026 SCI - Universidad Mayor de San Simón · Todos los derechos reservados.
      </footer>
    </div>
  )
}
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, ShieldCheck } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8200/api'

type RoleType = 'auxiliar' | 'docente' | 'admin'

interface LoginViewProps {
  onLoginSuccess?: (role: string) => void
  onForgotPassword?: () => void
}

const ROLES_DATA: Record<RoleType, { label: string; email: string; initial: string; badgeBg: string; textColor: string }> = {
  auxiliar: {
    label: 'Auxiliar',
    email: 'auxiliar@est.umss.edu',
    initial: 'A',
    badgeBg: 'bg-sky-100',
    textColor: 'text-[#00A3E0]',
  },
  docente: {
    label: 'Docente',
    email: 'docente@fcyt.umss.edu',
    initial: 'D',
    badgeBg: 'bg-blue-100',
    textColor: 'text-[#003770]',
  },
  admin: {
    label: 'Administrador',
    email: 'admin@fcyt.umss.edu',
    initial: 'A',
    badgeBg: 'bg-rose-100',
    textColor: 'text-[#E30613]',
  },
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onForgotPassword,
}) => {
  const [selectedRole, setSelectedRole] = useState<RoleType>('auxiliar')
  const [email, setEmail] = useState(ROLES_DATA.auxiliar.email)
  const [password, setPassword] = useState('password123')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRoleSelect = (role: RoleType) => {
    setSelectedRole(role)
    setEmail(ROLES_DATA[role].email)
    setError(null)
  }

  const handleSubmit = async (e: React.SubmitEvent) => {
    

    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
            email: email.trim(),
            password,
            role: ROLES_DATA[selectedRole].label,
            }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMsg =
            data.errors?.role?.[0] || 
            data.errors?.email?.[0] ||
            data.errors?.password?.[0] ||
            data.message ||
            'Credenciales inválidas.'
        throw new Error(errorMsg)
        }

      // 1. Guardar token Sanctum y datos de sesión en localStorage
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user_data', JSON.stringify(data.user))
      localStorage.setItem('user_role', data.user.rol)

      // 2. Notificar al enrutador para redirigir a /dashboard
      if (onLoginSuccess) {
        onLoginSuccess(data.user.rol)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('No se pudo establecer conexión con el servidor.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col justify-between font-sans">
      {/* 1. Franja Superior Institucional */}
      <div className="w-full bg-[#003770] text-white px-4 sm:px-8 py-2 flex justify-between items-center text-xs">
        <span className="font-semibold tracking-wide truncate">
          FCyT - UNIVERSIDAD MAYOR DE SAN SIMÓN
        </span>
        <button
          type="button"
          className="text-slate-200 hover:text-white text-xs transition-colors shrink-0"
        >
          Volver al portal público
        </button>
      </div>

      {/* 2. Contenedor Central */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[980px] bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Columna Izquierda: Banner Institucional (Desktop) */}
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
                ACCESO INSTITUCIONAL
              </div>

              <h2 className="text-2xl font-bold text-[#003770] mt-4 leading-snug">
                Gestión segura de evaluaciones académicas.
              </h2>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                Accede a las herramientas asignadas a tu perfil dentro del Sistema de Control Institucional.
              </p>
            </div>

            {/* Badge de Seguridad */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-800 block">Sesión protegida</span>
                <span className="text-[11px] text-slate-400">Control de acceso y trazabilidad por roles</span>
              </div>
            </div>
          </div>

          {/* Cabecera Móvil */}
          <div className="lg:hidden p-6 pb-2 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo%20SSO.svg"
                alt="SCI Logo"
                className="h-10 w-auto object-contain"
              />
              <span className="font-bold text-xl text-[#003770]">SCI</span>
            </div>
            <span className="text-xs border border-blue-200 text-[#003770] px-3 py-1 rounded-full font-medium">
              Acceso
            </span>
          </div>

          {/* Columna Derecha: Formulario */}
          <div className="w-full lg:w-[62%] p-6 sm:p-10 flex flex-col justify-center">
            
            <span className="text-[11px] font-bold text-[#003770] tracking-wider uppercase block">
              BIENVENIDO A SCI
            </span>

            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              Iniciar sesión
            </h3>
            
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Selecciona tu rol e ingresa con tus credenciales institucionales.
            </p>

            {/* Mensaje de error dinámico devuelto por Laravel */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-[#E30613] text-[#E30613] text-xs rounded">
                {error}
              </div>
            )}

            {/* Selector de Roles usando Cards de shadcn */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-6">
              {(Object.keys(ROLES_DATA) as RoleType[]).map((roleKey) => {
                const role = ROLES_DATA[roleKey]
                const isSelected = selectedRole === roleKey

                return (
                  <Card
                    key={roleKey}
                    onClick={() => handleRoleSelect(roleKey)}
                    className={`cursor-pointer transition-all border text-center p-3 sm:p-4 rounded-xl shadow-none flex flex-col items-center justify-center ${
                      isSelected
                        ? 'border-[#003770] ring-1 ring-[#003770] bg-blue-50/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <CardContent className="p-0 flex flex-col items-center gap-2">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${role.badgeBg} flex items-center justify-center font-bold text-sm ${role.textColor}`}>
                        {role.initial}
                      </div>
                      <span className={`text-xs font-semibold ${isSelected ? 'text-[#003770]' : 'text-slate-700'}`}>
                        {role.label}
                      </span>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Correo institucional
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@umss.edu"
                  className="h-10 text-sm focus-visible:ring-[#003770]"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 text-sm focus-visible:ring-[#003770]"
                />
              </div>

              {/* Recordar sesión y Olvidé contraseña */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label
                    htmlFor="remember"
                    className="text-xs text-slate-500 font-normal cursor-pointer select-none"
                  >
                    Recordar sesión
                  </Label>
                </div>

                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs font-medium text-[#003770] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Botón Principal shadcn */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#003770] hover:bg-[#002852] text-white font-semibold text-sm shadow-md mt-2"
              >
                {isLoading ? 'Verificando...' : 'Ingresar a SCI'}
              </Button>

              {/* Alerta informativa shadcn */}
              <Alert className="bg-sky-50/70 border-sky-100 text-slate-600 mt-4 py-2.5">
                <Info className="h-4 w-4 text-[#00A3E0]" />
                <AlertDescription className="text-[11px] leading-tight ml-2">
                  Las credenciales de demostración se completan al elegir un rol.
                </AlertDescription>
              </Alert>
            </form>

          </div>
        </div>
      </div>

      {/* 3. Footer inferior */}
      <footer className="text-center py-4 text-xs text-slate-400">
        © 2026 SCI - Universidad Mayor de San Simón · Todos los derechos reservados.
      </footer>
    </div>
  )
}
import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Info } from 'lucide-react'
import logoSSO from '../assets/logo SSO.svg'
import { useLogin, type Role } from '../hooks/useLogin'

interface LoginViewProps {
  onLoginSuccess: (role: string) => void
  onForgotPassword: () => void
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onForgotPassword,
}) => {
  const {
    selectedRole,
    handleRoleSelect,
    email,
    setEmail,
    password,
    setPassword,
    error,
    isSubmitting,
    handleSubmit,
  } = useLogin({
    onSuccess: (role) => onLoginSuccess(role),
  })

  return (
    <div className="w-full max-w-[1020px] bg-white rounded-3xl lg:rounded-2xl shadow-xl border border-sci-border flex flex-col lg:flex-row overflow-hidden relative font-sans mx-auto">
      {/* Barra vertical celeste institucional (solo escritorio) */}
      <div className="hidden lg:block absolute left-0 top-6 bottom-6 w-1.5 bg-sci-cyan rounded-r-md" />

      {/* Header móvil */}
      <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b-2 border-sci-cyan bg-white">
        <div className="flex items-center gap-2.5">
          <img
            src={logoSSO}
            alt="SCI Logo"
            className="h-10 w-auto object-contain"
          />
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

      {/* Columna Izquierda: Información Institucional (solo escritorio) */}
      <div className="hidden lg:flex lg:w-[40%] bg-white p-10 flex-col justify-between pl-12">
        <div>
          <div className="flex items-center gap-3">
            <img
              src={logoSSO}
              alt="Logo SCI"
              className="h-14 w-auto object-contain"
            />
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
            Accede a las herramientas asignadas a tu perfil dentro del Sistema de Control Ingreso.
          </p>
        </div>

        <div className="p-3.5 bg-sci-bg rounded-xl border border-sci-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-100/60 text-sci-cyan flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-sci-cyan stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xs font-bold text-sci-dark block">Sesión protegida</span>
            <span className="text-[10px] text-sci-muted block leading-tight">
              Control de acceso y trazabilidad por roles
            </span>
          </div>
        </div>
      </div>

      {/* Columna Derecha / Formulario Principal */}
      <div className="w-full lg:w-[60%] p-6 sm:p-10 lg:p-12 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-sci-border">
        <span className="text-[11px] font-bold text-sci-cyan tracking-wider uppercase block">
          BIENVENIDO A SCI
        </span>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-sci-blue mt-1">
          Iniciar sesión
        </h3>
        <p className="text-xs text-sci-muted mt-1 mb-6">
          Selecciona tu rol e ingresa con tus credenciales.
        </p>

        {/* Selector de Roles optimizado para móvil (diseño en tarjetas con ícono centrado arriba) */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6">
          {/* Auxiliar */}
          <button
            type="button"
            onClick={() => handleRoleSelect('Auxiliar')}
            className={`py-4 px-2 sm:py-3.5 sm:px-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
              selectedRole === 'Auxiliar'
                ? 'border-sci-blue bg-blue-50/20 ring-2 ring-sci-blue shadow-xs'
                : 'border-sci-border bg-white hover:border-slate-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sci-cyan flex items-center justify-center font-bold text-sm">
              A
            </div>
            <span className={`text-xs font-bold ${selectedRole === 'Auxiliar' ? 'text-sci-blue' : 'text-sci-muted'}`}>
              Auxiliar
            </span>
          </button>

          {/* Docente */}
          <button
            type="button"
            onClick={() => handleRoleSelect('Docente')}
            className={`py-4 px-2 sm:py-3.5 sm:px-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
              selectedRole === 'Docente'
                ? 'border-sci-blue bg-blue-50/20 ring-2 ring-sci-blue shadow-xs'
                : 'border-sci-border bg-white hover:border-slate-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-sci-blue flex items-center justify-center font-bold text-sm">
              D
            </div>
            <span className={`text-xs font-bold ${selectedRole === 'Docente' ? 'text-sci-blue' : 'text-sci-muted'}`}>
              Docente
            </span>
          </button>

          {/* Administrador (Admin en móvil) */}
          <button
            type="button"
            onClick={() => handleRoleSelect('Administrador')}
            className={`py-4 px-2 sm:py-3.5 sm:px-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
              selectedRole === 'Administrador'
                ? 'border-sci-blue bg-blue-50/20 ring-2 ring-sci-blue shadow-xs'
                : 'border-sci-border bg-white hover:border-slate-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-sci-red flex items-center justify-center font-bold text-sm">
              A
            </div>
            <span className={`text-xs font-bold ${selectedRole === 'Administrador' ? 'text-sci-blue' : 'text-sci-muted'}`}>
              <span className="sm:hidden">Admin</span>
              <span className="hidden sm:inline">Administrador</span>
            </span>
          </button>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-sci-red text-sci-red text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <Label htmlFor="login-email" className="text-xs font-medium text-sci-dark">
              Correo institucional
            </Label>
            <Input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 text-xs text-sci-dark bg-white border-sci-border rounded-xl focus-visible:ring-sci-blue"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <Label htmlFor="login-pass" className="text-xs font-medium text-sci-dark">
              Contraseña
            </Label>
            <Input
              id="login-pass"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 text-xs text-sci-dark bg-white border-sci-border rounded-xl focus-visible:ring-sci-blue"
            />
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
            className="w-full h-12 bg-sci-blue hover:bg-[#002852] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-sci-blue/15 mt-2"
          >
            {isSubmitting ? 'Verificando...' : 'Ingresar a SCI'}
          </Button>

          <div className="flex items-center gap-2.5 px-4 py-3.5 bg-sky-50/70 rounded-xl border border-sky-100 text-sci-muted text-[11px] mt-4">
            <Info className="w-4 h-4 text-sci-cyan shrink-0" />
            <span>Credenciales de demostración precargadas.</span>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginView
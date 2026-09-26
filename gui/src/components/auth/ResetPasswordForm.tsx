import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

interface ResetPasswordFormProps {
  email: string
  password: string
  confirmPassword: string
  setPassword: (val: string) => void
  setConfirmPassword: (val: string) => void
  error: string | null
  isSubmitting: boolean
  onSubmit: (e: React.FormEvent) => void
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  email,
  password,
  confirmPassword,
  setPassword,
  setConfirmPassword,
  error,
  isSubmitting,
  onSubmit,
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <>
      <h3 className="text-2xl font-bold text-slate-900 mt-1">Crear nueva contraseña</h3>
      <p className="text-xs text-slate-500 mt-1 mb-6">Define tu nueva credencial.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-[#E30613] text-[#E30613] text-xs rounded">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} autoComplete="off" className="space-y-4">
        <div className="space-y-1.5 text-left">
          <Label className="text-xs font-semibold text-slate-700">Cuenta a restablecer</Label>
          <Input 
            type="text" 
            disabled 
            value={email} 
            className="h-10 text-sm bg-slate-100 text-slate-500 cursor-not-allowed" 
          />
        </div>

        {/* Campo Nueva Contraseña */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="new-pass" className="text-xs font-semibold text-slate-700">Nueva contraseña</Label>
          <div className="relative">
            <Input
              id="new-pass"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 text-sm pr-10 focus-visible:ring-[#003770]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-[#003770] transition-colors focus:outline-none"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 stroke-[1.8]" />
              ) : (
                <Eye className="w-4 h-4 stroke-[1.8]" />
              )}
            </button>
          </div>
        </div>

        {/* Campo Confirmar Contraseña */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="confirm-pass" className="text-xs font-semibold text-slate-700">Confirmar nueva contraseña</Label>
          <div className="relative">
            <Input
              id="confirm-pass"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Repite tu nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-10 text-sm pr-10 focus-visible:ring-[#003770]"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-[#003770] transition-colors focus:outline-none"
              aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4 stroke-[1.8]" />
              ) : (
                <Eye className="w-4 h-4 stroke-[1.8]" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 bg-[#003770] hover:bg-[#002852] text-white font-semibold text-sm shadow-md mt-2 transition-all"
        >
          {isSubmitting ? 'Guardando...' : 'Restablecer y acceder'}
        </Button>
      </form>
    </>
  )
}
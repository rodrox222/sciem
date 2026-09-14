import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
}) => (
  <>
    <h3 className="text-2xl font-bold text-slate-900 mt-1">Crear nueva contraseña</h3>
    <p className="text-xs text-slate-500 mt-1 mb-6">Define tu nueva credencial de acceso institucional.</p>

    {error && (
      <div className="mb-4 p-3 bg-red-50 border-l-4 border-[#E30613] text-[#E30613] text-xs rounded">
        {error}
      </div>
    )}

    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5 text-left">
        <Label className="text-xs font-semibold text-slate-700">Cuenta a restablecer</Label>
        <Input type="text" disabled value={email} className="h-10 text-sm bg-slate-100 text-slate-500 cursor-not-allowed" />
      </div>

      <div className="space-y-1.5 text-left">
        <Label htmlFor="new-pass" className="text-xs font-semibold text-slate-700">Nueva contraseña</Label>
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
        <Label htmlFor="confirm-pass" className="text-xs font-semibold text-slate-700">Confirmar nueva contraseña</Label>
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
)
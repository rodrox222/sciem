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
      <h3 className="text-2xl font-bold text-sci-navy mt-1 tracking-tight">
        Crear nueva contraseña
      </h3>
      <p className="text-xs text-muted-foreground mt-1 mb-6">
        Define tu nueva credencial de acceso institucional.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-sci-red/10 border border-sci-red/20 text-sci-red text-xs font-semibold rounded-xl text-left">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} autoComplete="off" className="space-y-4">
        {/* Cuenta a restablecer */}
        <div className="space-y-1.5 text-left">
          <Label className="text-xs font-semibold text-foreground">
            Cuenta a restablecer
          </Label>
          <Input
            type="text"
            disabled
            value={email}
            className="h-11 text-sm bg-muted text-muted-foreground cursor-not-allowed rounded-xl"
          />
        </div>

        {/* Campo Nueva Contraseña */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="new-pass" className="text-xs font-semibold text-foreground">
            Nueva contraseña
          </Label>
          <div className="relative">
            <Input
              id="new-pass"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 pr-10 text-sm bg-background border-input rounded-xl"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Campo Confirmar Contraseña */}
        <div className="space-y-1.5 text-left">
          <Label htmlFor="confirm-pass" className="text-xs font-semibold text-foreground">
            Confirmar nueva contraseña
          </Label>
          <div className="relative">
            <Input
              id="confirm-pass"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="Repite tu nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11 pr-10 text-sm bg-background border-input rounded-xl"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Botón Guardar */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 bg-sci-blue hover:opacity-90 text-white font-bold text-sm shadow-xs rounded-xl mt-2 cursor-pointer"
        >
          {isSubmitting ? 'Guardando...' : 'Restablecer y acceder'}
        </Button>
      </form>
    </>
  )
}

export default ResetPasswordForm
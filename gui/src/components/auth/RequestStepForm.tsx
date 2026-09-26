import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

interface RequestStepFormProps {
  email: string
  setEmail: (val: string) => void
  error: string | null
  isSubmitting: boolean
  onSubmit: (e: React.FormEvent) => void
}

export const RequestStepForm: React.FC<RequestStepFormProps> = ({
  email,
  setEmail,
  error,
  isSubmitting,
  onSubmit,
}) => (
  <>
    <h3 className="text-2xl font-bold text-slate-900 mt-1">Recuperar contraseña</h3>
    <p className="text-xs text-slate-500 mt-1 mb-6">
      Ingresa tu correo institucional registrado para recibir el enlace de recuperación.
    </p>

    {error && (
      <div className="mb-4 p-3 bg-red-50 border-l-4 border-[#E30613] text-[#E30613] text-xs rounded">
        {error}
      </div>
    )}

    <form onSubmit={onSubmit} autoComplete="off" className="space-y-4">
      <div className="space-y-1.5 text-left">
        <Label htmlFor="req-email" className="text-xs font-semibold text-slate-700">
          Correo institucional
        </Label>
        <Input
          id="req-email"
          name="email_recovery"
          type="email"
          required
          autoComplete="off"
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
)
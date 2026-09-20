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
    <h3 className="text-2xl font-bold text-sci-navy mt-1 tracking-tight">Recuperar contraseña</h3>
    <p className="text-xs text-muted-foreground mt-1 mb-6">
      Ingresa tu correo institucional registrado para recibir el enlace de recuperación.
    </p>

    {error && (
      <div className="mb-4 p-3 bg-sci-red/10 border border-sci-red/20 text-sci-red text-xs font-semibold rounded-xl text-left">
        {error}
      </div>
    )}

    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5 text-left">
        <Label htmlFor="req-email" className="text-xs font-semibold text-foreground">
          Correo institucional
        </Label>
        <Input
          id="req-email"
          type="email"
          required
          placeholder="usuario@fcyt.umss.edu.bo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 text-sm bg-background border-input rounded-xl"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 bg-sci-blue hover:opacity-90 text-white font-bold text-sm shadow-xs rounded-xl mt-2 cursor-pointer"
      >
        {isSubmitting ? 'Enviando correo...' : 'Enviar enlace de recuperación'}
      </Button>

      <Alert className="bg-muted/50 border-border text-muted-foreground mt-4 py-2.5">
        <Info className="h-4 w-4 text-sci-cyan" />
        <AlertDescription className="text-[11px] leading-tight ml-2">
          Si no tienes acceso a tu buzón institucional, contacta a soporte técnico de la facultad.
        </AlertDescription>
      </Alert>
    </form>
  </>
)
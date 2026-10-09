import React, { useState } from 'react'
import { Clock, Save, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { configService } from '@/services/config.service'

export const ConfiguracionPage: React.FC = () => {
  const [minutes, setMinutes] = useState<number>(configService.getTimeoutMinutes())
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    configService.setTimeoutMinutes(minutes)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
          Parámetros del Sistema
        </span>
        <h1 className="mt-1 text-2xl font-extrabold text-sci-navy sm:text-3xl tracking-tight">
          Configuración General
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajusta los tiempos de seguridad y políticas de sesión para todos los usuarios.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-start gap-4 pb-6 border-b border-border">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sci-amber/15 text-sci-amber">
              <Clock className="h-6 w-6" />
            </span>
            <div className="flex-1 space-y-1">
              <label htmlFor="timeout" className="text-sm font-bold text-sci-navy">
                Tiempo de inactividad de sesión
              </label>
              <p className="text-xs text-muted-foreground">
                Define cuántos minutos de inactividad deben transcurrir antes de advertir al usuario y cerrar su sesión de forma automática.
              </p>
              
              <div className="pt-3 flex items-center gap-3">
                <input
                  id="timeout"
                  type="number"
                  min={1}
                  max={120}
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-center text-sci-navy focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-medium text-muted-foreground">minutos</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saved ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Configuración guardada exitosamente
              </span>
            ) : <span />}

            <Button type="submit" className="gap-2 font-semibold">
              <Save className="h-4 w-4" /> Guardar cambios
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ConfiguracionPage
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useIdleTimer } from '../hooks/useIdleTimer'

export const IdleTimer: React.FC = () => {
  const { showModal, secondsRemaining, handleLogout, handleStayActive } = useIdleTimer()
  const [offlineReal, setOfflineReal] = useState<boolean>(false)

  // Verificación constante y real de conexión
  useEffect(() => {
    let montado = true

    const verificarConexionReal = async () => {
      // 1. Si el navegador ya dice que no hay red, es seguro que es offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (montado) setOfflineReal(true)
        return
      }

      // 2. Si dice online, comprobamos si realmente alcanza el backend o internet
      try {
        const rawUrl = (import.meta.env.VITE_API_URL?.trim() || 'http://localhost:8200/api') //http://192.168.1.17:8200
          .replace(/\/api\/?$/, '')
          .replace(/\/$/, '')

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 1200)

        // Petición rápida tipo ping
        await fetch(`${rawUrl}/api/health`, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
          cache: 'no-store',
        })

        clearTimeout(timeoutId)
        if (montado) setOfflineReal(false)
      } catch {
        // Si falló el fetch o dio timeout, no hay red real con el servidor
        if (montado) setOfflineReal(true)
      }
    }

    void verificarConexionReal()

    // Comprobar cada 2.5 segundos y escuchar eventos
    const intervalo = setInterval(verificarConexionReal, 2500)
    window.addEventListener('offline', () => setOfflineReal(true))
    window.addEventListener('online', verificarConexionReal)

    return () => {
      montado = false
      clearInterval(intervalo)
      window.removeEventListener('offline', () => setOfflineReal(true))
      window.removeEventListener('online', verificarConexionReal)
    }
  }, [])

  // Si no está activo el modal o estamos offline (sin red real), NO se dibuja nada
  if (!showModal || offlineReal) return null

  const formattedSeconds = String(secondsRemaining).padStart(2, '0')
  const progressPercent = (secondsRemaining / 60) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 font-sans">
      <div 
        role="dialog" 
        aria-modal="true" 
        className="w-full max-w-[420px] bg-card text-card-foreground rounded-2xl shadow-2xl border border-border p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="w-20 h-20 rounded-2xl bg-sci-amber/15 border border-sci-amber/30 flex items-center justify-center mb-4">
          <span className="text-sci-amber text-4xl font-extrabold select-none leading-none">
            !
          </span>
        </div>

        <span className="text-[11px] font-bold tracking-wider text-sci-amber uppercase mb-2">
          Seguridad SCI
        </span>

        <h3 className="text-xl sm:text-2xl font-bold text-sci-navy tracking-tight mb-2">
          ¿Sigues trabajando?
        </h3>

        <p className="text-xs text-muted-foreground max-w-[300px] leading-relaxed mb-6">
          Detectamos inactividad prolongada. Tu sesión se cerrará automáticamente por motivos de seguridad.
        </p>

        <div className="w-full max-w-[170px] bg-background rounded-xl py-3 px-4 mb-4 border border-border">
          <div className="text-3xl font-black text-primary tracking-tight font-mono">
            00:{formattedSeconds}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium block mt-0.5">
            segundos restantes
          </span>
        </div>

        <div className="w-full max-w-[260px] h-2 bg-muted rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-sci-amber rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="w-full grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="font-semibold text-xs h-11"
          >
            Cerrar sesión
          </Button>

          <Button
            type="button"
            onClick={handleStayActive}
            className="font-semibold text-xs h-11 shadow-sm"
          >
            Continuar sesión
          </Button>
        </div>
      </div>
    </div>
  )
}

export default IdleTimer
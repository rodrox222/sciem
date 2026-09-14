import React from 'react'
import { Button } from '@/components/ui/button'
import { useIdleTimer } from '../hooks/useIdleTimer'

export const IdleTimer: React.FC = () => {
  const { showModal, secondsRemaining, handleLogout, handleStayActive } = useIdleTimer()

  if (!showModal) return null

  
  const formattedSeconds = String(secondsRemaining).padStart(2, '0')
  // Porcentaje restante para la barra de progreso
  const progressPercent = (secondsRemaining / 60) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 font-sans">
      <div className="w-full max-w-[430px] bg-white rounded-2xl shadow-2xl border-2 border-sci-cyan/30 p-8 flex flex-col items-center text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="w-24 h-24 rounded-2xl bg-amber-50/80 border border-amber-100/60 flex items-center justify-center mb-5">
          <span className="text-amber-500 text-5xl font-extrabold select-none leading-none">
            !
          </span>
        </div>

        <span className="text-[11px] font-bold tracking-wider text-amber-500 uppercase mb-2">
            SEGURIDAD
        </span>

        {/* Título Principal */}
        <h3 className="text-2xl font-black text-sci-blue tracking-tight mb-2">
          ¿Sigues trabajando?
        </h3>

        {/* Descripción */}
        <p className="text-xs text-sci-muted max-w-[300px] leading-relaxed mb-6">
          Detectamos inactividad. Por seguridad, SCI cerrará tu sesión automáticamente si no hay actividad.
        </p>

        {/* Contador Digital */}
        <div className="w-full max-w-[170px] bg-sci-bg rounded-xl py-3 px-4 mb-5 border border-sci-border/60">
          <div className="text-3xl font-black text-sci-blue tracking-tight">
            00:{formattedSeconds}
          </div>
          <span className="text-[10px] text-sci-muted font-medium block mt-0.5">
            segundos restantes
          </span>
        </div>

        {/* Barra de progreso regresiva */}
        <div className="w-full max-w-[280px] h-2 bg-slate-100 rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Acciones */}
        <div className="w-full grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleLogout}
            className="h-11 rounded-xl border border-sci-border text-sci-blue font-bold text-xs hover:bg-slate-50 transition-colors shadow-none"
          >
            Cerrar sesión
          </Button>

          <Button
            type="button"
            onClick={handleStayActive}
            className="h-11 rounded-xl bg-sci-blue hover:bg-[#002852] text-white font-bold text-xs shadow-md shadow-sci-blue/10 transition-colors"
          >
            Continuar sesión
          </Button>
        </div>
      </div>
    </div>
  )
}

export default IdleTimer
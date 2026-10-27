import { useEffect, useState } from 'react'
import { Check, Circle, Radio } from 'lucide-react'
import type { Examen } from '@/services/examenes.service'
import { calcularEtapaExamen } from './calcularEtapaExamen'

const fases = [
  { nombre: 'Pendiente de inicio', estado: 'Programado' },
  { nombre: 'En progreso', estado: 'En proceso' },
  { nombre: 'Finalizado', estado: 'Terminado' },
] as const

export function EtapasExamen({ exam }: { exam: Examen }) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(Date.now()), 15_000)
    return () => window.clearInterval(intervalo)
  }, [])
  const estado = calcularEtapaExamen(exam, new Date(ahora))
  const indiceActual = Math.max(0, fases.findIndex((fase) => fase.estado === estado))

  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4" aria-label={`Etapa del examen según el horario: ${fases[indiceActual].nombre}`}>
      <h3 className="mb-2 text-xs font-bold text-sci-navy sm:text-sm">Etapas del examen <span className="font-normal text-muted-foreground">· según horario programado</span></h3>
      <ol className="grid grid-cols-3 gap-1 sm:gap-3">
        {fases.map((fase, indice) => {
          const completado = indice < indiceActual
          const activo = indice === indiceActual
          return (
            <li key={fase.estado} className="flex min-w-0 flex-col items-center gap-2 text-center">
              <div className="flex w-full items-center">
                <div className={`h-0.5 flex-1 ${indice > 0 && (completado || activo) ? 'bg-sci-cyan' : 'bg-transparent'}`} aria-hidden="true" />
                <div
                  className={`grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors motion-reduce:transition-none ${
                    completado ? 'border-sci-cyan bg-sci-cyan text-white' :
                    activo ? 'border-sci-blue bg-sci-blue text-white' :
                    'border-border bg-muted text-muted-foreground'
                  } ${activo && estado === 'En proceso' ? 'motion-safe:animate-pulse' : ''} ${activo && estado === 'Terminado' ? 'motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-500' : ''}`}
                  aria-hidden="true"
                >
                  {completado ? <Check className="size-4" /> : activo && estado === 'En proceso' ? <Radio className="size-4" /> : <Circle className="size-3" />}
                </div>
                <div className={`h-0.5 flex-1 ${indice < 2 && completado ? 'bg-sci-cyan' : 'bg-transparent'}`} aria-hidden="true" />
              </div>
              <span className={`text-[11px] leading-snug sm:text-xs ${activo ? 'font-bold text-sci-blue' : 'font-medium text-muted-foreground'}`}>
                {fase.nombre}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {completado ? 'Completado' : activo ? 'Etapa actual' : 'Pendiente'}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

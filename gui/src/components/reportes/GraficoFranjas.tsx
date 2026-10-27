import { Clock3 } from 'lucide-react'
import type { FranjaReporte } from '@/services/reportes.service'

export function GraficoFranjas({ franjas, zonaHoraria }: { franjas: FranjaReporte[]; zonaHoraria: string }) {
  const mayor = Math.max(0, ...franjas.map((franja) => franja.total_ingresos))
  const hayIngresos = mayor > 0

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6" aria-labelledby="titulo-franjas">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="titulo-franjas" className="flex items-center gap-2 text-base font-bold text-sci-navy">
            <Clock3 className="h-5 w-5 text-sci-cyan" aria-hidden="true" /> Ingresos por franja horaria
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Horarios según {zonaHoraria} · Franjas de una hora</p>
        </div>
      </div>

      {franjas.length === 0 || !hayIngresos ? (
        <p className="mt-5 rounded-xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
          No se registraron ingresos en las franjas horarias del filtro seleccionado.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-6 gap-x-2 gap-y-5 sm:grid-cols-8 lg:grid-cols-12" aria-hidden="true">
          {franjas.map((franja) => {
            const isMax = franja.total_ingresos === mayor
            const height = franja.total_ingresos > 0 ? Math.max(5, Math.round((franja.total_ingresos / mayor) * 100)) : 0
            return (
              <div key={`${franja.inicio}-${franja.fin}`} className="flex min-w-0 flex-col items-center gap-1">
                <span className={`text-[11px] font-bold tabular-nums ${isMax ? 'text-sci-navy' : 'text-muted-foreground'}`}>{franja.total_ingresos}</span>
                <div className="flex h-20 w-full items-end justify-center border-b border-border">
                  <div className={`w-full max-w-8 rounded-t-md ${isMax ? 'bg-sci-cyan' : 'bg-sci-blue/70'}`} style={{ height: `${height}%` }} />
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground">{franja.inicio}</span>
              </div>
            )
          })}
        </div>
      )}

      <details className="mt-5 border-t border-border pt-4">
        <summary className="cursor-pointer text-xs font-semibold text-sci-blue">Ver todas las franjas y sus cantidades</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {franjas.map((franja) => (
            <div key={`${franja.inicio}-${franja.fin}`} className="flex justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs">
              <span>{franja.inicio}–{franja.fin}</span>
              <strong className="tabular-nums">{franja.total_ingresos} ingresos</strong>
            </div>
          ))}
        </div>
      </details>
    </section>
  )
}

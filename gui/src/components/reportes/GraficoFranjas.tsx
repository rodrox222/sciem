import { Clock3, TrendingUp } from 'lucide-react'
import type { FranjaReporte } from '@/services/reportes.service'

export function GraficoFranjas({ franjas, zonaHoraria }: { franjas: FranjaReporte[]; zonaHoraria: string }) {
  const mayor = Math.max(0, ...franjas.map((franja) => franja.total_ingresos))
  const cantidad = franjas.reduce((total, franja) => total + franja.total_ingresos, 0)
  const conActividad = franjas.filter((franja) => franja.total_ingresos > 0).length
  const horaPico = franjas.find((franja) => franja.total_ingresos === mayor && mayor > 0)

  const ancho = 860
  const izquierda = 45
  const derecha = 20
  const superior = 26
  const base = 187
  const alto = base - superior

  const posicionX = (indice: number) =>
    izquierda + indice * ((ancho - izquierda - derecha) / Math.max(1, franjas.length - 1))
  const posicionY = (valor: number) => base - ((valor / Math.max(1, mayor)) * alto)

  const puntos = franjas.map((franja, indice) => ({
    ...franja,
    x: posicionX(indice),
    y: posicionY(franja.total_ingresos),
  }))
  const linea = puntos.map((punto, indice) => `${indice === 0 ? 'M' : 'L'} ${punto.x} ${punto.y}`).join(' ')
  const area = puntos.length ? `${linea} L ${puntos[puntos.length - 1].x} ${base} L ${puntos[0].x} ${base} Z` : ''

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="titulo-franjas">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sci-cyan">Comportamiento de acceso</p>
          <h3 id="titulo-franjas" className="mt-1 flex items-center gap-2 text-lg font-bold text-sci-navy dark:text-foreground">
            <Clock3 className="size-5 shrink-0 text-sci-cyan" aria-hidden="true" /> Ingresos por franja horaria
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">Datos oficiales · {zonaHoraria} · Intervalos de una hora</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sci-cyan/10 px-3 py-1.5 text-xs font-semibold text-sci-navy dark:text-foreground">
          <TrendingUp className="size-3.5 text-sci-cyan" aria-hidden="true" />
          {cantidad.toLocaleString('es-BO')} registros en franjas
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">Franja de mayor actividad</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-sci-navy dark:text-foreground">
            {horaPico ? `${horaPico.inicio} – ${horaPico.fin}` : 'Sin ingresos'}
          </p>
          <p className="text-[11px] text-muted-foreground">{horaPico ? `${mayor.toLocaleString('es-BO')} ingreso(s)` : 'No hay una franja destacada'}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">Franjas con actividad</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-sci-navy dark:text-foreground">
            {conActividad} <span className="text-sm font-medium text-muted-foreground">de {franjas.length}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">Intervalos con al menos un ingreso</p>
        </div>
      </div>

      {franjas.length === 0 || mayor === 0 ? (
        <div className="mt-5 grid min-h-48 place-items-center rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center text-sm text-muted-foreground">
          No se registraron ingresos en las franjas horarias del filtro seleccionado.
        </div>
      ) : (
        <div className="mt-6 min-w-0">
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-full bg-sci-cyan" /> Distribución horaria
            <span className="ml-auto hidden text-[11px] sm:inline">Desliza para explorar en pantallas pequeñas</span>
          </div>
          <div className="w-full overflow-x-auto rounded-xl bg-sci-navy/[0.025] pb-1 dark:bg-white/5" tabIndex={0} aria-label="Gráfico desplazable de ingresos por hora">
            <svg viewBox={`0 0 ${ancho} 240`} className="h-auto min-w-[680px] w-full" role="img" aria-label={`Ingresos por franja horaria. Máximo de ${mayor} ingresos en ${horaPico?.inicio ?? ''}. Detalle completo disponible debajo.`}>
              <defs>
                <linearGradient id="sciem-franjas-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#168FBD" stopOpacity="0.36" />
                  <stop offset="100%" stopColor="#168FBD" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((proporcion) => {
                const y = base - proporcion * alto
                return (
                  <g key={proporcion}>
                    <line x1={izquierda} y1={y} x2={ancho - derecha} y2={y} stroke="currentColor" strokeOpacity=".1" strokeDasharray={proporcion ? '4 5' : undefined} />
                    <text x={izquierda - 10} y={y + 4} fontSize="11" textAnchor="end" fill="currentColor" opacity=".55">{Number((mayor * proporcion).toFixed(1)).toLocaleString('es-BO')}</text>
                  </g>
                )
              })}
              <path d={area} fill="url(#sciem-franjas-area)" />
              <path d={linea} fill="none" stroke="#168FBD" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
              {puntos.map((punto, indice) => (
                <g key={`${punto.inicio}-${punto.fin}`}>
                  {punto.total_ingresos > 0 && (
                    <circle cx={punto.x} cy={punto.y} r="5" fill="#fff" stroke="#168FBD" strokeWidth="2.5">
                      <title>{`${punto.inicio} a ${punto.fin}: ${punto.total_ingresos} ingresos`}</title>
                    </circle>
                  )}
                  {(indice % 3 === 0 || indice === puntos.length - 1) && (
                    <text x={punto.x} y="221" fontSize="11" textAnchor="middle" fill="currentColor" opacity=".7">{punto.inicio}</text>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      <details className="mt-5 border-t border-border pt-4">
        <summary className="cursor-pointer rounded-md py-1 text-xs font-semibold text-sci-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sci-cyan">
          Ver todas las franjas y sus cantidades
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {franjas.map((franja) => (
            <div key={`${franja.inicio}-${franja.fin}`} className="flex justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs">
              <span>{franja.inicio}–{franja.fin}</span>
              <strong className="tabular-nums">{franja.total_ingresos.toLocaleString('es-BO')} ingresos</strong>
            </div>
          ))}
        </div>
      </details>
    </section>
  )
}

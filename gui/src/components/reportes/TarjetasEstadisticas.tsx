import { BarChart3, Ban, CircleOff, ClipboardList, ShieldAlert, Users } from 'lucide-react'
import type { ResumenReporte } from '@/services/reportes.service'

const indicadores = [
  { clave: 'total_inscritos', texto: 'Total registrados', icono: ClipboardList },
  { clave: 'total_asistentes', texto: 'Asistentes', icono: Users },
  { clave: 'total_ausentes', texto: 'Ausentes', icono: CircleOff },
  { clave: 'intentos_inhabilitados', texto: 'Intentos de inhabilitados', icono: ShieldAlert },
  { clave: 'intentos_no_inscritos', texto: 'Personas ajenas al examen', icono: Ban },
  { clave: 'ingresos_duplicados_bloqueados', texto: 'Doble ingreso bloqueado', icono: BarChart3 },
] as const

export function TarjetasEstadisticas({ resumen }: { resumen: ResumenReporte }) {
  return (
    <section aria-label="Indicadores estadísticos" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {indicadores.map(({ clave, texto, icono: Icon }) => (
        <article key={clave} className="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-sci-cyan/10 text-sci-navy">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>{texto}</span>
          </div>
          <p className="mt-3 text-3xl font-black tabular-nums text-sci-navy">{resumen[clave].toLocaleString('es-BO')}</p>
        </article>
      ))}
    </section>
  )
}

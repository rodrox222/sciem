import { Activity, Ban, ClipboardList, ShieldAlert, UsersRound, UserRoundX } from 'lucide-react'
import type { ResumenReporte } from '@/services/reportes.service'

const indicadores = [
  {
    clave: 'total_inscritos', texto: 'Estudiantes inscritos', descripcion: 'Registrados en el examen',
    icono: ClipboardList, color: 'text-sci-blue', fondo: 'bg-sci-blue/10', borde: 'border-l-sci-blue',
  },
  {
    clave: 'total_asistentes', texto: 'Asistentes', descripcion: 'Ingresos registrados',
    icono: UsersRound, color: 'text-sci-cyan', fondo: 'bg-sci-cyan/10', borde: 'border-l-sci-cyan',
  },
  {
    clave: 'total_ausentes', texto: 'Ausentes', descripcion: 'Sin registro de ingreso',
    icono: UserRoundX, color: 'text-sci-amber', fondo: 'bg-sci-amber/10', borde: 'border-l-sci-amber',
  },
  {
    clave: 'intentos_inhabilitados', texto: 'Intentos de inhabilitados', descripcion: 'Accesos rechazados',
    icono: ShieldAlert, color: 'text-sci-red', fondo: 'bg-sci-red/10', borde: 'border-l-sci-red',
  },
  {
    clave: 'intentos_no_inscritos', texto: 'Personas ajenas al examen', descripcion: 'No inscritas',
    icono: Ban, color: 'text-sci-navy', fondo: 'bg-sci-navy/10', borde: 'border-l-sci-navy',
  },
  {
    clave: 'ingresos_duplicados_bloqueados', texto: 'Doble ingreso bloqueado', descripcion: 'Intentos repetidos',
    icono: Activity, color: 'text-sci-blue', fondo: 'bg-sci-blue/10', borde: 'border-l-sci-blue',
  },
] as const

export function TarjetasEstadisticas({ resumen }: { resumen: ResumenReporte }) {
  return (
    <section aria-label="Indicadores estadísticos oficiales" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {indicadores.map(({ clave, texto, descripcion, icono: Icon, color, fondo, borde }) => (
        <article
          key={clave}
          className={`group relative min-w-0 overflow-hidden rounded-2xl border border-border border-l-4 ${borde} bg-card p-4 shadow-[0_8px_24px_-20px_rgba(0,55,112,0.35)] transition-shadow hover:shadow-md sm:p-5`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">{texto}</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums text-sci-navy dark:text-foreground sm:text-4xl">
                {resumen[clave].toLocaleString('es-BO')}
              </p>
            </div>
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${fondo} ${color}`}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{descripcion}</p>
          <div className={`absolute -bottom-7 -right-7 size-24 rounded-full ${fondo} opacity-40 transition-transform group-hover:scale-110`} aria-hidden="true" />
        </article>
      ))}
    </section>
  )
}

export function BalanceAsistencia({ resumen }: { resumen: ResumenReporte }) {
  const inscritos = resumen.total_inscritos
  const asistentes = resumen.total_asistentes
  const ausentes = resumen.total_ausentes
  const porcentaje = inscritos > 0 ? Math.round((asistentes / inscritos) * 100) : 0
  const segmento = Math.min(100, Math.max(0, porcentaje))
  const formato = (n: number) => n.toLocaleString('es-BO')

  return (
    <section aria-labelledby="balance-asistencia" className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sci-cyan">Distribución</p>
        <h3 id="balance-asistencia" className="mt-1 text-lg font-bold text-sci-navy dark:text-foreground">Balance de asistencia</h3>
        <p className="mt-1 text-xs text-muted-foreground">Proporción de inscritos que registraron ingreso.</p>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div
          role="img"
          aria-label={`Asistencia: ${formato(asistentes)} de ${formato(inscritos)} inscritos, ${porcentaje} por ciento`}
          className="relative grid size-44 shrink-0 place-items-center rounded-full sm:size-52"
          style={{ background: inscritos > 0 ? `conic-gradient(#168FBD 0% ${segmento}%, #E2E8F0 ${segmento}% 100%)` : '#E2E8F0' }}
        >
          <div className="grid size-[75%] place-content-center rounded-full bg-card text-center">
            <span className="text-4xl font-black tracking-tight tabular-nums text-sci-navy dark:text-foreground">{porcentaje}%</span>
            <span className="text-[11px] font-semibold text-muted-foreground">Asistencia</span>
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-3 border-t border-border pt-5">
          <div className="rounded-xl bg-sci-cyan/10 px-3 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-sci-navy dark:text-foreground">
              <span className="size-2.5 rounded-full bg-sci-cyan" /> Asistentes
            </div>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-sci-navy dark:text-foreground">{formato(asistentes)}</p>
          </div>
          <div className="rounded-xl bg-muted/60 px-3 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span className="size-2.5 rounded-full bg-sci-border" /> Ausentes
            </div>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-sci-navy dark:text-foreground">{formato(ausentes)}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

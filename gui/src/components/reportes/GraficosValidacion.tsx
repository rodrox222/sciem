import { Activity, BarChart3, ChartNoAxesColumnIncreasing, ChartPie, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import type { IntervaloFlujo, RespuestaGraficosReporte } from '@/services/reportes.service'

const numero = (n: number) => n.toLocaleString('es-BO')

function Panel({ titulo, subtitulo, icono, children }: {
  titulo: string
  subtitulo: string
  icono: ReactNode
  children: ReactNode
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sci-cyan/10 text-sci-blue">{icono}</span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-sci-navy dark:text-foreground">{titulo}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{subtitulo}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function Flujo({ datos, intervalo }: { datos: RespuestaGraficosReporte; intervalo: IntervaloFlujo }) {
  const franjas = datos.curva_flujo.intervalos
  const maximo = Math.max(1, ...franjas.map((f) => f.total_escaneos))
  const total = franjas.reduce((n, f) => n + f.total_escaneos, 0)
  const pico = franjas.reduce((a, f) => f.total_escaneos > (a?.total_escaneos ?? 0) ? f : a, franjas[0])
  const ancho = Math.max(660, franjas.length * 35)
  const alto = 202
  const izquierda = 42
  const derecha = 23
  const superior = 20
  const base = 165
  const x = (i: number) => izquierda + (i * (ancho - izquierda - derecha)) / Math.max(1, franjas.length - 1)
  const y = (v: number) => base - (v / maximo) * (base - superior)
  const trazado = (key: 'total_escaneos' | 'permitidos' | 'rechazados') =>
    franjas.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v[key]).toFixed(1)}`).join(' ')

  return (
    <Panel titulo="Curva de flujo de entrada" subtitulo={`Escaneos cada ${intervalo} minutos · America/La_Paz`} icono={<Activity className="size-5" aria-hidden />}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          <strong className="text-foreground">{numero(total)}</strong> escaneos en los intervalos
          {pico && pico.total_escaneos > 0 && <> · Pico: <strong className="text-foreground">{pico.inicio}–{pico.fin}</strong></>}
        </span>
        <span className="inline-flex flex-wrap gap-3">
          <span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#168FBD]" />Total</span>
          <span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#187A50]" />Permitidos</span>
          <span><i className="mr-1.5 inline-block size-2 rounded-full bg-[#D97706]" />Rechazados</span>
        </span>
      </div>
      {franjas.length === 0 || total === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Sin escaneos en el intervalo del examen.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-muted/20 pb-2" tabIndex={0} aria-label="Desplazar gráfico de escaneos">
          <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-52 min-w-[660px] w-full" role="img" aria-label={`Curva de flujo. ${total} escaneos en intervalos de ${intervalo} minutos.`}>
            {[0, 0.5, 1].map((t) => <g key={t}><line x1={izquierda} x2={ancho - derecha} y1={y(maximo * t)} y2={y(maximo * t)} stroke="currentColor" strokeOpacity=".16" /><text x={izquierda - 7} y={y(maximo * t) + 4} fontSize="11" textAnchor="end" fill="currentColor">{Math.round(maximo * t)}</text></g>)}
            <path d={trazado('total_escaneos')} fill="none" stroke="#168FBD" strokeWidth="3" strokeLinejoin="round" />
            <path d={trazado('permitidos')} fill="none" stroke="#187A50" strokeWidth="2" strokeLinejoin="round" />
            <path d={trazado('rechazados')} fill="none" stroke="#D97706" strokeWidth="2" strokeLinejoin="round" />
            {franjas.map((f, i) => <g key={i}>
              {f.total_escaneos > 0 && <circle cx={x(i)} cy={y(f.total_escaneos)} r="3.5" fill="#168FBD"><title>{`${f.inicio}–${f.fin}: ${f.total_escaneos} escaneos, ${f.permitidos} permitidos, ${f.rechazados} rechazados`}</title></circle>}
              {(i % Math.max(1, Math.ceil(franjas.length / 9)) === 0 || i === franjas.length - 1) && <text x={x(i)} y={alto - 7} fontSize="10" textAnchor="middle" fill="currentColor">{f.inicio}</text>}
            </g>)}
          </svg>
        </div>
      )}
      <p className="mt-3 flex gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />{datos.curva_flujo.nota} El gráfico registra escaneos (eventos), no personas únicas; los realizados fuera del horario quedan fuera de esta curva.</p>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer font-medium text-sci-blue">Consultar valores exactos de los intervalos</summary>
        <div className="mt-2 max-h-52 overflow-auto rounded-lg border border-border">
          <table className="w-full text-left"><thead className="sticky top-0 bg-card"><tr><th className="p-2">Horario</th><th className="p-2">Permitidos</th><th className="p-2">Rechazados</th></tr></thead><tbody>{franjas.map((f, i) => <tr key={i} className="border-t border-border"><td className="p-2">{f.inicio}–{f.fin}</td><td className="p-2">{f.permitidos}</td><td className="p-2">{f.rechazados}</td></tr>)}</tbody></table>
        </div>
      </details>
    </Panel>
  )
}

function Embudo({ datos }: { datos: RespuestaGraficosReporte }) {
  const e = datos.embudo
  const pasos = [
    ['Inscritos', e.total_inscritos],
    ['Cumplieron prerrequisitos', e.cumplieron_prerrequisitos],
    ['Presentes en puerta', e.presentes_en_puerta],
    ['Evaluados efectivos', e.evaluados_efectivos],
  ] as const
  const base = Math.max(1, ...pasos.map((p) => p[1]))
  return (
    <Panel titulo="Embudo de acceso y rendición" subtitulo="Comparación por etapas según datos oficiales del servidor" icono={<ChartNoAxesColumnIncreasing className="size-5" aria-hidden />}>
      <div className="space-y-3">
        {pasos.map(([nombre, valor], i) => (
          <div key={nombre}>
            <div className="mb-1.5 flex justify-between gap-2 text-xs"><span className="font-medium text-foreground">{i + 1}. {nombre}</span><strong className="tabular-nums">{numero(valor)}</strong></div>
            <div className="h-5 overflow-hidden rounded-md bg-muted/70"><div className="h-full rounded-md bg-sci-cyan" style={{ width: `${(valor / base) * 100}%`, opacity: 1 - i * 0.15 }} /></div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Los valores representan etapas calculadas por el servidor. «Evaluados efectivos» excluye expulsiones vigentes y personas sin habilitación.</p>
    </Panel>
  )
}

function Prerrequisitos({ datos }: { datos: RespuestaGraficosReporte }) {
  const r = datos.cumplimiento_prerrequisitos
  return (
    <Panel titulo="Cumplimiento de prerrequisitos" subtitulo="Comparación por práctica o requisito definido para el examen" icono={<BarChart3 className="size-5" aria-hidden />}>
      {r.sin_prerrequisitos || r.resultados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Este examen no tiene prerrequisitos definidos.</p>
      ) : (
        <div className="max-h-[340px] space-y-4 overflow-y-auto pr-1">
          {r.resultados.map((item) => {
            const total = Math.max(1, item.total_inscritos)
            return <div key={item.id_prerrequisito} className="space-y-1.5">
              <div className="flex flex-wrap justify-between gap-2 text-xs"><span className="font-semibold">{item.requisito}</span><span className="tabular-nums text-muted-foreground">{numero(item.cumplidos)} cumplen · {numero(item.incumplidos)} pendientes</span></div>
              <div className="flex h-4 overflow-hidden rounded-md bg-muted/70" role="img" aria-label={`${item.requisito}: ${item.cumplidos} cumplen y ${item.incumplidos} no cumplen`}>
                <span className="bg-sci-cyan" style={{ width: `${(item.cumplidos / total) * 100}%` }} />
                <span className="bg-amber-500" style={{ width: `${(item.incumplidos / total) * 100}%` }} />
              </div>
              <p className="text-right text-[11px] text-muted-foreground">{item.porcentaje_incumplimiento.toLocaleString('es-BO')}% de incumplimiento</p>
            </div>
          })}
        </div>
      )}
    </Panel>
  )
}

function Distribucion({ datos }: { datos: RespuestaGraficosReporte }) {
  const g = datos.distribucion_asistencia
  const categorias = [
    { name: 'Presentes', value: g.categorias.presentes, color: '#168FBD' },
    { name: 'Ausentes', value: g.categorias.ausentes, color: '#94A3B8' },
    { name: 'Inhabilitados', value: g.categorias.inhabilitados, color: '#D97706' },
    { name: 'Expulsados', value: g.categorias.expulsados, color: '#C24141' },
  ]
  const suma = categorias.reduce((acc, c) => acc + c.value, 0)
  const radio = 64
  const circ = 2 * Math.PI * radio
  let acumulado = 0
  return (
    <Panel titulo="Distribución general de asistencia" subtitulo="Categorías excluyentes sobre los estudiantes inscritos" icono={<ChartPie className="size-5" aria-hidden />}>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <svg viewBox="0 0 180 180" className="size-44 shrink-0" role="img" aria-label={`Distribución de ${numero(g.total_inscritos)} inscritos en cuatro categorías`}>
          <circle cx="90" cy="90" r={radio} fill="none" stroke="#E2E8F0" strokeWidth="24" />
          {categorias.map((item) => {
            const long = suma > 0 ? (item.value / suma) * circ : 0
            const inicio = acumulado
            acumulado += long
            return <circle key={item.name} cx="90" cy="90" r={radio} fill="none" stroke={item.color} strokeWidth="24" strokeDasharray={`${long} ${circ - long}`} strokeDashoffset={-inicio} transform="rotate(-90 90 90)"><title>{`${item.name}: ${numero(item.value)}`}</title></circle>
          })}
          <text x="90" y="86" fontSize="22" fontWeight="bold" textAnchor="middle" fill="currentColor">{numero(g.total_inscritos)}</text>
          <text x="90" y="105" fontSize="11" textAnchor="middle" fill="currentColor">inscritos</text>
        </svg>
        <div className="grid min-w-44 flex-1 gap-2">
          {categorias.map((item) => <div key={item.name} className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-3 py-2 text-xs">
            <span className="flex items-center gap-2"><i className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
            <strong className="tabular-nums">{numero(item.value)} <span className="font-normal text-muted-foreground">({g.total_inscritos ? Math.round(item.value / g.total_inscritos * 100) : 0}%)</span></strong>
          </div>)}
        </div>
      </div>
      {suma !== g.total_inscritos && <p className="mt-3 text-xs font-semibold text-destructive" role="alert">Los segmentos no suman el total de inscritos. Revisar los datos del servidor.</p>}
      <p className="mt-3 text-xs text-muted-foreground">La clasificación prioriza expulsados, después inhabilitados, presentes y ausentes; una persona se cuenta una sola vez.</p>
    </Panel>
  )
}

export function GraficosValidacion({ graficos, intervalo, onIntervaloChange }: {
  graficos: RespuestaGraficosReporte
  intervalo: IntervaloFlujo
  onIntervaloChange: (intervalo: IntervaloFlujo) => void
}) {
  return <section aria-labelledby="graficos-validacion" className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-sci-cyan">Bloque 5 · Documento de validación</p>
        <h2 id="graficos-validacion" className="mt-1 text-xl font-extrabold text-sci-navy dark:text-foreground sm:text-2xl">Gráficos y métricas visuales</h2>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold" htmlFor="intervalo-validacion">
        Intervalo de la curva
        <select id="intervalo-validacion" value={intervalo} onChange={(e) => onIntervaloChange(Number(e.target.value) as IntervaloFlujo)} className="min-h-10 rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-sci-cyan">
          <option value={5}>5 minutos</option><option value={10}>10 minutos</option>
        </select>
      </label>
    </div>
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <Flujo datos={graficos} intervalo={graficos.filtros.intervalo_minutos} />
      <Embudo datos={graficos} />
      <Prerrequisitos datos={graficos} />
      <Distribucion datos={graficos} />
    </div>
  </section>
}

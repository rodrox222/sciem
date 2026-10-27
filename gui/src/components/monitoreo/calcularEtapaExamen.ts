import type { Examen, ExamenEstado } from '@/services/examenes.service'

// Etapa informativa por horario (hora oficial de Bolivia), no cambia el estado
// administrativo del examen ni habilita registros en el backend.
const reloj = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/La_Paz',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

const hora = (valor: string | null | undefined) => {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec((valor ?? '').trim())
  if (!match) return null
  const [h, m, s] = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)]
  if (h > 23 || m > 59 || s > 59) return null
  return `${String(h).padStart(2, '0')}:${match[2]}:${String(s).padStart(2, '0')}`
}

export function calcularEtapaExamen(
  exam: Pick<Examen, 'fecha' | 'hora_ini' | 'hora_fin' | 'estado'>,
  instante: Date = new Date(),
): ExamenEstado {
  if (exam.estado === 'Terminado' || Number.isNaN(instante.getTime())) return exam.estado

  const dia = /^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/.exec(exam.fecha ?? '')?.[1]
  const inicio = hora(exam.hora_ini)
  const fin = hora(exam.hora_fin)
  if (!dia || !inicio || !fin) return exam.estado

  const campos = Object.fromEntries(reloj.formatToParts(instante)
    .filter((parte) => parte.type !== 'literal').map(({ type, value }) => [type, value]))
  const ahora = `${campos.year}-${campos.month}-${campos.day}T${campos.hour}:${campos.minute}:${campos.second}`
  const inicioHorario = `${dia}T${inicio}`
  let diaCierre = dia
  if (fin < inicio) {
    const siguiente = new Date(`${dia}T12:00:00Z`)
    if (Number.isNaN(siguiente.getTime())) return exam.estado
    siguiente.setUTCDate(siguiente.getUTCDate() + 1)
    diaCierre = siguiente.toISOString().slice(0, 10)
  }
  const finHorario = `${diaCierre}T${fin}`

  if (ahora < inicioHorario) return 'Programado'
  if (ahora > finHorario) return 'Terminado'
  return 'En proceso'
}

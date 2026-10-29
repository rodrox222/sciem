import type { Examen } from '@/services/examenes.service'

const HUSO_HORARIO = 'America/La_Paz'

const relojBolivia = new Intl.DateTimeFormat('en-US', {
  timeZone: HUSO_HORARIO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

const horaValida = (value: string): string | null => {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(value.trim())
  if (!match) return null
  const horas = Number(match[1])
  const minutos = Number(match[2])
  const segundos = Number(match[3] ?? '0')
  if (horas > 23 || minutos > 59 || segundos > 59) return null
  return `${String(horas).padStart(2, '0')}:${match[2]}:${String(segundos).padStart(2, '0')}`
}

const siguienteFecha = (fecha: string) => {
  const dia = new Date(`${fecha}T12:00:00Z`)
  dia.setUTCDate(dia.getUTCDate() + 1)
  return dia.toISOString().slice(0, 10)
}

/** Control UX, no reemplaza la comprobación del servidor en el POST. */
export function verificarHorarioExpulsion(
  exam: Pick<Examen, 'fecha' | 'hora_ini' | 'hora_fin' | 'estado'>,
  instante: Date = new Date(),
): { permitido: boolean; mensaje: string } {
  const fecha = /^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/.exec(exam.fecha ?? '')?.[1]
  const inicio = horaValida(exam.hora_ini ?? '')
  const fin = horaValida(exam.hora_fin ?? '')
  if (!fecha || !inicio || !fin || Number.isNaN(instante.getTime())) {
    return { permitido: false, mensaje: 'No se pudo verificar la fecha y horario del examen. No es posible registrar expulsiones.' }
  }

  const partes = Object.fromEntries(
    relojBolivia.formatToParts(instante)
      .filter((parte) => parte.type !== 'literal')
      .map(({ type, value }) => [type, value]),
  )
  const ahora = `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}`
  const comienza = `${fecha}T${inicio}`
  // Si termina después de medianoche, el cierre corresponde al día siguiente.
  const termina = `${fin < inicio ? siguienteFecha(fecha) : fecha}T${fin}`
  const horario = `${fecha.split('-').reverse().join('/')} de ${inicio.slice(0, 5)} a ${fin.slice(0, 5)} (hora de Bolivia)`

  if (exam.estado === 'Terminado') {
    return { permitido: false, mensaje: `El examen está marcado como finalizado. Horario programado: ${horario}.` }
  }
  if (ahora < comienza || ahora > termina) {
    return { permitido: false, mensaje: `Fuera del horario del examen: ${horario}. Solo se permiten registros durante la evaluación.` }
  }
  return { permitido: true, mensaje: `Registro habilitado durante el horario del examen: ${horario}.` }
}

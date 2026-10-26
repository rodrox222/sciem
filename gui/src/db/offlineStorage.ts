import Dexie, { type Table } from 'dexie'

export interface EstudianteOffline {
  id_estudiante: string
  codigo_sis: string
  ci: string
  ci_extension?: string | null
  nombre: string
  apellido_paterno: string
  apellido_materno?: string | null
  foto_perfil_url?: string | null
  estado_habilitacion: string
  id_examen: string
  ya_ingreso?: boolean
  fecha_ingreso_previo?: string | null
}

export interface ExamenOfflineInfo {
  id_examen: string
  nombre: string
  fecha: string
  hora_ini?: string | null
  hora_fin?: string | null
  estado: string
}

export interface AsistenciaOffline {
  id?: number
  id_examen: string
  id_estudiante?: string | null
  codigo_sis: string
  fecha_ingreso: string
  resultado: 'PERMITIDO' | 'DENEGADO'
  motivo?: string | null // 'EXAMEN_FINALIZADO' | 'NO_INSCRITO' | 'EXAMEN_DISTINTO' | 'REINGRESO_DUPLICADO' | 'INHABILITADO' | 'HORARIO_EXPIRADO' | 'QR_INVALIDO'
  sincronizado: boolean
}

export class SciemOfflineDatabase extends Dexie {
  estudiantes!: Table<EstudianteOffline, string>
  examenes!: Table<ExamenOfflineInfo, string>
  asistencias_pendientes!: Table<AsistenciaOffline, number>

  constructor() {
    super('SciemOfflineDB')

    this.version(1).stores({
      estudiantes: 'codigo_sis, id_estudiante, id_examen, estado_habilitacion',
      asistencias_pendientes: '++id, id_examen, codigo_sis, fecha_ingreso, sincronizado',
    })

    this.version(2).stores({
      estudiantes: 'codigo_sis, id_estudiante, id_examen, estado_habilitacion, [id_examen+codigo_sis]',
      asistencias_pendientes: '++id, id_examen, codigo_sis, fecha_ingreso, sincronizado, [id_examen+sincronizado], [id_examen+codigo_sis]',
    })

    // Versión 3: Soporte para info temporal del examen y llaves compuestas
    this.version(3).stores({
      estudiantes: 'id_estudiante, codigo_sis, id_examen, estado_habilitacion, [id_examen+codigo_sis]',
      examenes: 'id_examen',
      asistencias_pendientes: '++id, id_examen, id_estudiante, codigo_sis, fecha_ingreso, sincronizado, [id_examen+sincronizado]',
    })
  }
}

export const db = new SciemOfflineDatabase()

/**
 * Guarda el padrón descargado y el estado del examen localmente
 */
export async function guardarPadronLocal(
  idExamen: string,
  listaEstudiantes: any[],
  infoExamen?: Partial<ExamenOfflineInfo>
): Promise<void> {
  // Limpiar padrón anterior del examen
  await db.estudiantes.where('id_examen').equals(idExamen).delete()

  if (infoExamen) {
    await db.examenes.put({
      id_examen: idExamen,
      nombre: infoExamen.nombre || 'Evaluación',
      fecha: infoExamen.fecha || new Date().toISOString().slice(0, 10),
      hora_ini: infoExamen.hora_ini,
      hora_fin: infoExamen.hora_fin,
      estado: infoExamen.estado || 'Activo',
    })
  }

  const registros: EstudianteOffline[] = listaEstudiantes.map((e) => ({
    id_estudiante: String(e.id_estudiante || e.id),
    codigo_sis: String(e.codigo_sis || e.sis),
    ci: String(e.ci || ''),
    ci_extension: e.ci_extension ?? null,
    nombre: e.nombre || '',
    apellido_paterno: e.apellido_paterno || '',
    apellido_materno: e.apellido_materno ?? null,
    foto_perfil_url: e.foto_perfil_url ?? null,
    estado_habilitacion: String(e.estado_habilitacion || e.estado || 'HABILITADO').toUpperCase(),
    id_examen: idExamen,
    ya_ingreso: Boolean(e.fecha_ingreso || e.ya_ingreso),
    fecha_ingreso_previo: e.fecha_ingreso || null,
  }))

  await db.estudiantes.bulkPut(registros)
}

function notificarCambioOffline() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('asistencia-offline-guardada'))
  }
}

/**
 * Valida el QR offline replicando exactamente VerificacionController.php
 */
export async function validarQrOffline(
  idExamen: string,
  codigoSis: string,
  idExamenToken?: string,
  expiraAt?: number,
  idEstudianteToken?: string
): Promise<{ acceso: boolean; mensaje: string; estudiante?: string; codigo?: string }> {
  const sisBuscado = String(codigoSis || '').trim()
  const timestamp = new Date().toISOString()

  // 1. Verificar si la evaluación académica ya acabó por horario local
  const infoExamen = await db.examenes.get(idExamen)
  if (infoExamen) {
    const estadoLimpio = (infoExamen.estado || '').toLowerCase()
    const esTerminado = ['terminado', 'finalizado', 'concluido'].includes(estadoLimpio)

    let horarioVencido = false
    if (infoExamen.fecha && infoExamen.hora_fin) {
      try {
        const [anio, mes, dia] = infoExamen.fecha.slice(0, 10).split('-').map(Number)
        const [horas, minutos] = infoExamen.hora_fin.split(':').map(Number)
        const horaFin = new Date(anio, mes - 1, dia, horas, minutos, 0)
        horarioVencido = new Date() > horaFin
      } catch {
        horarioVencido = false
      }
    }

    if (esTerminado || horarioVencido) {
      await db.asistencias_pendientes.add({
        id_examen: idExamen,
        codigo_sis: sisBuscado || 'DESCONOCIDO',
        fecha_ingreso: timestamp,
        resultado: 'DENEGADO',
        motivo: 'EXAMEN_FINALIZADO',
        sincronizado: false,
      })
      notificarCambioOffline()
      return {
        acceso: false,
        codigo: 'EXAMEN_FINALIZADO',
        mensaje: 'La evaluación ha finalizado. El período de ingreso concluyó.',
      }
    }
  }

  // 2. Token QR expirado por timestamp
  if (expiraAt && Math.floor(Date.now() / 1000) > expiraAt) {
    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      codigo_sis: sisBuscado || 'DESCONOCIDO',
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: 'HORARIO_EXPIRADO',
      sincronizado: false,
    })
    notificarCambioOffline()
    return {
      acceso: false,
      codigo: 'HORARIO_EXPIRADO',
      mensaje: 'El código QR ha expirado. El horario de ingreso concluyó.',
    }
  }

  // 3. Formato ilegible o sin identificador
  if (!sisBuscado && !idEstudianteToken) {
    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      codigo_sis: 'DESCONOCIDO',
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: 'QR_INVALIDO',
      sincronizado: false,
    })
    notificarCambioOffline()
    return {
      acceso: false,
      codigo: 'QR_INVALIDO',
      mensaje: 'Código QR inválido o ajeno al sistema institucional.',
    }
  }

  // Búsqueda del alumno en el padrón local
  let estudiante = await db.estudiantes
    .where('[id_examen+codigo_sis]')
    .equals([idExamen, sisBuscado])
    .first()

  if (!estudiante && idEstudianteToken) {
    estudiante = await db.estudiantes.get(idEstudianteToken)
  }

  // 4. No registrado en el padrón del examen
  if (!estudiante) {
    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      codigo_sis: sisBuscado || 'DESCONOCIDO',
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: 'NO_INSCRITO',
      sincronizado: false,
    })
    notificarCambioOffline()
    return {
      acceso: false,
      codigo: 'NO_INSCRITO',
      mensaje: 'El estudiante no se encuentra inscrito en esta evaluación.',
    }
  }

  // 5. Presenta QR emitido para otro examen
  if (idExamenToken && idExamenToken !== idExamen) {
    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      id_estudiante: estudiante.id_estudiante,
      codigo_sis: sisBuscado,
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: 'EXAMEN_DISTINTO',
      sincronizado: false,
    })
    notificarCambioOffline()
    return {
      acceso: false,
      codigo: 'EXAMEN_DISTINTO',
      mensaje: 'El código QR pertenece a otra evaluación o materia.',
    }
  }

  // 6. Inhabilitado
  if (estudiante.estado_habilitacion !== 'HABILITADO') {
    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      id_estudiante: estudiante.id_estudiante,
      codigo_sis: sisBuscado,
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: 'INHABILITADO',
      sincronizado: false,
    })
    notificarCambioOffline()
    return {
      acceso: false,
      codigo: 'INHABILITADO',
      mensaje: 'Estudiante inhabilitado para rendir este examen.',
    }
  }

  // 7. Reingreso duplicado (revisando tanto ingresos previos de servidor como locales)
  const ingresoLocal = await db.asistencias_pendientes
    .where({ id_examen: idExamen, codigo_sis: sisBuscado })
    .filter((item) => item.resultado === 'PERMITIDO')
    .first()

  if (estudiante.ya_ingreso || ingresoLocal) {
    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      id_estudiante: estudiante.id_estudiante,
      codigo_sis: sisBuscado,
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: 'REINGRESO_DUPLICADO',
      sincronizado: false,
    })
    notificarCambioOffline()
    return {
      acceso: false,
      codigo: 'REINGRESO_DUPLICADO',
      mensaje: 'El estudiante ya registró su ingreso a esta evaluación.',
    }
  }

  // INGRESO AUTORIZADO
  await db.asistencias_pendientes.add({
    id_examen: idExamen,
    id_estudiante: estudiante.id_estudiante,
    codigo_sis: sisBuscado,
    fecha_ingreso: timestamp,
    resultado: 'PERMITIDO',
    motivo: 'Ingreso autorizado.',
    sincronizado: false,
  })

  // Marcar localmente que ya ingresó para bloquear reintentos inmediatos
  await db.estudiantes.update(estudiante.id_estudiante, {
    ya_ingreso: true,
    fecha_ingreso_previo: timestamp,
  })

  notificarCambioOffline()

  return {
    acceso: true,
    codigo: 'PERMITIDO',
    mensaje: 'Ingreso autorizado.',
    estudiante: `${estudiante.nombre} ${estudiante.apellido_paterno}`,
  }
}
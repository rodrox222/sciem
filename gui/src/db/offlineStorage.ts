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
  id_auxiliar?: string | null
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

export interface PrerrequisitoOffline {
  id: string | number
  id_examen: string
  nombre: string
  descripcion?: string | null
  es_obligatorio?: boolean
}

export interface NormaOffline {
  id: string | number
  id_examen: string
  titulo: string
  descripcion?: string | null
  tipo?: string | null
}

export interface AsistenciaOffline {
  id?: number
  id_examen: string
  id_estudiante?: string | null
  codigo_sis: string
  fecha_ingreso: string
  resultado: 'PERMITIDO' | 'DENEGADO'
  motivo?: string | null // 'EXAMEN_FINALIZADO' | 'NO_INSCRITO' | 'NO_ASIGNADO' | 'EXAMEN_DISTINTO' | 'REINGRESO_DUPLICADO' | 'INHABILITADO' | 'HORARIO_EXPIRADO' | 'QR_INVALIDO'
  sincronizado: boolean
}

export interface EstudianteEscaneadoInfo {
  nombre_completo: string
  codigo_sis?: string
  ci?: string
  foto_url?: string | null
}

export class SciemOfflineDatabase extends Dexie {
  estudiantes!: Table<EstudianteOffline, string>
  examenes!: Table<ExamenOfflineInfo, string>
  prerrequisitos!: Table<PrerrequisitoOffline, string | number>
  normas!: Table<NormaOffline, string | number>
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

    this.version(3).stores({
      estudiantes: 'id_estudiante, codigo_sis, id_examen, estado_habilitacion, [id_examen+codigo_sis]',
      examenes: 'id_examen',
      asistencias_pendientes: '++id, id_examen, id_estudiante, codigo_sis, fecha_ingreso, sincronizado, [id_examen+sincronizado]',
    })

    // Versión 4: Inclusión de prerrequisitos, normas e id_auxiliar
    this.version(4).stores({
      estudiantes: 'id_estudiante, codigo_sis, id_examen, id_auxiliar, estado_habilitacion, [id_examen+codigo_sis], [id_examen+id_auxiliar]',
      examenes: 'id_examen',
      prerrequisitos: 'id, id_examen',
      normas: 'id, id_examen',
      asistencias_pendientes: '++id, id_examen, id_estudiante, codigo_sis, fecha_ingreso, sincronizado, [id_examen+sincronizado]',
    })
  }
}

export const db = new SciemOfflineDatabase()

/**
 * Guarda el lote descargado: padrón, metadatos, prerrequisitos y normas
 */
export async function guardarPadronLocal(
  idExamen: string,
  listaEstudiantes: any[],
  infoExamen?: Partial<ExamenOfflineInfo>,
  listaPrerrequisitos: any[] = [],
  listaNormas: any[] = []
): Promise<void> {
  // Limpieza previa del examen
  await db.estudiantes.where('id_examen').equals(idExamen).delete()
  await db.prerrequisitos.where('id_examen').equals(idExamen).delete()
  await db.normas.where('id_examen').equals(idExamen).delete()

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
    id_auxiliar: e.id_auxiliar ? String(e.id_auxiliar) : null,
    ya_ingreso: Boolean(e.fecha_ingreso || e.ya_ingreso),
    fecha_ingreso_previo: e.fecha_ingreso || null,
  }))

  if (registros.length > 0) {
    await db.estudiantes.bulkPut(registros)
  }

  if (listaPrerrequisitos.length > 0) {
    const prereqs: PrerrequisitoOffline[] = listaPrerrequisitos.map((p, idx) => ({
      id: p.id || `${idExamen}_p_${idx}`,
      id_examen: idExamen,
      nombre: p.nombre || 'Requisito',
      descripcion: p.descripcion || null,
      es_obligatorio: Boolean(p.es_obligatorio),
    }))
    await db.prerrequisitos.bulkPut(prereqs)
  }

  if (listaNormas.length > 0) {
    const norms: NormaOffline[] = listaNormas.map((n, idx) => ({
      id: n.id || `${idExamen}_n_${idx}`,
      id_examen: idExamen,
      titulo: n.titulo || 'Norma',
      descripcion: n.descripcion || null,
      tipo: n.tipo || null,
    }))
    await db.normas.bulkPut(norms)
  }
}

function notificarCambioOffline() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('asistencia-offline-guardada'))
  }
}

/**
 * Valida el QR offline con soporte para restricción por auxiliar y retorno de estudiante
 */
export async function validarQrOffline(
  idExamen: string,
  codigoSis: string,
  idExamenToken?: string,
  expiraAt?: number,
  idEstudianteToken?: string,
  idAuxiliarActual?: string
): Promise<{
  acceso: boolean
  mensaje: string
  estudiante?: EstudianteEscaneadoInfo
  codigo?: string
}> {
  const sisBuscado = String(codigoSis || '').trim()
  const timestamp = new Date().toISOString()

  // 1. Horario de evaluación concluido
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

  // 2. Token expirado
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

  // 3. Formato ilegible
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

  // Búsqueda del estudiante en Dexie
  let estudiante = await db.estudiantes
    .where('[id_examen+codigo_sis]')
    .equals([idExamen, sisBuscado])
    .first()

  if (!estudiante && idEstudianteToken) {
    estudiante = await db.estudiantes.get(idEstudianteToken)
  }

  // 4. No registrado en el examen
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

  const datosEstudianteRespuesta: EstudianteEscaneadoInfo = {
    nombre_completo: `${estudiante.nombre} ${estudiante.apellido_paterno} ${estudiante.apellido_materno || ''}`.trim(),
    codigo_sis: estudiante.codigo_sis,
    ci: `${estudiante.ci} ${estudiante.ci_extension || ''}`.trim(),
    foto_url: estudiante.foto_perfil_url,
  }

  // 5. Validación de módulo asignado al auxiliar
  if (idAuxiliarActual && estudiante.id_auxiliar && estudiante.id_auxiliar !== idAuxiliarActual) {
    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      id_estudiante: estudiante.id_estudiante,
      codigo_sis: sisBuscado,
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: 'NO_ASIGNADO',
      sincronizado: false,
    })
    notificarCambioOffline()
    return {
      acceso: false,
      codigo: 'NO_ASIGNADO',
      mensaje: 'Estudiante no asignado a su módulo. Debe ingresar con otro auxiliar.',
      estudiante: datosEstudianteRespuesta,
    }
  }

  // 6. QR generado para otro examen
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
      estudiante: datosEstudianteRespuesta,
    }
  }

  // 7. Inhabilitado
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
      estudiante: datosEstudianteRespuesta,
    }
  }

  // 8. Reingreso duplicado
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
      estudiante: datosEstudianteRespuesta,
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

  // Actualización local
  await db.estudiantes.update(estudiante.id_estudiante, {
    ya_ingreso: true,
    fecha_ingreso_previo: timestamp,
  })

  notificarCambioOffline()

  return {
    acceso: true,
    codigo: 'PERMITIDO',
    mensaje: 'Ingreso autorizado.',
    estudiante: datosEstudianteRespuesta,
  }
}

// Consultas GET Locales (Lectura offline para componentes)

export async function obtenerEstudiantesOffline(idExamen: string, idAuxiliar?: string): Promise<EstudianteOffline[]> {
  const lista = await db.estudiantes.where('id_examen').equals(idExamen).toArray()
  if (idAuxiliar) {
    return lista.filter((e) => !e.id_auxiliar || e.id_auxiliar === idAuxiliar)
  }
  return lista
}

export async function obtenerPrerrequisitosOffline(idExamen: string): Promise<PrerrequisitoOffline[]> {
  return await db.prerrequisitos.where('id_examen').equals(idExamen).toArray()
}

export async function obtenerNormasOffline(idExamen: string): Promise<NormaOffline[]> {
  return await db.normas.where('id_examen').equals(idExamen).toArray()
}
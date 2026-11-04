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
  motivo_inhabilitacion?: string | null
  id_examen: string
  id_auxiliar?: string | null
  ya_ingreso?: boolean
  fecha_ingreso_previo?: string | null
}

export interface ExamenOfflineInfo {
  id_examen: string
  nombre: string
  id_materia?: string | null
  materia?: string | null
  id_aula?: string | null     
  aula_nombre?: string | null    
  id_docente?: string | null
  docente_nombre?: string | null   
  fecha: string
  hora_ini?: string | null
  hora_fin?: string | null
  estado: string
}

export interface ExamenModificadoOffline {
  id_examen: string
  nombre?: string
  id_materia?: string | null
  id_aula?: string | null  
  id_docente?: string | null
  fecha?: string
  hora_ini?: string | null
  hora_fin?: string | null
  estado?: string
  actualizado_por_rol: string
  actualizado_el: string
  sincronizado: boolean
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
  motivo?: string | null
  sincronizado: boolean
}

export interface EstudianteEscaneadoInfo {
  nombre_completo: string
  codigo_sis?: string
  ci?: string
  foto_url?: string | null
}

export class SciemOfflineDatabase extends Dexie {
  estudiantes!: Table<EstudianteOffline, [string, string]>
  examenes!: Table<ExamenOfflineInfo, string>
  examenes_modificados!: Table<ExamenModificadoOffline, string>
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

    this.version(4).stores({
      estudiantes: 'id_estudiante, codigo_sis, id_examen, id_auxiliar, estado_habilitacion, [id_examen+codigo_sis], [id_examen+id_auxiliar]',
      examenes: 'id_examen',
      prerrequisitos: 'id, id_examen',
      normas: 'id, id_examen',
      asistencias_pendientes: '++id, id_examen, id_estudiante, codigo_sis, fecha_ingreso, sincronizado, [id_examen+sincronizado]',
    })

    this.version(5).stores({
      estudiantes: '[id_examen+codigo_sis], id_estudiante, codigo_sis, id_examen, id_auxiliar, estado_habilitacion, [id_examen+id_auxiliar]',
      examenes: 'id_examen, estado',
      prerrequisitos: 'id, id_examen',
      normas: 'id, id_examen',
      asistencias_pendientes: '++id, id_examen, id_estudiante, codigo_sis, fecha_ingreso, resultado, motivo, sincronizado, [id_examen+sincronizado], [id_examen+codigo_sis]',
    })

    this.version(6).stores({
      estudiantes: '[id_examen+codigo_sis], id_estudiante, codigo_sis, id_examen, id_auxiliar, estado_habilitacion, [id_examen+id_auxiliar]',
      examenes: 'id_examen, estado',
      examenes_modificados: 'id_examen, actualizado_el, sincronizado',
      prerrequisitos: 'id, id_examen',
      normas: 'id, id_examen',
      asistencias_pendientes: '++id, id_examen, id_estudiante, codigo_sis, fecha_ingreso, resultado, motivo, sincronizado, [id_examen+sincronizado], [id_examen+codigo_sis]',
    })
  }
}

export const db = new SciemOfflineDatabase()

export async function guardarPadronLocal(
  idExamen: string,
  listaEstudiantes: any[],
  infoExamen?: Partial<ExamenOfflineInfo>,
  listaPrerrequisitos: any[] = [],
  listaNormas: any[] = []
): Promise<void> {
  const asistenciasLocales = await db.asistencias_pendientes
    .where('id_examen')
    .equals(idExamen)
    .filter((a) => a.resultado === 'PERMITIDO')
    .toArray()
  
  const sisIngresados = new Set(asistenciasLocales.map((a) => a.codigo_sis))

  await db.estudiantes.where('id_examen').equals(idExamen).delete()
  await db.prerrequisitos.where('id_examen').equals(idExamen).delete()
  await db.normas.where('id_examen').equals(idExamen).delete()

  if (infoExamen) {
    const modPendiente = await db.examenes_modificados.get(idExamen)

    const idAulaFinal = modPendiente?.id_aula 
      || (infoExamen as any).id_aula 
      || (infoExamen as any).aula?.id 
      || null

    const aulaNombreFinal = (infoExamen as any).aula_nombre 
      || (infoExamen as any).aula?.nombre 
      || null

    const idDocenteFinal = modPendiente?.id_docente 
      || (infoExamen as any).id_docente 
      || (infoExamen as any).docente?.id 
      || null

    const docenteNombreFinal = (infoExamen as any).docente_nombre
      || ((infoExamen as any).docente 
            ? `${(infoExamen as any).docente.nombre || ''} ${(infoExamen as any).docente.apellido_paterno || ''}`.trim()
            : null)

    await db.examenes.put({
      id_examen: idExamen,
      nombre: modPendiente?.nombre || infoExamen.nombre || 'Evaluación',
      id_materia: (infoExamen as any).id_materia || null,
      materia: infoExamen.materia || null,
      id_aula: idAulaFinal,
      aula_nombre: aulaNombreFinal,         
      id_docente: idDocenteFinal,
      docente_nombre: docenteNombreFinal,     
      fecha: modPendiente?.fecha || infoExamen.fecha || new Date().toISOString().slice(0, 10),
      hora_ini: modPendiente?.hora_ini || infoExamen.hora_ini,
      hora_fin: modPendiente?.hora_fin || infoExamen.hora_fin,
      estado: modPendiente?.estado || infoExamen.estado || 'Activo',
    })
  }

  const registros: EstudianteOffline[] = listaEstudiantes.map((e) => {
    const sis = String(e.codigo_sis || e.sis || '').trim()
    const yaEntroLocal = sisIngresados.has(sis)

    return {
      id_estudiante: String(e.id_estudiante || e.id || e.codigo_sis),
      codigo_sis: sis,
      ci: String(e.ci || ''),
      ci_extension: e.ci_extension ?? null,
      nombre: e.nombre || '',
      apellido_paterno: e.apellido_paterno || '',
      apellido_materno: e.apellido_materno ?? null,
      foto_perfil_url: e.foto_perfil_url ?? null,
      estado_habilitacion: String(e.estado_habilitacion || e.estado || 'HABILITADO').toUpperCase(),
      motivo_inhabilitacion: e.motivo_estado || e.motivo_inhabilitacion || null,
      id_examen: idExamen,
      id_auxiliar: e.id_auxiliar ? String(e.id_auxiliar) : null,
      ya_ingreso: Boolean(e.fecha_ingreso || e.ya_ingreso || yaEntroLocal),
      fecha_ingreso_previo: e.fecha_ingreso || (yaEntroLocal ? new Date().toISOString() : null),
    }
  })

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

export async function actualizarExamenOffline(
  idExamen: string,
  datos: Partial<ExamenOfflineInfo>,
  rolUsuario?: string
): Promise<void> {
  let rol = (rolUsuario || localStorage.getItem('user_role') || '').toLowerCase()
  
  if (!rol) {
    try {
      const userObj = JSON.parse(localStorage.getItem('auth_user') || '{}')
      rol = (userObj.rol || userObj.tipo_usuario || '').toLowerCase()
    } catch {}
  }

  // Permitir a docente, admin y responsable guardar cambios
  const rolesPermitidos = ['docente', 'admin', 'administrador']
  if (rol && !rolesPermitidos.includes(rol)) {
    throw new Error('Permiso denegado: únicamente el docente titular puede modificar los datos del examen.')
  }

  const examenExistente = await db.examenes.get(idExamen)
  if (!examenExistente) {
    throw new Error('La evaluación no se encuentra descargada localmente. Presione primero "Descargar Padrón".')
  }

  const timestamp = new Date().toISOString()

  await db.examenes.update(idExamen, {
    ...datos,
  })

  await db.examenes_modificados.put({
    id_examen: idExamen,
    ...datos,
    actualizado_por_rol: rol || 'docente',
    actualizado_el: timestamp,
    sincronizado: false,
  })

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('examen-offline-actualizado'))
    window.dispatchEvent(new CustomEvent('asistencia-offline-guardada'))
  }
}

function notificarCambioOffline() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('asistencia-offline-guardada'))
  }
}

export async function validarQrOffline(
  idExamen: string,
  codigoSis: string,
  idExamenToken?: string,
  _expiraAt?: number,
  idEstudianteToken?: string,
  idAuxiliarActual?: string,
  materiaToken?: string
): Promise<{
  acceso: boolean
  mensaje: string
  estudiante?: EstudianteEscaneadoInfo
  codigo: string
  detalles?: Record<string, any>
}> {
  const sisBuscado = String(codigoSis || '').trim()
  const timestamp = new Date().toISOString()

  // 1. QR Vacío o inválido
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
      codigo: 'ERROR_DATOS_INVALIDOS',
      mensaje: 'Código QR inválido o ajeno al sistema institucional.',
    }
  }

  const infoExamen = await db.examenes.get(idExamen)

  // 2. VALIDACIÓN DE EXAMEN O MATERIA DISTINTA (PRIMERO QUE TODO)
  const esExamenDistinto = Boolean(idExamenToken && idExamenToken !== idExamen)
  const esMateriaDistinta = Boolean(
    materiaToken &&
    infoExamen?.materia &&
    materiaToken.trim().toLowerCase() !== infoExamen.materia.trim().toLowerCase()
  )

  if (esExamenDistinto || esMateriaDistinta) {
    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      codigo_sis: sisBuscado || 'DESCONOCIDO',
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: 'EXAMEN_DISTINTO',
      sincronizado: false,
    })
    notificarCambioOffline()
    return {
      acceso: false,
      codigo: 'RECHAZADO_EXAMEN_DISTINTO',
      mensaje: 'El código QR presentado corresponde a otra evaluación o materia.',
    }
  }

  // 3. VALIDACIÓN DE HORARIO DEL EXAMEN CONTRA EL RELOJ DEL SISTEMA
  if (infoExamen) {
    const estadoLimpio = (infoExamen.estado || '').toLowerCase()
    const esTerminado = ['terminado', 'finalizado', 'concluido'].includes(estadoLimpio)

    let examenYaConcluyo = false
    if (infoExamen.fecha && infoExamen.hora_fin) {
      try {
        const fechaBase = infoExamen.fecha.slice(0, 10)
        const horaFinStr = infoExamen.hora_fin.trim().slice(0, 5) // "HH:mm"
        const [horas, minutos] = horaFinStr.split(':').map(Number)
        const [anio, mes, dia] = fechaBase.split('-').map(Number)

        const limiteExamen = new Date(anio, mes - 1, dia, horas, minutos, 59)
        examenYaConcluyo = new Date() > limiteExamen
      } catch {
        examenYaConcluyo = false
      }
    }

    if (esTerminado || examenYaConcluyo) {
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
        codigo: 'RECHAZADO_EXAMEN_CONCLUIDO',
        mensaje: 'La evaluación ha finalizado. El período de ingreso concluyó.',
      }
    }
  }

  // 4. BÚSQUEDA DEL ESTUDIANTE EN EL PADRÓN LOCAL
  let estudiante = await db.estudiantes
    .where('[id_examen+codigo_sis]')
    .equals([idExamen, sisBuscado])
    .first()

  if (!estudiante && idEstudianteToken) {
    estudiante = await db.estudiantes
      .where('id_estudiante')
      .equals(idEstudianteToken)
      .first()
  }

  if (!estudiante) {
    const existeEnOtraMateria = await db.estudiantes.where('codigo_sis').equals(sisBuscado).first()

    const codigoRechazo = existeEnOtraMateria ? 'RECHAZADO_NO_INSCRITO' : 'RECHAZADO_NO_REGISTRADO'
    const mensajeRechazo = existeEnOtraMateria
      ? 'El estudiante no se encuentra inscrito en esta evaluación.'
      : 'El estudiante no se encuentra registrado en el sistema universitario.'

    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      codigo_sis: sisBuscado || 'DESCONOCIDO',
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: existeEnOtraMateria ? 'NO_INSCRITO' : 'NO_REGISTRADO',
      sincronizado: false,
    })
    notificarCambioOffline()
    return {
      acceso: false,
      codigo: codigoRechazo,
      mensaje: mensajeRechazo,
    }
  }

  const datosEstudianteRespuesta: EstudianteEscaneadoInfo = {
    nombre_completo: `${estudiante.nombre} ${estudiante.apellido_paterno} ${estudiante.apellido_materno || ''}`.trim(),
    codigo_sis: estudiante.codigo_sis,
    ci: `${estudiante.ci} ${estudiante.ci_extension || ''}`.trim(),
    foto_url: estudiante.foto_perfil_url,
  }

  // 5. CONTROL DE REINGRESO DUPLICADO
  const ingresoLocal = await db.asistencias_pendientes
    .where({ id_examen: idExamen, codigo_sis: sisBuscado })
    .filter((item) => item.resultado === 'PERMITIDO')
    .first()

  if (estudiante.ya_ingreso || ingresoLocal) {
    const fechaPrimerIngreso = estudiante.fecha_ingreso_previo || ingresoLocal?.fecha_ingreso || timestamp
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
      codigo: 'RECHAZADO_YA_INGRESO',
      mensaje: 'El estudiante ya registró su ingreso a esta evaluación.',
      estudiante: datosEstudianteRespuesta,
      detalles: { primer_ingreso: fechaPrimerIngreso },
    }
  }

  // 6. ASIGNACIÓN POR AUXILIAR
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
      codigo: 'RECHAZADO_NO_ASIGNADO',
      mensaje: 'Estudiante no asignado a su módulo. Debe ingresar por la fila de otro auxiliar.',
      estudiante: datosEstudianteRespuesta,
    }
  }

  // 7. HABILITACIÓN DEL ESTUDIANTE
  if (estudiante.estado_habilitacion !== 'HABILITADO') {
    const motivo = estudiante.motivo_inhabilitacion || 'No cumple con los prerrequisitos asignados.'
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
      codigo: 'RECHAZADO_INHABILITADO',
      mensaje: 'Estudiante inhabilitado para rendir este examen.',
      estudiante: datosEstudianteRespuesta,
      detalles: { motivo_inhabilitacion: motivo },
    }
  }

  // 8. ACCESO PERMITIDO
  await db.asistencias_pendientes.add({
    id_examen: idExamen,
    id_estudiante: estudiante.id_estudiante,
    codigo_sis: sisBuscado,
    fecha_ingreso: timestamp,
    resultado: 'PERMITIDO',
    motivo: 'Ingreso autorizado.',
    sincronizado: false,
  })

  await db.estudiantes
    .where('[id_examen+codigo_sis]')
    .equals([idExamen, sisBuscado])
    .modify({
      ya_ingreso: true,
      fecha_ingreso_previo: timestamp,
    })

  notificarCambioOffline()

  return {
    acceso: true,
    codigo: 'PERMITIDO',
    mensaje: 'Ingreso autorizado.',
    estudiante: datosEstudianteRespuesta,
    detalles: {
      hora_ingreso: new Date(timestamp).toLocaleTimeString(),
      fecha_ingreso: new Date(timestamp).toLocaleDateString(),
    },
  }
}

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
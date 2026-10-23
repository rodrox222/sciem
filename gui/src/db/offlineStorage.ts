import Dexie, { type Table } from 'dexie';

export interface EstudianteOffline {
  id_estudiante: string;
  codigo_sis: string;
  ci: string;
  ci_extension?: string | null;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  foto_perfil_url?: string | null;
  estado_habilitacion: string;
  id_examen: string;
}

export interface AsistenciaOffline {
  id?: number;
  id_examen: string;
  codigo_sis: string;
  fecha_ingreso: string;
  resultado: 'PERMITIDO' | 'DENEGADO';
  motivo?: string | null;
  sincronizado: boolean;
}

export class SciemOfflineDatabase extends Dexie {
  estudiantes!: Table<EstudianteOffline, string>;
  asistencias_pendientes!: Table<AsistenciaOffline, number>;

  constructor() {
    super('SciemOfflineDB');

    this.version(1).stores({
      estudiantes: 'codigo_sis, id_estudiante, id_examen, estado_habilitacion',
      asistencias_pendientes: '++id, id_examen, codigo_sis, fecha_ingreso, sincronizado',
    });

    this.version(2).stores({
      estudiantes: 'codigo_sis, id_estudiante, id_examen, estado_habilitacion, [id_examen+codigo_sis]',
      asistencias_pendientes: '++id, id_examen, codigo_sis, fecha_ingreso, sincronizado, [id_examen+sincronizado], [id_examen+codigo_sis]',
    });
  }
}

export const db = new SciemOfflineDatabase();

export async function guardarPadronLocal(idExamen: string, listaEstudiantes: any[]): Promise<void> {
  await db.estudiantes.where('id_examen').equals(idExamen).delete();

  const registros: EstudianteOffline[] = listaEstudiantes.map((e) => ({
    id_estudiante: String(e.id_estudiante || e.id),
    codigo_sis: String(e.codigo_sis || e.sis),
    ci: String(e.ci || ''),
    ci_extension: e.ci_extension ?? null,
    nombre: e.nombre || '',
    apellido_paterno: e.apellido_paterno || '',
    apellido_materno: e.apellido_materno ?? null,
    foto_perfil_url: e.foto_perfil_url ?? null,
    estado_habilitacion: e.estado_habilitacion || 'HABILITADO',
    id_examen: idExamen,
  }));

  await db.estudiantes.bulkPut(registros);
}

function notificarCambioOffline() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('asistencia-offline-guardada'));
  }
}

/**
 * Valida el QR offline replicando los mismos casos de VerificacionController
 */
export async function validarQrOffline(
  idExamen: string,
  codigoSis: string,
  idExamenToken?: string,
  expiraAt?: number
): Promise<{ acceso: boolean; mensaje: string; estudiante?: string }> {
  const sisBuscado = String(codigoSis || '').trim();
  const timestamp = new Date().toISOString();

  // Caso 1: Horario de QR expirado
  if (expiraAt && Math.floor(Date.now() / 1000) > expiraAt) {
    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      codigo_sis: sisBuscado || 'DESCONOCIDO',
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: 'HORARIO_EXPIRADO',
      sincronizado: false,
    });
    notificarCambioOffline();
    return { acceso: false, mensaje: 'El código QR ha expirado. El horario de ingreso concluyó.' };
  }

  // Caso 2: Formato inválido o sin SIS
  if (!sisBuscado) {
    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      codigo_sis: 'DESCONOCIDO',
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: 'NO_REGISTRADO',
      sincronizado: false,
    });
    notificarCambioOffline();
    return { acceso: false, mensaje: 'El formato de la credencial no es legible.' };
  }

  // Caso 3: QR emitido para otro examen o materia
  if (idExamenToken && idExamenToken !== idExamen) {
    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      codigo_sis: sisBuscado,
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: 'EXAMEN_DISTINTO',
      sincronizado: false,
    });
    notificarCambioOffline();
    return { acceso: false, mensaje: 'El código QR pertenece a otra evaluación o materia.' };
  }

  // Búsqueda en el padrón local
  const estudiante = await db.estudiantes
    .where({ id_examen: idExamen, codigo_sis: sisBuscado })
    .first();

  // Caso 4: No inscrito en este examen
  if (!estudiante) {
    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      codigo_sis: sisBuscado,
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: 'NO_INSCRITO',
      sincronizado: false,
    });
    notificarCambioOffline();
    return { acceso: false, mensaje: 'El estudiante no se encuentra inscrito en esta evaluación.' };
  }

  // Caso 5: Inhabilitado por prerrequisitos
  if (estudiante.estado_habilitacion?.toUpperCase() !== 'HABILITADO') {
    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      codigo_sis: sisBuscado,
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: 'INHABILITADO',
      sincronizado: false,
    });
    notificarCambioOffline();
    return { acceso: false, mensaje: 'Estudiante inhabilitado para rendir este examen.' };
  }

  // Caso 6: Reingreso duplicado
  const yaRegistrado = await db.asistencias_pendientes
    .where({ id_examen: idExamen, codigo_sis: sisBuscado })
    .filter((item) => item.resultado === 'PERMITIDO')
    .first();

  if (yaRegistrado) {
    await db.asistencias_pendientes.add({
      id_examen: idExamen,
      codigo_sis: sisBuscado,
      fecha_ingreso: timestamp,
      resultado: 'DENEGADO',
      motivo: 'REINGRESO_DUPLICADO',
      sincronizado: false,
    });
    notificarCambioOffline();
    return { acceso: false, mensaje: '¡Alerta! Este estudiante ya registró su ingreso a esta evaluación.' };
  }

  // Ingreso autorizado
  await db.asistencias_pendientes.add({
    id_examen: idExamen,
    codigo_sis: sisBuscado,
    fecha_ingreso: timestamp,
    resultado: 'PERMITIDO',
    motivo: 'Ingreso autorizado.',
    sincronizado: false,
  });

  notificarCambioOffline();

  return {
    acceso: true,
    mensaje: 'Ingreso autorizado.',
    estudiante: `${estudiante.nombre} ${estudiante.apellido_paterno}`,
  };
}
import axios from 'axios';
import { apiUrl } from './apiUrl';
import { api } from './api';
import { db, guardarPadronLocal, type AsistenciaOffline } from '../db/offlineStorage';

function obtenerTokenValido(paramToken?: string): string {
  if (paramToken && paramToken.trim() !== '' && paramToken !== 'undefined' && paramToken !== 'null') {
    return paramToken;
  }
  return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
}

/**
 * Descarga la nómina completa, prerrequisitos, normas y metadatos del examen para guardarlos en Dexie
 */
export async function sincronizarDescargaExamen(idExamen: string, token: string) {
  const authToken = obtenerTokenValido(token);

  const response = await axios.get(apiUrl(`/examenes/${idExamen}/descargar-padron`), {
    headers: {
      Authorization: `Bearer ${authToken}`,
      Accept: 'application/json',
    },
  });

  const { estudiantes, examen, prerrequisitos, normas, rango_asignado } = response.data;

  // Extraer con certeza id_aula e id_docente del examen recibido
  const examenPreparado = {
    ...examen,
    id_aula: examen?.id_aula || examen?.aula_id || examen?.aula?.id || null,
    id_docente: examen?.id_docente || examen?.docente_id || examen?.docente?.id || null,
  };

  await guardarPadronLocal(
    idExamen,
    estudiantes || [],
    examenPreparado,
    prerrequisitos || [],
    normas || []
  );

  return {
    ...response.data,
    rango_asignado,
  };
}

/**
 * Envía las asistencias e intentos offline pendientes al backend y actualiza su estado
 */
export async function sincronizarSubidaAsistencias(idExamen: string, token: string) {
  const authToken = obtenerTokenValido(token);

  const pendientes: AsistenciaOffline[] = await db.asistencias_pendientes
    .where('id_examen')
    .equals(idExamen)
    .filter((item) => !item.sincronizado)
    .toArray();

  if (pendientes.length === 0) {
    return { message: 'No hay asistencias pendientes por sincronizar.', total: 0, total_procesados: 0 };
  }

  const payload = {
    asistencias: pendientes.map((item: AsistenciaOffline) => ({
      id_estudiante: item.id_estudiante || null,
      codigo_sis: item.codigo_sis,
      fecha_ingreso: item.fecha_ingreso,
      resultado: item.resultado,
      motivo: item.motivo || null,
    })),
  };

  const response = await axios.post(
    apiUrl(`/examenes/${idExamen}/sincronizar-asistencias`),
    payload,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/json',
      },
      timeout: 10000,
    }
  );

  const idsEliminar = pendientes
    .map((p) => p.id)
    .filter((id): id is number => typeof id === 'number');

  if (idsEliminar.length > 0) {
    await db.asistencias_pendientes
      .where('id')
      .anyOf(idsEliminar)
      .delete();
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('asistencia-offline-guardada'));
  }

  return response.data;
}

/**
 * Sube las modificaciones del examen guardadas en offline hacia Laravel
 */
export async function sincronizarExamenesModificados(): Promise<{ total_procesados: number }> {
  const pendientes = await db.examenes_modificados
    .filter((item) => !item.sincronizado)
    .toArray();

  let procesados = 0;

  for (const mod of pendientes) {
    const examenBase = await db.examenes.get(mod.id_examen);

    // Resuelve id_aula buscando en todas las propiedades posibles
    const aulaId =
      (mod.id_aula && String(mod.id_aula).trim() !== '')
        ? mod.id_aula
        : (examenBase?.id_aula && String(examenBase.id_aula).trim() !== '')
          ? examenBase.id_aula
          : (examenBase as any)?.aula_id
            || (examenBase as any)?.aula?.id
            || null;

    // Resuelve id_docente buscando en todas las propiedades posibles
    const docenteId =
      (mod.id_docente && String(mod.id_docente).trim() !== '')
        ? mod.id_docente
        : (examenBase?.id_docente && String(examenBase.id_docente).trim() !== '')
          ? examenBase.id_docente
          : (examenBase as any)?.docente_id
            || (examenBase as any)?.docente?.id
            || null;

    // Sanitizar formato de horas a "HH:mm"
    const horaIniSanitizada = (mod.hora_ini || examenBase?.hora_ini || '00:00').trim().slice(0, 5);
    const horaFinSanitizada = (mod.hora_fin || examenBase?.hora_fin || '00:00').trim().slice(0, 5);

    const payload = {
      nombre: mod.nombre || examenBase?.nombre,
      id_materia: mod.id_materia || examenBase?.id_materia,
      id_aula: aulaId,
      id_docente: docenteId,
      fecha: mod.fecha || examenBase?.fecha,
      hora_ini: horaIniSanitizada,
      hora_fin: horaFinSanitizada,
      estado: mod.estado || examenBase?.estado || 'Programado',
    };

    if (!payload.id_aula || !payload.id_docente) {
      console.warn(`Omitiendo sincronización de ${mod.id_examen}: faltan identificadores requeridos.`, payload);
      continue;
    }

    // Petición PUT al backend
    await api.put(`/examenes/${mod.id_examen}`, payload);

    // Marcar como sincronizado y actualizar el examen base en Dexie
    await db.examenes_modificados.update(mod.id_examen, { sincronizado: true });
    if (examenBase) {
      await db.examenes.update(mod.id_examen, { ...payload });
    }

    procesados++;
  }

  // Elimina de Dexie los que ya se sincronizaron con éxito
  await db.examenes_modificados.where('sincronizado').equals(1 as any).delete();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('examen-offline-actualizado'));
    window.dispatchEvent(new CustomEvent('asistencia-offline-guardada'));
  }

  return { total_procesados: procesados };
}

export async function purgarDatosOffline(): Promise<void> {
  await db.estudiantes.clear();
  await db.examenes.clear();
  await db.examenes_modificados.clear();
  await db.prerrequisitos.clear();
  await db.normas.clear();
  await db.asistencias_pendientes.clear();
}
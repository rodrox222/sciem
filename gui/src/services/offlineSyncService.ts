import axios from 'axios';
import { db, guardarPadronLocal, type AsistenciaOffline } from '../db/offlineStorage';

//http://localhost:8200/api
const rawUrl = (import.meta.env.VITE_API_URL?.trim() || 'http://192.168.1.17:8200')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

const API_URL = `${rawUrl}/api`;

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

  const response = await axios.get(`${API_URL}/examenes/${idExamen}/descargar-padron`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      Accept: 'application/json',
    },
  });

  const { estudiantes, examen, prerrequisitos, normas, rango_asignado } = response.data;

  // Persistir en Dexie: estudiantes, examen, prerrequisitos y normas
  await guardarPadronLocal(
    idExamen,
    estudiantes || [],
    examen,
    prerrequisitos || [],
    normas || []
  );

  return {
    ...response.data,
    rango_asignado,
  };
}

/**
 * Envía las asistencias e intentos offline pendientes al backend
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
    `${API_URL}/examenes/${idExamen}/sincronizar-asistencias`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/json',
      },
      timeout: 10000,
    }
  );

  const idsAEliminar = pendientes
    .map((p) => p.id)
    .filter((id): id is number => typeof id === 'number');

  if (idsAEliminar.length > 0) {
    await db.asistencias_pendientes.bulkDelete(idsAEliminar);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('asistencia-offline-guardada'));
  }

  return response.data;
}
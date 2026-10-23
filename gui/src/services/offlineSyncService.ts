import axios from 'axios';
import { db, guardarPadronLocal, type AsistenciaOffline } from '../db/offlineStorage';

const rawUrl = (import.meta.env.VITE_API_URL?.trim() || 'http://192.168.1.17:8200')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

const API_URL = `${rawUrl}/api`;

// Función auxiliar para obtener siempre un token válido
function obtenerTokenValido(paramToken?: string): string {
  if (paramToken && paramToken.trim() !== '' && paramToken !== 'undefined' && paramToken !== 'null') {
    return paramToken;
  }
  return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
}

/**
 * 1. Descarga la nómina del examen desde Laravel y la guarda en Dexie
 */
export async function sincronizarDescargaExamen(idExamen: string, token: string) {
  const authToken = obtenerTokenValido(token);

  const response = await axios.get(`${API_URL}/examenes/${idExamen}/descargar-padron`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      Accept: 'application/json',
    },
  });

  const { estudiantes } = response.data;
  await guardarPadronLocal(idExamen, estudiantes);

  return response.data;
}

/**
 * 2. Toma las asistencias pendientes en Dexie y las envía en lote al backend
 */
export async function sincronizarSubidaAsistencias(idExamen: string, token: string) {
  const authToken = obtenerTokenValido(token);

  // Consulta todos los registros acumulados para este examen
  const pendientes: AsistenciaOffline[] = await db.asistencias_pendientes
    .where('id_examen')
    .equals(idExamen)
    .toArray();

  if (pendientes.length === 0) {
    return { message: 'No hay asistencias pendientes por sincronizar.', total: 0, total_procesados: 0 };
  }

  const payload = {
    asistencias: pendientes.map((item: AsistenciaOffline) => ({
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
      timeout: 8000,
    }
  );

  // Obtener las claves primarias de los registros sincronizados
  const idsAEliminar = pendientes
    .map((p) => p.id)
    .filter((id): id is number => typeof id === 'number');

  // Eliminar de IndexedDB para vaciar la cola
  if (idsAEliminar.length > 0) {
    await db.asistencias_pendientes.bulkDelete(idsAEliminar);
  }

  // Notificar al componente para actualizar el botón inmediatamente
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('asistencia-offline-guardada'));
  }

  return response.data;
}
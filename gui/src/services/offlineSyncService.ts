import axios from 'axios';
import { apiUrl } from './apiUrl';
import { db, guardarPadronLocal, type AsistenciaOffline } from '../db/offlineStorage';
import { examenesService } from './examenes.service'

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
 * Envía las asistencias e intentos offline pendientes al backend y actualiza su estado a SINCRONIZADO (CA 4, CA 8)
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

  // CA 4: Pasar a Sincronizado = true en vez de eliminar
  const idsActualizar = pendientes
    .map((p) => p.id)
    .filter((id): id is number => typeof id === 'number');

  if (idsActualizar.length > 0) {
    await db.asistencias_pendientes
      .where('id')
      .anyOf(idsActualizar)
      .modify({ sincronizado: true });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('asistencia-offline-guardada'));
  }

  return response.data;
}

export async function sincronizarExamenesModificados(): Promise<void> {
  if (!navigator.onLine) return

  const modificados = await db.examenes_modificados
    .filter((item) => !item.sincronizado)
    .toArray()

  if (modificados.length === 0) return

  for (const mod of modificados) {
    try {
      // Se envía el PUT al backend con los datos que modificó el docente
      await examenesService.update(mod.id_examen, {
        nombre: mod.nombre as string,
        id_materia: mod.id_materia as string,
        fecha: mod.fecha as string,
        hora_ini: mod.hora_ini as string,
        hora_fin: mod.hora_fin as string,
        estado: mod.estado as any,
        id_aula: '', // Mantiene el aula asignada
        id_docente: '',
      })

      // Marcar como sincronizado en Dexie
      await db.examenes_modificados.update(mod.id_examen, {
        sincronizado: true,
      })
    } catch (error) {
      console.warn(`No se pudo sincronizar el examen ${mod.id_examen}:`, error)
    }
  }
}

export async function purgarDatosOffline(): Promise<void> {
  await db.estudiantes.clear();
  await db.examenes.clear();
  await db.prerrequisitos.clear();
  await db.normas.clear();
  await db.asistencias_pendientes.clear();
}
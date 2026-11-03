import axios from 'axios';
import { apiUrl } from './apiUrl';
import { validarQrOffline } from '../db/offlineStorage';

function obtenerTokenValido(paramToken?: string): string {
  if (paramToken && paramToken.trim() !== '' && paramToken !== 'undefined' && paramToken !== 'null') {
    return paramToken;
  }
  return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
}

export interface ResultadoEscaneo {
  success: boolean;
  acceso?: boolean; 
  metodo: 'ONLINE' | 'OFFLINE';
  mensaje: string;
  codigo?: string;
  estudiante?: {
    nombre_completo?: string;
    codigo_sis?: string;
    ci?: string;
    foto_url?: string | null;
  };
  detalles?: any;
}

interface QrPayload {
  id_estudiante?: string;
  codigo_sis?: string;
  sis?: string;
  id_examen?: string;
  materia?: string;
  expira_at?: number;
  timestamp?: number;
}

function extraerDatosQr(qrRaw: string): {
  codigoSis: string;
  idExamenToken?: string;
  idEstudianteToken?: string;
  materiaToken?: string;
} {
  const trimmed = qrRaw.trim();

  // Caso 1: Token Base64 / JWT
  if (trimmed.includes('.')) {
    try {
      const base64Part = trimmed.split('.')[0];
      const decodedJson = atob(base64Part);
      const parsed: QrPayload = JSON.parse(decodedJson);
      return {
        codigoSis: parsed.codigo_sis || parsed.sis || '',
        idExamenToken: parsed.id_examen,
        idEstudianteToken: parsed.id_estudiante,
        materiaToken: parsed.materia,
      };
    } catch {
      // Ignorar fallo de decodificación
    }
  }

  // Caso 2: JSON institucional directo
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed: QrPayload = JSON.parse(trimmed);
      return {
        codigoSis: parsed.codigo_sis || parsed.sis || '',
        idExamenToken: parsed.id_examen,
        idEstudianteToken: parsed.id_estudiante,
        materiaToken: parsed.materia,
      };
    } catch {
      // Ignorar fallo de parseo
    }
  }

  // Caso 3: Código SIS numérico en texto plano
  const esNumeroSis = /^\d{5,15}$/.test(trimmed);
  if (esNumeroSis) {
    return { codigoSis: trimmed };
  }

  return { codigoSis: '' };
}

export async function procesarIngresoEscaneado(
  qrData: string,
  idExamen: string,
  token: string,
  idAuxiliarActual?: string
): Promise<ResultadoEscaneo> {
  const { codigoSis, idExamenToken, idEstudianteToken, materiaToken } = extraerDatosQr(qrData);

  const hayConexion = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (hayConexion) {
    try {
      const authToken = obtenerTokenValido(token);

      const res = await axios.post(
        apiUrl(`/examenes/${idExamen}/verificar-ingreso`),
        { qr_data: qrData },
        { 
          headers: { 
            Authorization: `Bearer ${authToken}`,
            Accept: 'application/json' 
          },
          timeout: 4500
        }
      );

      return {
        success: true,
        metodo: 'ONLINE',
        mensaje: res.data.message || 'Ingreso autorizado.',
        estudiante: res.data.estudiante,
        detalles: res.data.detalles,
      };
    } catch (error: any) {
      if (error.response) {
        return {
          success: false,
          metodo: 'ONLINE',
          mensaje: error.response?.data?.message || 'Ingreso no autorizado.',
          detalles: error.response?.data,
        };
      }

      // Si falla la red, resuelve offline
      return resolverOffline(idExamen, codigoSis, idExamenToken, idEstudianteToken, idAuxiliarActual, materiaToken);
    }
  }

  // Modo offline sin internet
  return resolverOffline(idExamen, codigoSis, idExamenToken, idEstudianteToken, idAuxiliarActual, materiaToken);
}

async function resolverOffline(
  idExamen: string,
  codigoSis: string,
  idExamenToken?: string,
  idEstudianteToken?: string,
  idAuxiliarActual?: string,
  materiaToken?: string
): Promise<ResultadoEscaneo> {
  if (idExamenToken && idExamenToken !== idExamen) {
    return {
      success: false,
      acceso: false,
      metodo: 'OFFLINE',
      mensaje: 'El código QR presentado corresponde a otra evaluación o materia.',
      codigo: 'RECHAZADO_EXAMEN_DISTINTO',
      detalles: {
        codigo: 'RECHAZADO_EXAMEN_DISTINTO',
      },
    };
  }

  const resOffline = await validarQrOffline(
    idExamen,
    codigoSis,
    idExamenToken,
    undefined,
    idEstudianteToken,
    idAuxiliarActual,
    materiaToken
  );

  return {
    success: resOffline.acceso,
    acceso: resOffline.acceso,
    metodo: 'OFFLINE',
    mensaje: resOffline.mensaje,
    codigo: resOffline.codigo,
    estudiante: resOffline.estudiante
      ? {
          nombre_completo: typeof resOffline.estudiante === 'string' ? resOffline.estudiante : resOffline.estudiante.nombre_completo,
          codigo_sis: codigoSis,
          ci: typeof resOffline.estudiante === 'object' ? resOffline.estudiante.ci : undefined,
          foto_url: typeof resOffline.estudiante === 'object' ? resOffline.estudiante.foto_url : undefined,
        }
      : undefined,
    detalles: {
      codigo: resOffline.codigo,
      ...(resOffline.detalles || {}),
    },
  };
}
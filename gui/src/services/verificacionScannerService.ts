import axios from 'axios';
import { validarQrOffline } from '../db/offlineStorage';

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
  expira_at?: number;
  timestamp?: number;
}

function extraerDatosQr(qrRaw: string): {
  codigoSis: string;
  idExamenToken?: string;
  expiraAt?: number;
  idEstudianteToken?: string;
} {
  const trimmed = qrRaw.trim();

  // Caso 1: Token HMAC Base64 (HU-18)
  if (trimmed.includes('.')) {
    try {
      const base64Part = trimmed.split('.')[0];
      const decodedJson = atob(base64Part);
      const parsed: QrPayload = JSON.parse(decodedJson);
      return {
        codigoSis: parsed.codigo_sis || parsed.sis || '',
        idExamenToken: parsed.id_examen,
        idEstudianteToken: parsed.id_estudiante,
        expiraAt: parsed.expira_at,
      };
    } catch {
      // Si falla la decodificación Base64/JSON, no es un token válido
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
        expiraAt: parsed.expira_at,
      };
    } catch {
      // Ignorar fallo de parseo
    }
  }

  // Caso 3: Código SIS en texto plano (en la UMSS son estrictamente numéricos de 8 a 10 dígitos)
  const esNumeroSis = /^\d{8,10}$/.test(trimmed);
  if (esNumeroSis) {
    return { codigoSis: trimmed };
  }

  // Caso 4: Si es una URL, datos bancarios o cualquier otro formato ajeno
  return { codigoSis: '' };
}

export async function procesarIngresoEscaneado(
  qrData: string,
  idExamen: string,
  token: string,
  idAuxiliarActual?: string // Parámetro para delimitar el módulo
): Promise<ResultadoEscaneo> {
  const { codigoSis, idExamenToken, expiraAt, idEstudianteToken } = extraerDatosQr(qrData);

  const hayConexion = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (hayConexion) {
    try {
      const authToken = obtenerTokenValido(token);

      const res = await axios.post(
        `${API_URL}/examenes/${idExamen}/verificar-ingreso`,
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

      // Si se agota el tiempo de espera o se cae el servidor, resuelve offline
      return resolverOffline(idExamen, codigoSis, idExamenToken, expiraAt, idEstudianteToken, idAuxiliarActual);
    }
  }

  // Modo offline sin internet
  return resolverOffline(idExamen, codigoSis, idExamenToken, expiraAt, idEstudianteToken, idAuxiliarActual);
}

async function resolverOffline(
  idExamen: string,
  codigoSis: string,
  idExamenToken?: string,
  expiraAt?: number,
  idEstudianteToken?: string,
  idAuxiliarActual?: string
): Promise<ResultadoEscaneo> {
  const resOffline = await validarQrOffline(
    idExamen,
    codigoSis,
    idExamenToken,
    expiraAt,
    idEstudianteToken,
    idAuxiliarActual
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
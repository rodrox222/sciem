import axios from 'axios';
import { validarQrOffline } from '../db/offlineStorage';

//const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
//const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.17:8200/api';
const rawUrl = (import.meta.env.VITE_API_URL?.trim() || 'http://192.168.1.17:8200')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

const API_URL = `${rawUrl}/api`;

// Respaldo de token seguro
function obtenerTokenValido(paramToken?: string): string {
  if (paramToken && paramToken.trim() !== '' && paramToken !== 'undefined' && paramToken !== 'null') {
    return paramToken;
  }
  return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
}

export interface ResultadoEscaneo {
  success: boolean;
  metodo: 'ONLINE' | 'OFFLINE';
  mensaje: string;
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

function extraerDatosQr(qrRaw: string): { codigoSis: string; idExamenToken?: string; expiraAt?: number } {
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
        expiraAt: parsed.expira_at,
      };
    } catch {
      // Ignorar fallo de decodificación
    }
  }

  // Caso 2: JSON directo
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed: QrPayload = JSON.parse(trimmed);
      return {
        codigoSis: parsed.codigo_sis || parsed.sis || '',
        idExamenToken: parsed.id_examen,
        expiraAt: parsed.expira_at,
      };
    } catch {
      // Ignorar fallo de parseo
    }
  }

  // Caso 3: SIS en texto plano
  return { codigoSis: trimmed };
}

export async function procesarIngresoEscaneado(
  qrData: string,
  idExamen: string,
  token: string
): Promise<ResultadoEscaneo> {
  const { codigoSis, idExamenToken, expiraAt } = extraerDatosQr(qrData);

  // Si ya detecta fallo de examen o expiración localmente, procesa offline de inmediato
  if (idExamenToken && idExamenToken !== idExamen) {
    return resolverOffline(idExamen, codigoSis, idExamenToken, expiraAt);
  }

  if (expiraAt && Math.floor(Date.now() / 1000) > expiraAt) {
    return resolverOffline(idExamen, codigoSis, idExamenToken, expiraAt);
  }

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
          timeout: 4000
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
      if (!error.response) {
        return resolverOffline(idExamen, codigoSis, idExamenToken, expiraAt);
      }

      return {
        success: false,
        metodo: 'ONLINE',
        mensaje: error.response?.data?.message || 'Ingreso no autorizado.',
        detalles: error.response?.data,
      };
    }
  }

  return resolverOffline(idExamen, codigoSis, idExamenToken, expiraAt);
}

async function resolverOffline(
  idExamen: string,
  codigoSis: string,
  idExamenToken?: string,
  expiraAt?: number
): Promise<ResultadoEscaneo> {
  const resOffline = await validarQrOffline(idExamen, codigoSis, idExamenToken, expiraAt);

  return {
    success: resOffline.acceso,
    metodo: 'OFFLINE',
    mensaje: resOffline.mensaje,
    estudiante: resOffline.estudiante
      ? { nombre_completo: resOffline.estudiante, codigo_sis: codigoSis }
      : undefined,
  };
}
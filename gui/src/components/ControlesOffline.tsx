import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { db } from '../db/offlineStorage';
import { apiUrl } from '../services/apiUrl';
import {
  sincronizarDescargaExamen,
  sincronizarSubidaAsistencias,
  sincronizarExamenesModificados,
} from '../services/offlineSyncService';

interface Props {
  idExamen: string;
  token: string;
}

interface DetalleErrorSync {
  codigo_sis: string;
  error: string;
}

interface HttpErrorLike {
  response?: { data?: { message?: string } };
  code?: string;
  status?: number;
  message?: string;
}

function parseHttpError(err: unknown): HttpErrorLike {
  if (err && typeof err === 'object') {
    return err as HttpErrorLike;
  }
  return {};
}

export const ControlesOffline: React.FC<Props> = ({ idExamen, token }) => {
  const [pendientes, setPendientes] = useState<number>(0);
  const [cargando, setCargando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string>('');
  const [erroresSync, setErroresSync] = useState<DetalleErrorSync[]>([]);
  const [estaOnline, setEstaOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const estaOnlineRef = useRef<boolean>(estaOnline);
  const syncInFlightRef = useRef<boolean>(false);
  const healthCheckInFlightRef = useRef<Promise<boolean> | null>(null);

  const actualizarEstadoConexion = useCallback((conectado: boolean, mensajeOpcional?: string) => {
    estaOnlineRef.current = conectado;
    setEstaOnline(conectado);
    if (mensajeOpcional !== undefined) {
      setMensaje(mensajeOpcional);
    }
  }, []);

  const contarPendientes = useCallback(async () => {
    const asistenciasPendientes = await db.asistencias_pendientes
      .where('id_examen')
      .equals(idExamen)
      .filter((item) => !item.sincronizado)
      .count();

    const examenModificado = await db.examenes_modificados
      .where('id_examen')
      .equals(idExamen)
      .filter((item) => !item.sincronizado)
      .count();

    return {
      asistenciasPendientes,
      examenModificado,
      total: asistenciasPendientes + examenModificado,
    };
  }, [idExamen]);

  const actualizarDatos = useCallback(async () => {
    try {
      const { total } = await contarPendientes();
      setPendientes(total);
    } catch (e) {
      console.warn('Error al leer datos locales en Dexie:', e);
    }
  }, [contarPendientes]);

  /**
   * Comprueba conectividad real con una sola llamada puntual a GET /api/health
   * cuando un evento del sistema o de red lo amerita (sin polling periódico).
   */
  const verificarConexionReal = useCallback(async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await Network.getStatus();
        if (!status.connected) {
          return false;
        }
      } catch {
        // Si el plugin nativo falla, continúa con la verificación directa a /api/health
      }
    } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }

    if (healthCheckInFlightRef.current) {
      return healthCheckInFlightRef.current;
    }

    const promesa = (async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch(apiUrl('/health'), {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        });
        return res.ok || res.status === 204;
      } catch {
        return false;
      } finally {
        clearTimeout(timeoutId);
        healthCheckInFlightRef.current = null;
      }
    })();

    healthCheckInFlightRef.current = promesa;
    return promesa;
  }, []);

  const handleSincronizar = useCallback(async () => {
    if (syncInFlightRef.current) return;

    const { asistenciasPendientes, examenModificado, total: totalPendientes } = await contarPendientes();
    if (totalPendientes === 0) {
      setPendientes(0);
      return;
    }

    const hayRed = await verificarConexionReal();
    if (!hayRed) {
      actualizarEstadoConexion(false, 'No hay conexión a internet para sincronizar.');
      return;
    }

    actualizarEstadoConexion(true);
    syncInFlightRef.current = true;
    setCargando(true);
    setMensaje('');
    setErroresSync([]);

    try {
      let procesadosAsistencias = 0;
      let detallesErrores: DetalleErrorSync[] = [];

      if (asistenciasPendientes > 0) {
        const res = await sincronizarSubidaAsistencias(idExamen, token);
        procesadosAsistencias = res.total_procesados ?? res.total_sincronizados ?? res.total ?? 0;
        if (Array.isArray(res.detalles_errores)) {
          detallesErrores = res.detalles_errores;
        }
      }

      let procesadosExamen = 0;
      if (examenModificado > 0) {
        const resMod = await sincronizarExamenesModificados();
        procesadosExamen = resMod.total_procesados ?? 0;
      }

      const totalProcesados = procesadosAsistencias + procesadosExamen;
      setErroresSync(detallesErrores);

      if (detallesErrores.length > 0) {
        setMensaje(
          `Sincronización completada. Procesados: ${totalProcesados}. Observaciones/conflictos: ${detallesErrores.length}.`
        );
      } else {
        setMensaje(`Sincronización completada. Procesados: ${totalProcesados}`);
      }

      await actualizarDatos();
    } catch (err: unknown) {
      const httpErr = parseHttpError(err);
      const esErrorDeRed =
        !httpErr.response &&
        (httpErr.code === 'ERR_NETWORK' ||
          httpErr.status === 0 ||
          String(httpErr.message || '').toLowerCase().includes('network') ||
          String(httpErr.message || '').toLowerCase().includes('conectar'));

      if (esErrorDeRed) {
        actualizarEstadoConexion(false, 'Sin conexión con el servidor. Los datos siguen guardados localmente.');
      } else {
        setMensaje(httpErr.response?.data?.message || httpErr.message || 'Error al sincronizar con el servidor.');
      }
    } finally {
      syncInFlightRef.current = false;
      setCargando(false);
    }
  }, [idExamen, token, contarPendientes, verificarConexionReal, actualizarEstadoConexion, actualizarDatos]);

  const evaluarYAutoSincronizar = useCallback(async () => {
    const conectado = await verificarConexionReal();

    if (!conectado) {
      actualizarEstadoConexion(false, 'Sin conexión a internet. Trabajando en modo local.');
      return;
    }

    const estabaOffline = !estaOnlineRef.current;
    actualizarEstadoConexion(true);

    try {
      const { total } = await contarPendientes();
      if (total > 0) {
        if (estabaOffline) {
          setMensaje('Conexión detectada. Sincronizando datos...');
        }
        await handleSincronizar();
      } else if (estabaOffline) {
        setMensaje('Conexión restablecida.');
      }
    } catch (err) {
      console.warn('Error en la sincronización automática:', err);
    }
  }, [verificarConexionReal, actualizarEstadoConexion, contarPendientes, handleSincronizar]);

  useEffect(() => {
    let desmontado = false;
    let networkListener: PluginListenerHandle | null = null;

    const initTimer = window.setTimeout(() => {
      if (!desmontado) {
        void actualizarDatos();
        void evaluarYAutoSincronizar();
      }
    }, 0);

    const handleOnlineStatus = () => {
      void evaluarYAutoSincronizar();
    };

    const handleOfflineStatus = () => {
      actualizarEstadoConexion(false, 'Sin conexión a internet. Trabajando en modo local.');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void evaluarYAutoSincronizar();
      }
    };

    const handleNetworkError = () => {
      if (estaOnlineRef.current) {
        actualizarEstadoConexion(false, 'Sin conexión con el servidor. Trabajando en modo local.');
      }
    };

    const handleNetworkOk = () => {
      if (!estaOnlineRef.current) {
        actualizarEstadoConexion(true);
        void contarPendientes().then(({ total }) => {
          if (total > 0) {
            setMensaje('Conexión detectada. Sincronizando datos...');
            void handleSincronizar();
          }
        });
      }
    };

    if (Capacitor.isNativePlatform()) {
      void Network.addListener('networkStatusChange', (status) => {
        if (desmontado) return;
        if (!status.connected) {
          actualizarEstadoConexion(false, 'Sin conexión a internet. Trabajando en modo local.');
        } else {
          void evaluarYAutoSincronizar();
        }
      }).then((handle) => {
        if (desmontado) {
          void handle.remove();
        } else {
          networkListener = handle;
        }
      });
    }

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('sci-network-error', handleNetworkError);
    window.addEventListener('sci-network-ok', handleNetworkOk);
    window.addEventListener('asistencia-offline-guardada', actualizarDatos);
    window.addEventListener('offline-scan-registered', actualizarDatos);
    window.addEventListener('examen-offline-actualizado', actualizarDatos);

    return () => {
      desmontado = true;
      window.clearTimeout(initTimer);
      if (networkListener) {
        void networkListener.remove();
      }
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('sci-network-error', handleNetworkError);
      window.removeEventListener('sci-network-ok', handleNetworkOk);
      window.removeEventListener('asistencia-offline-guardada', actualizarDatos);
      window.removeEventListener('offline-scan-registered', actualizarDatos);
      window.removeEventListener('examen-offline-actualizado', actualizarDatos);
    };
  }, [
    actualizarDatos,
    actualizarEstadoConexion,
    contarPendientes,
    evaluarYAutoSincronizar,
    handleSincronizar,
  ]);

  const handleDescargar = async () => {
    setCargando(true);
    setMensaje('');
    setErroresSync([]);
    try {
      const data = await sincronizarDescargaExamen(idExamen, token);
      const total = data.total_estudiantes ?? data.estudiantes?.length ?? 0;
      const rango = data.rango_asignado;
      const esDocente = Boolean(rango?.es_docente || data.rol === 'docente');

      actualizarEstadoConexion(true);

      if (!esDocente && rango?.desde && rango?.hasta) {
        setMensaje(`Padrón descargado: ${total} estudiantes (${rango.desde} a ${rango.hasta}).`);
      } else {
        setMensaje(`Nómina completa descargada: ${total} estudiantes listos offline.`);
      }

      await actualizarDatos();
    } catch (err: unknown) {
      const httpErr = parseHttpError(err);
      if (!httpErr.response) {
        actualizarEstadoConexion(false, 'Sin conexión con el servidor al descargar la nómina.');
      } else {
        setMensaje(httpErr.response?.data?.message || httpErr.message || 'Error al descargar nómina.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4 text-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800 text-sm">Operación Offline</h3>
        <span
          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
            estaOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 animate-pulse'
          }`}
        >
          {estaOnline ? '● En línea' : '○ Sin conexión'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleDescargar}
          disabled={cargando || !estaOnline}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          {cargando ? 'Descargando...' : 'Descargar datos'}
        </button>

        <button
          type="button"
          onClick={() => void handleSincronizar()}
          disabled={cargando || pendientes === 0 || !estaOnline}
          className={`px-3 py-1.5 rounded text-white ${
            pendientes === 0 || cargando || !estaOnline
              ? 'bg-green-600/50 cursor-not-allowed opacity-50'
              : 'bg-green-600 hover:bg-green-700 cursor-pointer'
          }`}
        >
          Sincronizar ({pendientes} pendientes)
        </button>
      </div>

      {mensaje && (
        <p className={`mt-2 font-medium ${mensaje.includes('Error') ? 'text-red-600' : 'text-gray-600'}`}>
          {mensaje}
        </p>
      )}

      {erroresSync.length > 0 && (
        <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-amber-900 space-y-1">
          <p className="font-semibold text-[11px]">Detalle de conflictos u observaciones ({erroresSync.length}):</p>
          <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
            {erroresSync.map((item, idx) => (
              <li key={`${item.codigo_sis}-${idx}`}>
                <span className="font-semibold">SIS {item.codigo_sis}:</span> {item.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
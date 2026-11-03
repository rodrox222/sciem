import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../db/offlineStorage';
import { 
  sincronizarDescargaExamen, 
  sincronizarSubidaAsistencias, 
  sincronizarExamenesModificados 
} from '../services/offlineSyncService';

interface Props {
  idExamen: string;
  token: string;
}

export const ControlesOffline: React.FC<Props> = ({ idExamen, token }) => {
  const [pendientes, setPendientes] = useState<number>(0);
  const [cargando, setCargando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string>('');
  const [estaOnline, setEstaOnline] = useState<boolean>(navigator.onLine);

  const actualizarDatos = useCallback(async () => {
    try {
      const asistenciasPendientes = await db.asistencias_pendientes
        .where('id_examen')
        .equals(idExamen)
        .filter((item) => !item.sincronizado)
        .count()

      const examenModificado = await db.examenes_modificados
        .where('id_examen')
        .equals(idExamen)
        .filter((item) => !item.sincronizado)
        .count()

      setPendientes(asistenciasPendientes + examenModificado)
    } catch (e) {
      console.warn('Error al leer datos locales en Dexie:', e)
    }
  }, [idExamen])

  const handleSincronizar = useCallback(async () => {
    if (!navigator.onLine) {
      setMensaje('No hay conexión a internet para sincronizar.');
      return;
    }

    setCargando(true);
    setMensaje('');
    try {
      // Sube asistencias
      const res = await sincronizarSubidaAsistencias(idExamen, token);
      
      // Sube modificaciones del examen
      await sincronizarExamenesModificados();

      const total = res.total_procesados ?? res.total_sincronizados ?? res.total ?? 0;
      setMensaje(`Sincronización completada. Procesados: ${total}`);
      await actualizarDatos();
    } catch (err: any) {
      setMensaje(err.response?.data?.message || 'Error al sincronizar con el servidor.');
    } finally {
      setCargando(false);
    }
  }, [idExamen, token, actualizarDatos]);

  useEffect(() => {
    void actualizarDatos();

    const handleOnlineStatus = async () => {
      setEstaOnline(true);
      setMensaje('Conexión detectada. Sincronizando datos...');
      try {
        await handleSincronizar();
      } catch (err) {
        console.warn('Error en la sincronización automática:', err);
      }
    };

    const handleOfflineStatus = () => {
      setEstaOnline(false);
      setMensaje('Sin conexión a internet. Trabajando en modo local.');
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    window.addEventListener('asistencia-offline-guardada', actualizarDatos);
    window.addEventListener('offline-scan-registered', actualizarDatos);
    window.addEventListener('examen-offline-actualizado', actualizarDatos);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
      window.removeEventListener('asistencia-offline-guardada', actualizarDatos);
      window.removeEventListener('offline-scan-registered', actualizarDatos);
      window.removeEventListener('examen-offline-actualizado', actualizarDatos);
    };
  }, [actualizarDatos, handleSincronizar]);

  const handleDescargar = async () => {
    setCargando(true);
    setMensaje('');
    try {
      const data = await sincronizarDescargaExamen(idExamen, token);
      const total = data.total_estudiantes ?? data.estudiantes?.length ?? 0;
      const rango = data.rango_asignado;
      const esDocente = Boolean(rango?.es_docente || data.rol === 'docente');

      if (!esDocente && rango?.desde && rango?.hasta) {
        setMensaje(`Padrón descargado: ${total} estudiantes (${rango.desde} a ${rango.hasta}).`);
      } else {
        setMensaje(`Nómina completa descargada: ${total} estudiantes listos offline.`);
      }

      await actualizarDatos();
    } catch (err: any) {
      setMensaje(err.response?.data?.message || 'Error al descargar nómina.');
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
          onClick={handleSincronizar}
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
    </div>
  );
};
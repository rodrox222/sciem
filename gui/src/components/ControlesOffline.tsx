import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../db/offlineStorage';
import { sincronizarDescargaExamen, sincronizarSubidaAsistencias } from '../services/offlineSyncService';

interface Props {
  idExamen: string;
  token: string;
}

export const ControlesOffline: React.FC<Props> = ({ idExamen, token }) => {
  const [pendientes, setPendientes] = useState<number>(0);
  const [cargando, setCargando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string>('');

  const actualizarContador = useCallback(async () => {
    try {
      const total = await db.asistencias_pendientes
        .where('id_examen')
        .equals(idExamen)
        .count();

      setPendientes(total);
    } catch (e) {
      console.warn('Error al leer asistencias pendientes en Dexie:', e);
    }
  }, [idExamen]);

  useEffect(() => {
    void actualizarContador();

    const handleOfflineEvent = () => void actualizarContador();
    window.addEventListener('offline-scan-registered', handleOfflineEvent);
    window.addEventListener('asistencia-offline-guardada', handleOfflineEvent);

    const interval = setInterval(() => {
      void actualizarContador();
    }, 2000);

    return () => {
      window.removeEventListener('offline-scan-registered', handleOfflineEvent);
      window.removeEventListener('asistencia-offline-guardada', handleOfflineEvent);
      clearInterval(interval);
    };
  }, [actualizarContador]);

  const handleDescargar = async () => {
    setCargando(true);
    setMensaje('');
    try {
      const data = await sincronizarDescargaExamen(idExamen, token);
      const total = data.total_estudiantes ?? data.estudiantes?.length ?? 0;
      setMensaje(`Padrón descargado (${total} estudiantes listos offline).`);
      await actualizarContador();
    } catch (err: any) {
      setMensaje(err.response?.data?.message || 'Error al descargar nómina.');
    } finally {
      setCargando(false);
    }
  };

  const handleSincronizar = async () => {
    setCargando(true);
    setMensaje('');
    try {
      const res = await sincronizarSubidaAsistencias(idExamen, token);
      const total = res.total_procesados ?? res.total_sincronizados ?? res.total ?? 0;
      setMensaje(`Sincronización completada. Procesados: ${total}`);
      await actualizarContador();
    } catch (err: any) {
      setMensaje(err.response?.data?.message || 'Error al sincronizar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
      <h3 className="font-semibold text-gray-700 mb-2">Modo Offline</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleDescargar}
          disabled={cargando}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {cargando ? 'Descargando...' : 'Descargar Padrón Local'}
        </button>

        <button
          onClick={handleSincronizar}
          disabled={cargando || pendientes === 0}
          className={`px-3 py-1.5 rounded text-sm text-white ${
            pendientes === 0 || cargando
              ? 'bg-green-600/50 cursor-not-allowed opacity-50'
              : 'bg-green-600 hover:bg-green-700 cursor-pointer'
          }`}
        >
          Sincronizar Asistencias ({pendientes})
        </button>
      </div>
      {mensaje && (
        <p className={`text-xs mt-2 ${mensaje.includes('Error') ? 'text-red-600' : 'text-gray-600'}`}>
          {mensaje}
        </p>
      )}
    </div>
  );
};
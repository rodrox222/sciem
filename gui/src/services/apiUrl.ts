/**
 * Ruta de la API compartida por todas las peticiones del frontend.
 *
 * Sin VITE_API_URL utiliza /api sobre el mismo origen (proxy de Vite en desarrollo).
 * Si se configura VITE_API_URL, admite tanto la URL del servidor como /api.
 */
export function apiUrl(path: string): string {
  const configured = import.meta.env.VITE_API_URL?.trim() || '';
  const base = configured.replace(/\/+$/, '').replace(/\/api$/i, '');
  const requestedPath = path.startsWith('/') ? path : `/${path}`;
  const suffix = requestedPath === '/api'
    ? ''
    : requestedPath.replace(/^\/api(?=\/)/, '');

  return `${base}/api${suffix}`;
}

export type ValidationErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  errors?: ValidationErrors;
  data?: unknown;

  constructor(message: string, status: number, errors?: ValidationErrors, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.data = data;
  }
}

// Resuelve la URL: si no existe en .env, usa directamente la IP de tu servidor local
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  const url = envUrl || 'http://192.168.1.17:8200';
  return url.replace(/\/api\/?$/, '').replace(/\/$/, '');
};

//const getBaseUrl = (): string => {
//  const envUrl = import.meta.env.VITE_API_URL?.trim();
//  return (envUrl || '/api').replace(/\/$/, '');
//};

const parseResponse = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
};

/**
 * Cliente principal para peticiones HTTP a la API de Laravel
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retries = 2
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers = new Headers(options.headers);

  headers.set('Accept', 'application/json');

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  //const cleanPath = path.startsWith('/') ? path : `/${path}`;
  //const url = `${getBaseUrl()}${cleanPath}`;
  //const method = (options.method ?? 'GET').toUpperCase();

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Garantiza que SIEMPRE viaje hacia /api/... sin duplicar /api/api
  const apiPath = cleanPath.startsWith('/api/') ? cleanPath : `/api${cleanPath}`;
  const url = `${getBaseUrl()}${apiPath}`;
  const method = (options.method ?? 'GET').toUpperCase();

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (retries > 0 && method === 'GET') {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return apiRequest<T>(path, options, retries - 1);
    }
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifica que los contenedores de Docker estén activos.',
      0
    );
  }

  if (response.status === 503 && retries > 0 && method === 'GET') {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return apiRequest<T>(path, options, retries - 1);
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const errorPayload = payload as {
      message?: string;
      errors?: ValidationErrors;
    } | null;

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('user_role');
    }

    throw new ApiError(
      errorPayload?.message || `Error en la petición (HTTP ${response.status})`,
      response.status,
      errorPayload?.errors,
      payload
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(path, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(path, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
/** Descarga binaria autenticada, sin reconstruir el archivo en el navegador. */
export async function apiDownload(
  path: string,
  options: { signal?: AbortSignal } = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const pathWithSlash = path.startsWith('/') ? path : `/${path}`
  const url = `${getBaseUrl()}${pathWithSlash.startsWith('/api/') ? pathWithSlash : `/api${pathWithSlash}`}`
  const headers = new Headers({ Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream' })
  const token = localStorage.getItem('auth_token')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(url, { method: 'GET', headers, signal: options.signal })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ApiError('No se pudo conectar con el servidor para descargar el reporte.', 0)
  }

  if (!response.ok) {
    const payload = await parseResponse(response) as { message?: string; errors?: ValidationErrors } | null
    if (response.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      localStorage.removeItem('user_role')
    }
    throw new ApiError(payload?.message || `No se pudo descargar (HTTP ${response.status}).`, response.status, payload?.errors)
  }

  const type = response.headers.get('content-type') || ''
  if (type.includes('application/json') || type.includes('text/html')) {
    throw new ApiError('El servidor no devolvió un archivo descargable.', 502)
  }
  const disposition = response.headers.get('content-disposition') || ''
  const encoded = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  const standard = disposition.match(/filename\s*=\s*"([^"]+)"/i)
    ?? disposition.match(/filename\s*=\s*([^;]+)/i)
  let filename: string | null
  try {
    filename = encoded ? decodeURIComponent(encoded[1]) : standard?.[1]?.trim() ?? null
  } catch {
    filename = standard?.[1]?.trim() ?? null
  }
  if (filename) {
    filename = Array.from(filename, (character) =>
      character.charCodeAt(0) < 32 || character === '/' || character === '\\' ? '_' : character,
    ).join('').replace(/^\.+/, '').slice(0, 180) || null
  }
  return { blob: await response.blob(), filename }
}

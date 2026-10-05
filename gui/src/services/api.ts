// gui/src/services/api.ts

export type ValidationErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  errors?: ValidationErrors;

  constructor(message: string, status: number, errors?: ValidationErrors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

// Resuelve la URL desde el .env del frontend. 
// Si no existe, usa la ruta relativa /api para cuando se usa proxy o mismo host.
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();
  return (envUrl || '/api').replace(/\/$/, '');
};

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
 * Cliente principal para peticiones HTTP a la API de Laravel.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers = new Headers(options.headers);

  headers.set('Accept', 'application/json');

  // Solo añade Content-Type JSON si no es FormData (evita romper subida de archivos)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Normaliza el path para asegurar que empiece con slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${getBaseUrl()}${cleanPath}`;

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifica que los contenedores de Docker estén activos.',
      0
    );
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
    }

    throw new ApiError(
      errorPayload?.message || `Error en la petición (HTTP ${response.status})`,
      response.status,
      errorPayload?.errors
    );
  }

  return payload as T;
}

// Métodos auxiliares rápidos
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
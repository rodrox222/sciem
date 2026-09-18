const DEFAULT_API_URL = 'http://localhost:8200/api'

export type ValidationErrors = Record<string, string[]>

export class ApiError extends Error {
  status: number
  errors?: ValidationErrors

  constructor(message: string, status: number, errors?: ValidationErrors) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

const getApiUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim()
  return (configuredUrl || DEFAULT_API_URL).replace(/\/$/, '')
}

const parseResponse = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return response.json()

  const text = await response.text()
  return text ? { message: text } : null
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('auth_token')
  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response

  try {
    response = await fetch(`${getApiUrl()}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifica que la API esté ejecutándose.',
      0,
    )
  }

  const payload = await parseResponse(response)

  if (!response.ok) {
    const errorPayload = payload as
      | { message?: string; errors?: ValidationErrors }
      | null

    if (response.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }

    throw new ApiError(
      errorPayload?.message || 'No se pudo completar la solicitud.',
      response.status,
      errorPayload?.errors,
    )
  }

  return payload as T
}

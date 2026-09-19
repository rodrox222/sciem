import { apiRequest } from './apiClient'

export type AulaEstado = 'Disponible' | 'Mantenimiento' | 'Ocupada'

export interface Aula {
  id: string
  nombre: string
  ubicacion: string
  capacidad: number
  estado: AulaEstado
  created_at?: string
  updated_at?: string
}

export interface AulaPayload {
  nombre: string
  ubicacion: string
  capacidad: number
  estado: AulaEstado
}

export interface PaginatedResponse<T> {
  current_page: number
  data: T[]
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

interface AulaMutationResponse {
  message: string
  aula: Aula
}

interface AulaFilters {
  search?: string
  estado?: AulaEstado | ''
  page?: number
  perPage?: number
}

const buildQuery = (filters: AulaFilters) => {
  const params = new URLSearchParams()

  if (filters.search) params.set('search', filters.search)
  if (filters.estado) params.set('estado', filters.estado)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.perPage) params.set('per_page', String(filters.perPage))

  const query = params.toString()
  return query ? `?${query}` : ''
}

export const aulasService = {
  list(filters: AulaFilters = {}) {
    return apiRequest<PaginatedResponse<Aula>>(
      `/aulas${buildQuery(filters)}`,
    )
  },

  create(payload: AulaPayload) {
    return apiRequest<AulaMutationResponse>('/aulas', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  update(id: string, payload: AulaPayload) {
    return apiRequest<AulaMutationResponse>(`/aulas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
}

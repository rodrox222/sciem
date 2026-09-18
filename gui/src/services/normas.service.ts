import { apiRequest } from './apiClient'
import type { PaginatedResponse } from './aulas.service'

export type NormaTipo = 'General' | 'Particular'

export interface Norma {
  id: string
  titulo: string
  descripcion: string
  tipo: NormaTipo
  created_at?: string
  updated_at?: string
}

export interface NormaPayload {
  titulo: string
  descripcion: string
  tipo: NormaTipo
}

interface NormaMutationResponse {
  message: string
  norma: Norma
}

interface NormaFilters {
  search?: string
  tipo?: NormaTipo | ''
  page?: number
  all?: boolean
}

const buildQuery = (filters: NormaFilters) => {
  const params = new URLSearchParams()

  if (filters.search) params.set('search', filters.search)
  if (filters.tipo) params.set('tipo', filters.tipo)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.all) params.set('all', '1')

  const query = params.toString()
  return query ? `?${query}` : ''
}

export const normasService = {
  list(filters: NormaFilters = {}) {
    return apiRequest<PaginatedResponse<Norma>>(
      `/normas${buildQuery(filters)}`,
    )
  },

  listAll(filters: Omit<NormaFilters, 'all' | 'page'> = {}) {
    return apiRequest<Norma[]>(
      `/normas${buildQuery({ ...filters, all: true })}`,
    )
  },

  create(payload: NormaPayload) {
    return apiRequest<NormaMutationResponse>('/normas', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  update(id: string, payload: NormaPayload) {
    return apiRequest<NormaMutationResponse>(`/normas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  assignToExam(examId: string, normIds: string[]) {
    return apiRequest<{ message: string; normas: Norma[] }>(
      `/examenes/${examId}/normas`,
      {
        method: 'POST',
        body: JSON.stringify({ normas: normIds }),
      },
    )
  },
}

import { api } from './api'
import type { PaginatedResponse } from '@/types/api'

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

export interface NormaFilters {
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
    return api.get<PaginatedResponse<Norma>>(`/normas${buildQuery(filters)}`)
  },

  listAll(filters: Omit<NormaFilters, 'all' | 'page'> = {}) {
    return api.get<Norma[]>(`/normas${buildQuery({ ...filters, all: true })}`)
  },

  create(payload: NormaPayload) {
    return api.post<NormaMutationResponse>('/normas', payload)
  },

  update(id: string, payload: NormaPayload) {
    return api.put<NormaMutationResponse>(`/normas/${id}`, payload)
  },

  createParticularForExam(
    examId: string,
    particulares: Pick<NormaPayload, 'titulo' | 'descripcion'>[],
  ) {
    return api.post<{ message: string; normas: Norma[] }>(
      `/examenes/${examId}/normas/particulares`,
      { particulares },
    )
  },

  assignToExam(examId: string, normIds: string[]) {
    return api.post<{ message: string; normas: Norma[] }>(
      `/examenes/${examId}/normas`,
      { normas: normIds },
    )
  },
}
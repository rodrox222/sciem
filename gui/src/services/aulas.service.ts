import { api } from './api'
import type { PaginatedResponse } from '@/types/api'

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

interface AulaMutationResponse {
  message: string
  aula: Aula
}

export interface AulaFilters {
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
    return api.get<PaginatedResponse<Aula>>(`/aulas${buildQuery(filters)}`)
  },

  get(id: string) {
    return api.get<Aula>(`/aulas/${id}`)
  },

  create(payload: AulaPayload) {
    return api.post<AulaMutationResponse>('/aulas', payload)
  },

  update(id: string, payload: AulaPayload) {
    return api.put<AulaMutationResponse>(`/aulas/${id}`, payload)
  },
}
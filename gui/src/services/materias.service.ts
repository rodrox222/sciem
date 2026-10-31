import { api } from './api'
import type { PaginatedResponse } from '@/types/api'

export interface Materia {
  id: string
  nombre: string
  codigo?: string | null
  examenes_count?: number
  created_at?: string
  updated_at?: string
}

export interface MateriaPayload {
  nombre: string
  codigo?: string | null
}

export interface MateriaFilters {
  search?: string
  page?: number
  perPage?: number
}

let cachedMateriasAll: Materia[] | null = null

const buildQuery = (filters: MateriaFilters): string => {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  if (filters.perPage) params.set('per_page', String(filters.perPage))

  const query = params.toString()
  return query ? `?${query}` : ''
}

export const materiasService = {
  list(filters: MateriaFilters = {}) {
    return api.get<PaginatedResponse<Materia>>(`/materias${buildQuery(filters)}`)
  },

  async listAll(): Promise<Materia[]> {
    if (cachedMateriasAll && cachedMateriasAll.length > 0) {
      return cachedMateriasAll
    }

    // Si no hay red, leer desde el respaldo en localStorage
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const local = localStorage.getItem('sciem_materias_cache')
      if (local) {
        cachedMateriasAll = JSON.parse(local)
        return cachedMateriasAll || []
      }
    }

    try {
      const res = await api.get<Materia[]>('/materias?all=1')
      cachedMateriasAll = res
      localStorage.setItem('sciem_materias_cache', JSON.stringify(res))
      return res
    } catch (error) {
      const local = localStorage.getItem('sciem_materias_cache')
      if (local) {
        return JSON.parse(local)
      }
      throw error
    }
  },

  get(id: string) {
    return api.get<Materia>(`/materias/${id}`)
  },

  async create(payload: MateriaPayload) {
    const res = await api.post<{ message: string; materia: Materia }>('/materias', payload)
    cachedMateriasAll = null
    return res
  },

  async update(id: string, payload: MateriaPayload) {
    const res = await api.put<{ message: string; materia: Materia }>(`/materias/${id}`, payload)
    cachedMateriasAll = null
    return res
  },

  async delete(id: string) {
    const res = await api.delete<{ message: string }>(`/materias/${id}`)
    cachedMateriasAll = null
    return res
  },

  clearCache() {
    cachedMateriasAll = null
  },
}
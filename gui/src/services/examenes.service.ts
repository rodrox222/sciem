import { apiRequest } from './api'
import type { PaginatedResponse } from './aulas.service'
import type { Norma } from './normas.service'

export type ExamenEstado = 'Programado' | 'En proceso' | 'Terminado'

export interface CatalogItem {
  id: string
  nombre: string
}

export interface DocenteItem extends CatalogItem {
  apellido_paterno?: string
  apellido_materno?: string
  apellido?: string
  activo?: boolean
  tipo_usuario?: string
}

export interface Examen {
  id: string
  nombre: string
  id_materia: string
  estado: ExamenEstado
  fecha: string
  hora_ini: string
  hora_fin: string
  id_aula: string
  id_docente: string
  materia?: CatalogItem | null
  aula?: CatalogItem | null
  docente?: DocenteItem | null
  normas?: Norma[]
  created_at?: string
  updated_at?: string
}

export interface ExamenPayload {
  nombre: string
  id_materia: string
  estado: ExamenEstado
  fecha: string
  hora_ini: string
  hora_fin: string
  id_aula: string
  id_docente: string
}

interface ExamenMutationResponse {
  message: string
  examen: Examen
}

interface MateriaMutationResponse {
  message: string
  materia: CatalogItem
}

interface ExamenFilters {
  search?: string
  estado?: ExamenEstado | ''
  fecha?: string
  page?: number
  perPage?: number
}

const buildExamQuery = (filters: ExamenFilters) => {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.estado) params.set('estado', filters.estado)
  if (filters.fecha) params.set('fecha', filters.fecha)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.perPage) params.set('per_page', String(filters.perPage))
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const examenesService = {
  list(filters: ExamenFilters = {}) {
    return apiRequest<PaginatedResponse<Examen>>(
      `/examenes${buildExamQuery(filters)}`,
    )
  },

  get(id: string) {
    return apiRequest<Examen>(`/examenes/${id}`)
  },

  create(payload: ExamenPayload) {
    return apiRequest<ExamenMutationResponse>('/examenes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  update(id: string, payload: ExamenPayload) {
    return apiRequest<ExamenMutationResponse>(`/examenes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  listMaterias() {
    return apiRequest<CatalogItem[]>('/materias?all=1')
  },

  createMateria(nombre: string) {
    return apiRequest<MateriaMutationResponse>('/materias', {
      method: 'POST',
      body: JSON.stringify({ nombre }),
    })
  },

  listDocentes() {
    return apiRequest<PaginatedResponse<DocenteItem>>(
      '/users?tipo_usuario=docente&activo=true',
    )
  },
}

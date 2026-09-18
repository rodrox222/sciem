import { apiRequest } from './apiClient'
import type { PaginatedResponse } from './aulas.service'

export type EstadoInscripcion = 'Habilitado' | 'Inhabilitado'

export interface Estudiante {
  id: string
  codigo_sis: string
  ci: string
  ci_extension?: string | null
  nombre: string
  apellido_paterno: string
  apellido_materno?: string | null
  email_institucional: string
  activo: boolean
  pivot?: {
    estado: EstadoInscripcion
    created_at?: string
  }
  created_at?: string
  updated_at?: string
}

export interface EstudiantePayload {
  codigo_sis: string
  ci: string
  ci_extension?: string | null
  nombre: string
  apellido_paterno: string
  apellido_materno?: string | null
  email_institucional: string
  activo?: boolean
}

export interface InscripcionPayload extends EstudiantePayload {
  estado: EstadoInscripcion
}

interface MutationResponse {
  message: string
  estudiante: Estudiante
}

export const estudiantesService = {
  list(filters: { search?: string; page?: number; perPage?: number } = {}) {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.page) params.set('page', String(filters.page))
    if (filters.perPage) params.set('per_page', String(filters.perPage))
    const query = params.toString()
    return apiRequest<PaginatedResponse<Estudiante>>(
      `/estudiantes${query ? `?${query}` : ''}`,
    )
  },

  listByExam(examId: string, page = 1) {
    return apiRequest<PaginatedResponse<Estudiante>>(
      `/examenes/${examId}/estudiantes?page=${page}`,
    )
  },

  enroll(examId: string, payload: InscripcionPayload) {
    return apiRequest<MutationResponse>(`/examenes/${examId}/estudiantes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

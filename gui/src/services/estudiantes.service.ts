import { api } from './api'
import type { PaginatedResponse } from '@/types/api'

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
    motivo_estado?: string | null
    ajuste_manual?: boolean
    fecha_ajuste_manual?: string | null
    created_at?: string
    updated_at?: string
  }
  created_at?: string
  updated_at?: string
}

export interface EstudianteInscritoExamen {
  id: string
  codigo_sis: string
  ci: string
  ci_extension?: string | null
  nombre_completo: string
  email_institucional: string
  estado: EstadoInscripcion
  motivo_estado?: string | null
  ajuste_manual: boolean
  fecha_ajuste_manual?: string | null
}

export interface EstudiantesExamenResponse {
  examen_id: string
  nombre: string
  estudiantes: EstudianteInscritoExamen[]
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
  estado?: EstadoInscripcion
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
    return api.get<PaginatedResponse<Estudiante>>(
      `/estudiantes${query ? `?${query}` : ''}`,
    )
  },

  listByExam(examId: string) {
    return api.get<EstudiantesExamenResponse>(`/examenes/${examId}/estudiantes`)
  },

  enroll(examId: string, payload: InscripcionPayload) {
    return api.post<MutationResponse>(`/examenes/${examId}/estudiantes`, payload)
  },

  unenroll(examId: string, estudianteId: string) {
    return api.delete<{ message: string }>(`/examenes/${examId}/estudiantes/${estudianteId}`)
  },
}
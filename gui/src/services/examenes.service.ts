import { api } from './api'
import type { PaginatedResponse } from '@/types/api'
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
  normas_ids?: string[]
  normas_particulares?: { titulo: string; descripcion: string }[]
}

interface ExamenMutationResponse {
  message: string
  examen: Examen
}

export interface Prerrequisito {
  id: string
  id_examen: string
  titulo: string
  descripcion?: string | null
  created_at?: string
  updated_at?: string
}

export interface PrerrequisitoPayload {
  titulo: string
  descripcion?: string | null
}

export interface HabilitacionPayload {
  estado: 'Habilitado' | 'Inhabilitado'
  motivo_estado: string
}

export interface ExamenFilters {
  search?: string
  estado?: ExamenEstado | ''
  fecha?: string
  fecha_desde?: string
  fecha_hasta?: string
  page?: number
  perPage?: number
}

const buildExamQuery = (filters: ExamenFilters) => {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.estado) params.set('estado', filters.estado)
  if (filters.fecha) params.set('fecha', filters.fecha)
  if (filters.fecha_desde) params.set('fecha_desde', filters.fecha_desde)
  if (filters.fecha_hasta) params.set('fecha_hasta', filters.fecha_hasta)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.perPage) params.set('per_page', String(filters.perPage))
  const query = params.toString()
  return query ? `?${query}` : ''
}

// Variables de deduplicación y caché en memoria
let cachedDocentes: DocenteItem[] | null = null
let pendingDocentesPromise: Promise<DocenteItem[]> | null = null

export const examenesService = {
  list(filters: ExamenFilters = {}) {
    return api.get<PaginatedResponse<Examen>>(`/examenes${buildExamQuery(filters)}`)
  },

  misExamenes(filters: ExamenFilters = {}) {
    return api.get<PaginatedResponse<Examen>>(`/mis-examenes${buildExamQuery(filters)}`)
  },

  get(id: string) {
    return api.get<Examen>(`/examenes/${id}`)
  },

  create(payload: ExamenPayload) {
    return api.post<ExamenMutationResponse>('/examenes', payload)
  },

  update(id: string, payload: ExamenPayload) {
    return api.put<ExamenMutationResponse>(`/examenes/${id}`, payload)
  },

  delete(id: string) {
    return api.delete<{ message: string }>(`/examenes/${id}`)
  },

  async listDocentes(): Promise<{ data: DocenteItem[] }> {
    if (cachedDocentes && cachedDocentes.length > 0) {
      return { data: cachedDocentes }
    }

    if (!pendingDocentesPromise) {
      pendingDocentesPromise = api
        .get<DocenteItem[]>('/docentes')
        .then((docentes) => {
          cachedDocentes = docentes
          return docentes
        })
        .finally(() => {
          pendingDocentesPromise = null
        })
    }

    const data = await pendingDocentesPromise
    return { data }
  },

  clearDocentesCache() {
    cachedDocentes = null
    pendingDocentesPromise = null
  },

  // --- Prerrequisitos de Examen ---
  listPrerrequisitos(examId: string) {
    return api.get<Prerrequisito[]>(`/examenes/${examId}/prerrequisitos`)
  },

  createPrerrequisito(examId: string, payload: PrerrequisitoPayload) {
    return api.post<{ message: string; prerrequisito: Prerrequisito }>(
      `/examenes/${examId}/prerrequisitos`,
      payload,
    )
  },

  toggleCumplimiento(prerrequisitoId: string, estudianteId: string, cumplido: boolean) {
    return api.patch<{ message: string }>(
      `/prerrequisitos/${prerrequisitoId}/estudiantes/${estudianteId}`,
      { cumplido },
    )
  },

  // --- Forzado manual docente ---
  cambiarHabilitacion(examId: string, estudianteId: string, payload: HabilitacionPayload) {
    return api.patch<{ message: string; data: unknown }>(
      `/examenes/${examId}/estudiantes/${estudianteId}/habilitacion`,
      payload,
    )
  },
}
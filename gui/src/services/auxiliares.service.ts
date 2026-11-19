import { api } from './api'

export interface AuxiliarAsignado {
  id: string
  id_examen: string
  id_auxiliar: string
  estado: string
  fecha_asignacion: string
  nombre: string
  apellido_paterno?: string | null
  apellido_materno?: string | null
  email_institucional: string
  codigo_sis?: string | null
  ci?: string | null
}

export interface AsignacionAuxiliar {
  id: string
  id_examen: string
  id_auxiliar: string
  estado: string
  fecha_asignacion: string
  auxiliar: {
    id: string
    nombre: string
    apellido_paterno?: string | null
    apellido_materno?: string | null
    email_institucional: string
  }
}

interface ListarAuxiliaresResponse {
  success: boolean
  data: AuxiliarAsignado[]
}

interface AsignarAuxiliarResponse {
  success: boolean
  message: string
  asignacion: AsignacionAuxiliar
}

interface AuxiliarMutationResponse {
  success: boolean
  message: string
}

export const auxiliaresService = {
  listarPorExamen(examenId: string) {
    return api.get<ListarAuxiliaresResponse>(
      `/examenes/${examenId}/auxiliares`,
    )
  },

  listarDisponiblesParaExamen(examenId: string, params: { search?: string; page?: number; perPage?: number } = {}) {
    const q = new URLSearchParams()
    if (params.search) q.set('search', params.search)
    if (params.page) q.set('page', String(params.page))
    if (params.perPage) q.set('per_page', String(params.perPage))
    const queryStr = q.toString() ? `?${q.toString()}` : ''
    return api.get<{ data: import('./estudiantes.service').Estudiante[]; total: number; last_page: number; current_page: number }>(
      `/examenes/${examenId}/auxiliares-disponibles${queryStr}`,
    )
  },

  asignar(examenId: string, email: string) {
    return api.post<AsignarAuxiliarResponse>(
      `/examenes/${examenId}/auxiliares`,
      { email: email.trim() },
    )
  },

  desvincular(examenId: string, auxiliarId: string) {
    return api.delete<AuxiliarMutationResponse>(
      `/examenes/${examenId}/auxiliares/${auxiliarId}`,
    )
  },

  misExamenes() {
    return api.get<{
      success: boolean
      data: {
        id_examen: string
        nombre: string
        materia: string | null
        aula: string | null
        fecha: string
        hora_ini: string
        hora_fin: string
        docente: string | null
        estado_asignacion: string
      }[]
    }>('/auxiliar/mis-examenes')
  },
}
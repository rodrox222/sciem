import { api } from './api'
import type { Estudiante } from './estudiantes.service'

export interface BusquedaEstudiantesResponse {
  estudiantes: Estudiante[]
}

export interface AsistenciaExpulsion {
  id: string
  estudiante_id: string
  nombre_completo: string
  codigo_sis: string
  ci: string | null
  hora_ingreso: string
  fecha_ingreso: string
  metodo: 'QR' | 'MANUAL'
}

export interface AsistenciasExpulsionResponse {
  total_ingresados: number
  asistencias: AsistenciaExpulsion[]
}

export interface RegistroExpulsionPayload {
  id_estudiante: string
  motivo: string
}

export interface ResponsableExpulsion {
  id: string
  rol: string
  nombre: string
}

export interface ExpulsionRegistrada {
  id: string
  id_examen: string
  id_estudiante: string
  motivo: string
  fecha_hora: string
  responsable: ResponsableExpulsion
}

export interface RegistroExpulsionResponse {
  message: string
  expulsion: ExpulsionRegistrada
}

// Contrato de GET /examenes/{id}/expulsiones (historial paginado del backend).
export interface ExpulsionHistorial {
  id: string
  id_examen: string
  id_estudiante: string
  motivo: string
  fecha_hora: string
  estudiante: {
    id: string
    nombre_completo: string | null
    codigo_sis: string
    ci: string | null
  } | null
  responsable: ResponsableExpulsion | null
  // La API de edición debe incluir estos campos; las versiones antiguas no los envían.
  motivo_original?: string
  ultima_edicion?: {
    fecha_hora: string
    responsable: ResponsableExpulsion | null
  } | null
  ediciones?: Array<{
    motivo_anterior: string
    motivo_nuevo: string
    fecha_hora: string
    responsable: ResponsableExpulsion | null
  }>
}

export interface EdicionMotivoResponse {
  message: string
  expulsion: ExpulsionHistorial
}

export interface HistorialExpulsionesResponse {
  total: number
  per_page: number
  current_page: number
  last_page: number
  expulsiones: ExpulsionHistorial[]
}

const buildSearchQuery = (key: 'search' | 'qr_data', value: string) => {
  const params = new URLSearchParams()
  params.set(key, value)
  return params.toString()
}

export const expulsionesService = {
  buscarEstudiantes(search: string) {
    return api.get<BusquedaEstudiantesResponse>(
      `/estudiantes/buscar?${buildSearchQuery('search', search.trim())}`,
    )
  },

  buscarPorQr(qrData: string) {
    return api.get<BusquedaEstudiantesResponse>(
      `/estudiantes/buscar?${buildSearchQuery('qr_data', qrData)}`,
    )
  },

  listarAsistencias(examId: string) {
    return api.get<AsistenciasExpulsionResponse>(
      `/examenes/${examId}/asistencias`,
    )
  },

  listarExpulsiones(examId: string, page = 1) {
    const params = new URLSearchParams({ page: String(page), per_page: '100' })
    return api.get<HistorialExpulsionesResponse>(
      `/examenes/${examId}/expulsiones?${params.toString()}`,
    )
  },

  // Requiere que Klever incorpore PATCH y validación horaria en el servidor.
  editarMotivo(examId: string, expulsionId: string, payload: { motivo: string }) {
    return api.patch<EdicionMotivoResponse>(
      `/examenes/${examId}/expulsiones/${expulsionId}`,
      payload,
    )
  },

  registrarExpulsion(examId: string, payload: RegistroExpulsionPayload) {
    return api.post<RegistroExpulsionResponse>(
      `/examenes/${examId}/expulsiones`,
      payload,
    )
  },
}

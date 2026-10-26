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

  registrarExpulsion(examId: string, payload: RegistroExpulsionPayload) {
    return api.post<RegistroExpulsionResponse>(
      `/examenes/${examId}/expulsiones`,
      payload,
    )
  },
}

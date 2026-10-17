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
}

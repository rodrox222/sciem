import { api } from './api'
import type { PaginatedResponse } from '@/types/api'

export interface EstudianteIntento {
  id: string
  codigo_sis: string | null
  ci: string | null
  ci_extension: string | null
  nombre_completo: string
  foto_url: string | null
}

export interface IntentoNoAutorizado {
  id: string
  identificador_presentado: string | null
  tipo_intento: 'INHABILITADO' | 'NO_INSCRITO'
  motivo: string | null
  fecha_hora: string
  codigo_sis: string | null
  estudiante: EstudianteIntento | null
}

export interface ExamenIntentos {
  id: string
  nombre: string
  materia: string | null
  aula: string | null
}

export interface IntentosNoAutorizadosResponse {
  success: boolean
  examen: ExamenIntentos
  data: PaginatedResponse<IntentoNoAutorizado>
}

export const intentosNoAutorizadosService = {
  listByExamen(
    idExamen: string,
    page = 1,
    perPage = 15,
  ): Promise<IntentosNoAutorizadosResponse> {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    })

    return api.get<IntentosNoAutorizadosResponse>(
      `/examenes/${idExamen}/intentos-no-autorizados?${params.toString()}`,
    )
  },
}

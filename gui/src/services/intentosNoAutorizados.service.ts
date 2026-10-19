
import { api } from './api'
import type { PaginatedResponse } from '@/types/api'


export interface EstudianteIntento {
  id: string
  codigo_sis?: string | null
  ci?: string | null
  ci_extension?: string | null
  nombre?: string | null
  apellido_paterno?: string | null
  apellido_materno?: string | null
}

export interface IntentoNoAutorizado {
  id: string
  id_examen: string
  id_estudiante: string | null
  identificador_presentado: string | null
  tipo_intento: 'INHABILITADO' | 'NO_INSCRITO'
  motivo: string | null
  registrado_por_user_type: string | null
  registrado_por_user_id: string | null
  fecha_hora: string
  created_at?: string
  updated_at?: string
  estudiante?: EstudianteIntento | null
}
export interface IntentosNoAutorizadosResponse {
  success: boolean
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

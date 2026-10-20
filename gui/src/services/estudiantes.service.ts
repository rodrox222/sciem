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

export interface CompletarDatosEstudiantePayload {
  ci: string
  ci_extension?: string | null
}

export interface PerfilEstudianteResponse {
  success: boolean
  message: string
  data: {
    id: string
    codigo_sis: string
    ci: string | null
    ci_extension: string | null
    nombre_completo: string
    foto_perfil_url: string | null
    primer_acceso_completado: boolean
  }
}

export interface SubirFotoEstudianteResponse {
  success: boolean
  message: string
  data: {
    id: string
    codigo_sis: string
    ci: string | null
    ci_extension: string | null
    foto_perfil_url: string | null
    primer_acceso_completado: boolean
  }
}

export interface ExamenEstudiante {
  id_examen: string
  nombre: string
  materia: string | null
  aula: string | null
  docente: string | null
  fecha: string
  hora_ini: string | null
  hora_fin: string | null
  estado: EstadoInscripcion
  motivo_estado: string | null
}

export interface MisExamenesResponse {
  success: boolean
  total_examenes: number
  examenes: ExamenEstudiante[]
}

export interface TokenQrResponse {
  success: boolean
  message: string
  data: {
    qr_token: string
    expira_en: string
    estudiante: {
      codigo_sis: string
      nombre_completo: string
      foto_url: string | null
    }
  }
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
cargaMasiva(examId: string, archivo: File) {
  const formData = new FormData()
  formData.append('archivo', archivo)

  return api.post<{
    message: string
    examen_id: string
    total_insertados: number
  }>(
    `/examenes/${examId}/estudiantes/carga-masiva`,
    formData,
  )
},
  cambiarHabilitacion(
    examId: string,
    estudianteId: string,
   payload: {
  estado: EstadoInscripcion
  motivo_estado?: string | null
},
  ) {
    return api.patch<{
      message: string
      data: {
        examen_id: string
        estudiante_id: string
        estado: EstadoInscripcion
motivo_estado: string | null
      }
    }>(
      `/examenes/${examId}/estudiantes/${estudianteId}/habilitacion`,
      payload,
    )
  },

  unenroll(examId: string, estudianteId: string) {
    return api.delete<{ message: string }>(`/examenes/${examId}/estudiantes/${estudianteId}`)
  },

  completarDatos(
    estudianteId: string,
    payload: CompletarDatosEstudiantePayload,
  ) {
    return api.patch<PerfilEstudianteResponse>(
      `/estudiantes/${estudianteId}/completar-datos`,
      payload,
    )
  },

  subirFoto(estudianteId: string, foto: File) {
    const formData = new FormData()
    formData.append('foto', foto)

    return api.post<SubirFotoEstudianteResponse>(
      `/estudiantes/${estudianteId}/foto`,
      formData,
    )
  },

  misExamenes(estudianteId: string) {
    return api.get<MisExamenesResponse>(
      `/estudiantes/${estudianteId}/examenes`,
    )
  },

  generarTokenQr(estudianteId: string, examenId: string) {
    return api.post<TokenQrResponse>(
      `/estudiantes/${estudianteId}/examenes/${examenId}/qr-token`,
      {},
    )
  },

}
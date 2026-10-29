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
import { api } from './api'

export interface Prerrequisito {
  id: string
  id_examen: string
  titulo: string
  descripcion: string
}
export interface PrerrequisitoEstudiante {
  id: string
  id_examen: string
  titulo: string
  descripcion: string
  cumplido: boolean
}

export interface ToggleCumplimientoPayload {
  cumplido: boolean
}

export const prerrequisitosService = {
  /**
   * Obtiene los prerrequisitos configurados para un examen.
   */
  listByExam(examId: string) {
    return api.get<Prerrequisito[]>(
      `/examenes/${examId}/prerrequisitos`,
    )
  },
  /**
   * Obtiene los prerrequisitos de un estudiante
   * junto con su estado de cumplimiento.
   *
   * Este endpoint será proporcionado por el backend.
   */
  getByStudent(examId: string, estudianteId: string) {
    return api.get<PrerrequisitoEstudiante[]>(
      `/examenes/${examId}/estudiantes/${estudianteId}/prerrequisitos`,
    )
  },
  /**
   * Marca o desmarca el cumplimiento de un prerrequisito
   * para un estudiante.
   */
  toggleCumplimiento(
    prerrequisitoId: string,
    estudianteId: string,
    payload: ToggleCumplimientoPayload,
  ) {
    return api.patch<{ message: string }>(
      `/prerrequisitos/${prerrequisitoId}/estudiantes/${estudianteId}`,
      payload,
    )
  },
}
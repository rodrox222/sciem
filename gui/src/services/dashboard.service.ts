import { api } from './api'

export type RolDashboard = 'admin' | 'docente' | 'auxiliar' | 'estudiante'

export interface ExamenDashboard {
  id: string | number
  nombre: string | null
  materia: string | null
  aula: string | null
  docente?: string | null
  fecha: string | null
  hora_ini: string | null
  hora_fin: string | null
  estado?: string | null
  total_estudiantes?: number
  estado_habilitacion?: string | null
  motivo_estado?: string | null
}

export interface ResumenAdmin {
  usuarios: number
  estudiantes: number
  aulas_disponibles: number
  examenes_programados: number
}

export interface ResumenDocente {
  total_examenes: number
  total_inscritos: number
  total_ingresados: number
  examenes: ExamenDashboard[]
}

export interface ResumenConExamenes {
  total_examenes: number
  examenes: ExamenDashboard[]
}

export type ResumenDashboard = ResumenAdmin | ResumenDocente | ResumenConExamenes

export interface DashboardResponse {
  success: boolean
  rol: RolDashboard
  secciones: {
    resumen: ResumenDashboard | { error: string }
  }
}

export function normalizarRolDashboard(value: string | null): RolDashboard | null {
  const rol = value?.trim().toLowerCase()
  if (rol === 'admin' || rol === 'administrador') return 'admin'
  if (rol === 'docente' || rol === 'auxiliar' || rol === 'estudiante') return rol
  return null
}

export function esErrorResumen(value: unknown): value is { error: string } {
  return typeof value === 'object' && value !== null &&
    'error' in value && typeof value.error === 'string'
}

export const dashboardService = {
  obtener() {
    // Consulta exclusivamente informativa. El backend determina el rol a partir del token.
    return api.get<DashboardResponse>('/dashboard')
  },
}

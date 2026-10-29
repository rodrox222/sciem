import { api, apiDownload } from '@/services/api'

export type FormatoReporte = 'xlsx' | 'pdf'

export interface FiltrosReporte {
  fecha_desde: string
  fecha_hasta: string
}

export interface ExamenReporte {
  id: string
  nombre: string
  fecha: string | null
}

export interface ResumenReporte {
  total_inscritos: number
  total_asistentes: number
  total_ausentes: number
  intentos_inhabilitados: number
  intentos_no_inscritos: number
  ingresos_duplicados_bloqueados: number
}

export interface RespuestaResumenReporte {
  examen: ExamenReporte
  resumen: ResumenReporte
}

export interface FranjaReporte {
  inicio: string
  fin: string
  total_ingresos: number
}

export interface RespuestaFranjasReporte {
  examen: ExamenReporte
  zona_horaria: string
  unidad: string
  franjas: FranjaReporte[]
}

export function queryReporte(filtros: FiltrosReporte, formato?: FormatoReporte): string {
  const params = new URLSearchParams()
  if (filtros.fecha_desde) params.set('fecha_desde', filtros.fecha_desde)
  if (filtros.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta)
  if (formato) params.set('formato', formato)
  const query = params.toString()
  return query ? `?${query}` : ''
}

const ruta = (examenId: string) => `/examenes/${encodeURIComponent(examenId)}/reportes/estadisticas`

export const reportesService = {
  resumen(examenId: string, filtros: FiltrosReporte, signal?: AbortSignal) {
    return api.get<RespuestaResumenReporte>(`${ruta(examenId)}${queryReporte(filtros)}`, { signal })
  },
  franjas(examenId: string, filtros: FiltrosReporte, signal?: AbortSignal) {
    return api.get<RespuestaFranjasReporte>(`${ruta(examenId)}/franjas-horarias${queryReporte(filtros)}`, { signal })
  },
  descargar(examenId: string, filtros: FiltrosReporte, formato: FormatoReporte, signal?: AbortSignal) {
    return apiDownload(`${ruta(examenId)}/descargar${queryReporte(filtros, formato)}`, { signal })
  },
}

import { api, apiDownload } from '@/services/api'

export type FormatoReporte = 'xlsx' | 'pdf'
export type TipoDescargaReporte = 'completo' | 'acta' | 'auditoria' | 'matriz'
export type IntervaloFlujo = 5 | 10

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
export interface IntervaloEscaneos {
  inicio: string
  fin: string
  permitidos: number
  rechazados: number
  total_escaneos: number
}
export interface DatoPrerrequisito {
  id_prerrequisito: string
  requisito: string
  total_inscritos: number
  cumplidos: number
  incumplidos: number
  porcentaje_incumplimiento: number
}
export interface RespuestaGraficosReporte {
  examen: ExamenReporte & { hora_ini: string; hora_fin: string }
  zona_horaria: string
  filtros: { fecha_desde: string | null; fecha_hasta: string | null; intervalo_minutos: IntervaloFlujo }
  curva_flujo: {
    hora_inicio_referencia: string
    origen_inicio: string
    nota: string
    intervalos: IntervaloEscaneos[]
  }
  embudo: {
    total_inscritos: number
    cumplieron_prerrequisitos: number
    presentes_en_puerta: number
    evaluados_efectivos: number
  }
  cumplimiento_prerrequisitos: {
    sin_prerrequisitos: boolean
    resultados: DatoPrerrequisito[]
  }
  distribucion_asistencia: {
    total_inscritos: number
    categorias: {
      presentes: number
      ausentes: number
      inhabilitados: number
      expulsados: number
    }
  }
}

// Contrato validado contra rodrox222/sciem:arreglos-HU17 @ 5273f79.
export function queryReporte(filtros: FiltrosReporte, formato?: FormatoReporte): string {
  const params = new URLSearchParams()
  if (filtros.fecha_desde) params.set('fecha_desde', filtros.fecha_desde)
  if (filtros.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta)
  if (formato) params.set('formato', formato)
  const query = params.toString()
  return query ? `?${query}` : ''
}

const ruta = (examenId: string) => `/examenes/${encodeURIComponent(examenId)}/reportes`
const estadisticas = (examenId: string) => `${ruta(examenId)}/estadisticas`

// Un informe individual lo genera Laravel como archivo real, NO una hoja exportada
// artificialmente desde el navegador; así se preservan auditoría, filtros y permisos.
const rutasDescarga: Record<TipoDescargaReporte, string> = {
  completo: 'estadisticas/descargar',
  acta: 'acta-disciplinaria/descargar',
  auditoria: 'auditoria-puerta/descargar',
  matriz: 'matriz-habilitacion-asistencia/descargar',
}

export const reportesService = {
  resumen(examenId: string, filtros: FiltrosReporte, signal?: AbortSignal) {
    return api.get<RespuestaResumenReporte>(`${estadisticas(examenId)}${queryReporte(filtros)}`, { signal })
  },
  franjas(examenId: string, filtros: FiltrosReporte, signal?: AbortSignal) {
    return api.get<RespuestaFranjasReporte>(`${estadisticas(examenId)}/franjas-horarias${queryReporte(filtros)}`, { signal })
  },
  graficos(examenId: string, filtros: FiltrosReporte, intervalo: IntervaloFlujo, signal?: AbortSignal) {
    const params = new URLSearchParams(queryReporte(filtros).slice(1))
    params.set('intervalo', String(intervalo))
    return api.get<RespuestaGraficosReporte>(`${estadisticas(examenId)}/graficos?${params.toString()}`, { signal })
  },
  descargar(examenId: string, filtros: FiltrosReporte, formato: FormatoReporte, signal?: AbortSignal, tipo: TipoDescargaReporte = 'completo') {
    return apiDownload(`${ruta(examenId)}/${rutasDescarga[tipo]}${queryReporte(filtros, formato)}`, { signal })
  },
}

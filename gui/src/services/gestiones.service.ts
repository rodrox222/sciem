import { api } from './api'

export type PeriodoGestion = 1 | 2 | 3 | 4

export interface Gestion {
  id: string
  anio: number
  periodo: PeriodoGestion
  codigo: string
  nombre_periodo?: string
  fecha_inicio: string
  fecha_fin: string
  activo: boolean
  cerrado_en?: string | null
  created_at?: string
  updated_at?: string
}

export interface GestionActivaResponse {
  gestion: Gestion | null
  vencida: boolean
}

export interface GestionPayload {
  anio: number
  periodo: PeriodoGestion
  fecha_inicio: string
  fecha_fin: string
}

export interface GestionUpdatePayload {
  fecha_inicio: string
  fecha_fin: string
}

export const PERIODO_LABELS: Record<PeriodoGestion, string> = {
  1: 'Primer Semestre',
  2: 'Segundo Semestre',
  3: 'Verano',
  4: 'Invierno',
}

export function formatGestionLabel(gestion: Pick<Gestion, 'codigo' | 'periodo' | 'nombre_periodo'>): string {
  const nombre = gestion.nombre_periodo ?? PERIODO_LABELS[gestion.periodo] ?? ''
  return nombre ? `${gestion.codigo} · ${nombre}` : gestion.codigo
}

export function suggestGestionDates(anio: number, periodo: PeriodoGestion): { fecha_inicio: string; fecha_fin: string } {
  switch (periodo) {
    case 1:
      return { fecha_inicio: `${anio}-02-24`, fecha_fin: `${anio}-07-05` }
    case 2:
      return { fecha_inicio: `${anio}-08-01`, fecha_fin: `${anio + 1}-01-10` }
    case 3:
      return { fecha_inicio: `${anio}-01-12`, fecha_fin: `${anio}-02-20` }
    case 4:
      return { fecha_inicio: `${anio}-07-06`, fecha_fin: `${anio}-07-31` }
  }
}

export const gestionesService = {
  list() {
    return api.get<Gestion[]>('/gestiones')
  },

  getActiva() {
    return api.get<GestionActivaResponse>('/gestiones/activa')
  },

  create(payload: GestionPayload) {
    return api.post<{ message: string; gestion: Gestion }>('/gestiones', payload)
  },

  update(id: string, payload: GestionUpdatePayload) {
    return api.put<{ message: string; gestion: Gestion }>(`/gestiones/${id}`, payload)
  },

  cerrar(id: string) {
    return api.post<{ message: string; gestion: Gestion }>(`/gestiones/${id}/cerrar`)
  },
}

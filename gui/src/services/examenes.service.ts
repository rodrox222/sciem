import { api } from './api'
import type { PaginatedResponse } from '@/types/api'
import type { Norma } from './normas.service'
import { db, actualizarExamenOffline, type ExamenOfflineInfo } from '../db/offlineStorage'

export type ExamenEstado = 'Programado' | 'En proceso' | 'Terminado'

export interface CatalogItem {
  id: string
  nombre: string
}

export interface DocenteItem extends CatalogItem {
  apellido_paterno?: string
  apellido_materno?: string
  apellido?: string
  activo?: boolean
  tipo_usuario?: string
}

export interface Examen {
  id: string
  nombre: string
  id_materia: string
  estado: ExamenEstado
  fecha: string
  hora_ini: string
  hora_fin: string
  id_aula: string
  id_docente: string
  materia?: CatalogItem | null
  aula?: CatalogItem | null
  docente?: DocenteItem | null
  normas?: Norma[]
  created_at?: string
  updated_at?: string
}

export interface ExamenPayload {
  nombre: string
  id_materia: string
  estado: ExamenEstado
  fecha: string
  hora_ini: string
  hora_fin: string
  id_aula: string
  id_docente: string
  normas_ids?: string[]
  normas_particulares?: { titulo: string; descripcion: string }[]
}

interface ExamenMutationResponse {
  message: string
  examen: Examen
}

export interface Prerrequisito {
  id: string
  id_examen: string
  titulo: string
  descripcion?: string | null
  created_at?: string
  updated_at?: string
}

export interface PrerrequisitoPayload {
  titulo: string
  descripcion?: string | null
}

export interface HabilitacionPayload {
  estado: 'Habilitado' | 'Inhabilitado'
  motivo_estado: string
}

export interface ExamenFilters {
  search?: string
  estado?: ExamenEstado | ''
  fecha?: string
  fecha_desde?: string
  fecha_hasta?: string
  page?: number
  perPage?: number
}

const buildExamQuery = (filters: ExamenFilters) => {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.estado) params.set('estado', filters.estado)
  if (filters.fecha) params.set('fecha', filters.fecha)
  if (filters.fecha_desde) params.set('fecha_desde', filters.fecha_desde)
  if (filters.fecha_hasta) params.set('fecha_hasta', filters.fecha_hasta)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.perPage) params.set('per_page', String(filters.perPage))
  const query = params.toString()
  return query ? `?${query}` : ''
}

// Variables de deduplicación y caché en memoria
let cachedDocentes: DocenteItem[] | null = null
let pendingDocentesPromise: Promise<DocenteItem[]> | null = null

export const examenesService = {
  /**
   * Obtiene la lista general de exámenes. Si no hay conexión o falla la red, lee de Dexie.
   */
  async list(filters: ExamenFilters = {}): Promise<PaginatedResponse<Examen>> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return this.listFromDexie(filters)
    }

    try {
      const res = await api.get<PaginatedResponse<Examen>>(`/examenes${buildExamQuery(filters)}`)
      return res
    } catch (error) {
      console.warn('Fallo de red al listar exámenes, recuperando desde almacenamiento local...', error)
      return this.listFromDexie(filters)
    }
  },

  /**
   * Obtiene los exámenes del usuario autenticado (docente/auxiliar). Con fallback offline a Dexie.
   */
  async misExamenes(filters: ExamenFilters = {}): Promise<PaginatedResponse<Examen>> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return this.listFromDexie(filters)
    }

    try {
      const res = await api.get<PaginatedResponse<Examen>>(`/mis-examenes${buildExamQuery(filters)}`)
      return res
    } catch (error) {
      console.warn('Fallo de red en misExamenes, recuperando desde almacenamiento local...', error)
      return this.listFromDexie(filters)
    }
  },

  /**
   * Obtiene un examen por ID. Si está offline, lo busca en Dexie.
   */
  async get(id: string): Promise<Examen> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return this.getFromDexie(id)
    }

    try {
      return await api.get<Examen>(`/examenes/${id}`)
    } catch (error) {
      console.warn(`Fallo de red al obtener examen ${id}, buscando en Dexie...`, error)
      return this.getFromDexie(id)
    }
  },

  create(payload: ExamenPayload) {
    return api.post<ExamenMutationResponse>('/examenes', payload)
  },

  /**
   * Actualiza el examen. Si está offline y es docente, lo persiste en Dexie y encolado para sincronización.
   */
  async update(id: string, payload: ExamenPayload): Promise<ExamenMutationResponse> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const userRole = (localStorage.getItem('user_role') ?? '').toLowerCase()

      if (userRole !== 'docente') {
        throw new Error('Solo el docente responsable tiene permitido modificar la evaluación en modo offline.')
      }

      await actualizarExamenOffline(
        id,
        {
          nombre: payload.nombre,
          id_materia: payload.id_materia,
          fecha: payload.fecha,
          hora_ini: payload.hora_ini,
          hora_fin: payload.hora_fin,
          estado: payload.estado,
        },
        userRole
      )

      return {
        message: 'Evaluación actualizada localmente (Modo Offline). Se sincronizará al recuperar la conexión.',
        examen: {
          id,
          ...payload,
        } as Examen,
      }
    }

    return api.put<ExamenMutationResponse>(`/examenes/${id}`, payload)
  },

  delete(id: string) {
    return api.delete<{ message: string }>(`/examenes/${id}`)
  },

  async listDocentes(): Promise<{ data: DocenteItem[] }> {
    if (cachedDocentes && cachedDocentes.length > 0) {
      return { data: cachedDocentes }
    }

    if (!pendingDocentesPromise) {
      pendingDocentesPromise = api
        .get<DocenteItem[]>('/docentes')
        .then((docentes) => {
          cachedDocentes = docentes
          return docentes
        })
        .finally(() => {
          pendingDocentesPromise = null
        })
    }

    const data = await pendingDocentesPromise
    return { data }
  },

  clearDocentesCache() {
    cachedDocentes = null
    pendingDocentesPromise = null
  },

  // --- Prerrequisitos de Examen ---
  listPrerrequisitos(examId: string) {
    return api.get<Prerrequisito[]>(`/examenes/${examId}/prerrequisitos`)
  },

  createPrerrequisito(examId: string, payload: PrerrequisitoPayload) {
    return api.post<{ message: string; prerrequisito: Prerrequisito }>(
      `/examenes/${examId}/prerrequisitos`,
      payload,
    )
  },

  toggleCumplimiento(prerrequisitoId: string, estudianteId: string, cumplido: boolean) {
    return api.patch<{ message: string }>(
      `/prerrequisitos/${prerrequisitoId}/estudiantes/${estudianteId}`,
      { cumplido },
    )
  },

  // --- Forzado manual docente ---
  cambiarHabilitacion(examId: string, estudianteId: string, payload: HabilitacionPayload) {
    return api.patch<{ message: string; data: unknown }>(
      `/examenes/${examId}/estudiantes/${estudianteId}/habilitacion`,
      payload,
    )
  },

  /**
   * Transforma la lista de Dexie al formato paginado que espera la interfaz.
   */
  async listFromDexie(filters: ExamenFilters = {}): Promise<PaginatedResponse<Examen>> {
    const examenesLocales = await db.examenes.toArray()

    let items: Examen[] = examenesLocales.map((ex: ExamenOfflineInfo) => ({
      id: ex.id_examen,
      nombre: ex.nombre,
      id_materia: ex.id_materia || '',
      estado: (ex.estado as ExamenEstado) || 'Programado',
      fecha: ex.fecha,
      hora_ini: ex.hora_ini || '00:00',
      hora_fin: ex.hora_fin || '00:00',
      id_aula: '',
      id_docente: ex.id_docente || '',
      materia: ex.materia ? { id: ex.id_materia || '', nombre: ex.materia } : null,
      aula: null,
      docente: null,
    }))

    // Filtro por búsqueda de texto
    if (filters.search?.trim()) {
      const term = filters.search.trim().toLowerCase()
      items = items.filter(
        (e) =>
          e.nombre.toLowerCase().includes(term) ||
          e.materia?.nombre.toLowerCase().includes(term)
      )
    }

    // Filtro por estado
    if (filters.estado) {
      items = items.filter((e) => e.estado === filters.estado)
    }

    // Filtro por fecha
    if (filters.fecha) {
      items = items.filter((e) => e.fecha.slice(0, 10) === filters.fecha)
    }

    return {
      data: items,
      total: items.length,
      current_page: 1,
      last_page: 1,
      per_page: items.length || 15,
      from: items.length > 0 ? 1 : 0,
      to: items.length,
    }
  },

  /**
   * Recupera un examen específico desde Dexie por su ID.
   */
  async getFromDexie(id: string): Promise<Examen> {
    const ex = await db.examenes.get(id)
    if (!ex) {
      throw new Error('La evaluación solicitada no se encuentra descargada en el almacenamiento local.')
    }

    return {
      id: ex.id_examen,
      nombre: ex.nombre,
      id_materia: ex.id_materia || '',
      estado: (ex.estado as ExamenEstado) || 'Programado',
      fecha: ex.fecha,
      hora_ini: ex.hora_ini || '00:00',
      hora_fin: ex.hora_fin || '00:00',
      id_aula: '',
      id_docente: ex.id_docente || '',
      materia: ex.materia ? { id: ex.id_materia || '', nombre: ex.materia } : null,
      aula: null,
      docente: null,
    }
  },
}
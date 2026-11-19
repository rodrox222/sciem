import { api } from './api'
import type { PaginatedResponse } from '@/types/api'

export interface Usuario {
  id: string
  ci: string
  ci_extension?: string | null
  nombre: string
  apellido_paterno: string
  apellido_materno?: string | null
  email?: string | null
  activo: boolean
  tipo_usuario: string
  ultimo_acceso?: string | null
  created_at: string
  updated_at: string
  materias?: {
    id: string
    nombre: string
    codigo?: string | null
  }[]
}

export interface Rol {
  codigo: string
  nombre: string
  disponible?: boolean
}

interface RawRolItem {
  codigo?: string
  value?: string
  valor?: string
  id?: string | number
  tipo_usuario?: string
  nombre?: string
  label?: string
  descripcion?: string
  nombre_rol?: string
  disponible?: boolean
}

export interface UsuarioPayload {
  nombre: string
  apellido_paterno: string
  apellido_materno?: string | null
  ci: string
  ci_extension?: string | null
  email?: string
  password?: string
  tipo_usuario: string
  activo?: boolean
  materias_ids?: string[]
}

export interface MateriaDocenteItem {
  id: string
  nombre: string
  codigo?: string | null
  asignada: boolean
}

export interface MateriasDocenteResponse {
  docente: {
    id: string
    nombre: string
    email?: string | null
  }
  materias: MateriaDocenteItem[]
  asignadas: { id: string; nombre: string; codigo?: string | null }[]
}

export interface UsuarioFilters {
  search?: string
  tipo_usuario?: string
  activo?: string
  page?: number
  perPage?: number
}

const buildQuery = (filters: UsuarioFilters): string => {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  if (filters.tipo_usuario) params.set('tipo_usuario', filters.tipo_usuario)
  if (filters.activo !== undefined && filters.activo !== '') params.set('activo', filters.activo)
  if (filters.perPage) params.set('per_page', String(filters.perPage))

  const query = params.toString()
  return query ? `?${query}` : ''
}

// Caché en memoria para evitar saturar con peticiones idénticas
let cachedRoles: Rol[] | null = null

export const usuariosService = {
  list(filters: UsuarioFilters = {}) {
    return api.get<PaginatedResponse<Usuario>>(`/users${buildQuery(filters)}`)
  },

  get(id: string) {
    return api.get<Usuario>(`/users/${id}`)
  },

  create(payload: UsuarioPayload) {
    return api.post<{ message: string; user: Usuario }>('/users', payload)
  },

  update(id: string, payload: Partial<UsuarioPayload>) {
    return api.put<{ message: string; user: Usuario }>(`/users/${id}`, payload)
  },

  desactivar(id: string) {
    return api.delete<{ message: string }>(`/users/${id}`)
  },

  activar(id: string) {
    return api.put<{ message: string; user: Usuario }>(`/users/${id}`, { activo: true })
  },

  getMateriasDocente(idDocente: string) {
    return api.get<MateriasDocenteResponse>(`/users/${idDocente}/materias`)
  },

  syncMateriasDocente(idDocente: string, materiasIds: string[]) {
    return api.post<{ message: string; materias: { id: string; nombre: string; codigo?: string | null }[] }>(
      `/users/${idDocente}/materias`,
      { materias_ids: materiasIds }
    )
  },

  vincularMateria(idDocente: string, idMateria: string) {
    return api.post<{ message: string; materias: { id: string; nombre: string; codigo?: string | null }[] }>(
      `/users/${idDocente}/materias/${idMateria}`
    )
  },

  desvincularMateria(idDocente: string, idMateria: string) {
    return api.delete<{ message: string; materias: { id: string; nombre: string; codigo?: string | null }[] }>(
      `/users/${idDocente}/materias/${idMateria}`
    )
  },

  async listRoles(): Promise<Rol[]> {
    // Si ya los tenemos en memoria, retornamos de inmediato sin ir a la red
    if (cachedRoles && cachedRoles.length > 0) {
      return cachedRoles
    }

    const raw = await api.get<RawRolItem[] | { data: RawRolItem[] }>('/roles')
    const lista = Array.isArray(raw) ? raw : raw?.data ?? []

    cachedRoles = lista.map((item: RawRolItem) => ({
      codigo: String(item.codigo ?? item.value ?? item.valor ?? item.id ?? item.tipo_usuario ?? ''),
      nombre: item.nombre ?? item.label ?? item.descripcion ?? item.nombre_rol ?? '',
      disponible: item.disponible !== false,
    }))

    return cachedRoles
  },

  clearRolesCache() {
    cachedRoles = null
  },
}
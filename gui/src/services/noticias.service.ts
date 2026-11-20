import { api } from './api';

export interface Noticia {
  id: string;
  titulo: string;
  contenido: string;
  publico_objetivo: 'Todos' | 'Docentes' | 'Estudiantes';
  es_publica: boolean;
  id_examen?: string | null;
  id_materia?: string | null;
  examen?: {
    id: string;
    id_materia?: string;
    materia_id?: string;
    nombre?: string;
    fecha?: string;
    hora_ini?: string;
  } | null;
  materia?: {
    id: string;
    nombre: string;
    codigo?: string;
  } | null;
  autor: {
    id: string;
    nombre: string;
    apellido_paterno: string;
  };
  created_at: string;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  last_page: number;
  total: number;
}

export interface StoreNoticiaPayload {
  titulo: string;
  contenido: string;
  publico_objetivo: 'Todos' | 'Docentes' | 'Estudiantes';
  es_publica: boolean;
  id_examen?: string | null;
  id_materia?: string | null;
}

export const noticiasService = {
  getNoticias: async (page = 1, isPublic = false) => {
    const endpoint = isPublic ? `/noticias?page=${page}` : `/noticias/internas?page=${page}`;
    return api.get<PaginatedResponse<Noticia>>(endpoint);
  },

  store: async (payload: StoreNoticiaPayload) => {
    return api.post<{ message: string; noticia: Noticia }>('/noticias', payload);
  },

  update: async (id: string, payload: StoreNoticiaPayload) => {
    return api.put<{ message: string; noticia: Noticia }>(`/noticias/${id}`, payload);
  },

  delete: async (id: string) => {
    return api.delete<{ message: string }>(`/noticias/${id}`);
  },
};
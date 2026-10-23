import { api } from './api';

export interface Noticia {
  id: string;
  titulo: string;
  contenido: string;
  prioridad: 'Normal' | 'Alta' | 'Urgente';
  publico_objetivo: 'Todos' | 'Docentes' | 'Estudiantes';
  es_publica: boolean;
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
  prioridad: 'Normal' | 'Alta' | 'Urgente';
  publico_objetivo: 'Todos' | 'Docentes' | 'Estudiantes';
  es_publica: boolean;
}

export const noticiasService = {
  getNoticias: async (page = 1, isPublic = false) => {
    const endpoint = isPublic ? `/noticias?page=${page}` : `/noticias/internas?page=${page}`;
    return api.get<PaginatedResponse<Noticia>>(endpoint);
  },

  store: async (payload: StoreNoticiaPayload) => {
    return api.post<{ message: string; noticia: Noticia }>('/noticias', payload);
  },

  // Nuevo método para editar (Punto 4)
  update: async (id: string, payload: StoreNoticiaPayload) => {
    return api.put<{ message: string; noticia: Noticia }>(`/noticias/${id}`, payload);
  },
};
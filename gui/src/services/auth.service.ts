import { api } from './api';

export interface LoginResponse {
  token: string;
  user: {
    id: string | number;
    nombre: string;
    apellido?: string;
    email: string;
    rol: string;
  };
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const data = await api.post<LoginResponse>('/login', { email, password });

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user_role', data.user.rol);
    localStorage.setItem('user_data', JSON.stringify(data.user));
    localStorage.setItem('sci_last_activity', Date.now().toString());

    return data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Error al revocar token en el servidor:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_data');
      localStorage.removeItem('sci_last_activity');
    }
  },

  getCurrentUser: () => {
    const role = localStorage.getItem('user_role') || '';
    let name = role || 'Usuario';

    try {
      const raw = localStorage.getItem('user_data');
      const data = raw ? JSON.parse(raw) : null;
      if (data?.nombre) {
        name = `${data.nombre} ${data.apellido || ''}`.trim();
      }
    } catch {
      // Respaldo en caso de error de parseo
    }

    return { role, name, isAuthenticated: Boolean(localStorage.getItem('auth_token')) };
  },
};
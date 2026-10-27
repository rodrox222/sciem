// src/services/auth.service.ts
import { api } from './api';

export interface User {
  id: string | number;
  nombre: string;
  apellido?: string;
  email: string;
  rol: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const data = await api.post<LoginResponse>('/login', { email, password });

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('sci_last_activity', Date.now().toString());

    // Solo guardamos datos de presentación para el Header (sin CI ni datos sensibles)
    if (data.user) {
      localStorage.setItem('user_role', data.user.rol || '');
      localStorage.setItem(
        'user_data',
        JSON.stringify({
          nombre: data.user.nombre,
          apellido: data.user.apellido,
        })
      );
    }

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
      // Respaldo silencioso
    }

    return {
      role,
      name,
      isAuthenticated: Boolean(localStorage.getItem('auth_token')),
    };
  },

  getMe: async (): Promise<User> => {
    return api.get<User>('/me');
  },

  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/forgot-password', { email: email.trim() });
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/reset-password', payload);
  },

  isAuthenticated: (): boolean => {
    return Boolean(localStorage.getItem('auth_token'));
  },
};
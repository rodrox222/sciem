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

    // Solo se conservan el token de autenticación y la marca de tiempo de inactividad
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('sci_last_activity', Date.now().toString());

    // Se eliminan rastros de rol y datos personales en texto plano del navegador
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_data');

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
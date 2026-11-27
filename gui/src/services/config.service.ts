import { api } from './api'

const TIMEOUT_KEY = 'sci_session_timeout_minutes'
const DEFAULT_TIMEOUT_MINUTES = 5

const clampMinutes = (minutes: number): number => {
  if (Number.isNaN(minutes) || minutes < 1) return DEFAULT_TIMEOUT_MINUTES
  return Math.min(120, Math.floor(minutes))
}

export const configService = {
  getTimeoutMinutes: (): number => {
    const raw = localStorage.getItem(TIMEOUT_KEY)
    const parsed = raw ? parseInt(raw, 10) : DEFAULT_TIMEOUT_MINUTES
    return Number.isNaN(parsed) || parsed < 1 ? DEFAULT_TIMEOUT_MINUTES : Math.min(120, parsed)
  },

  setTimeoutMinutes: (minutes: number): void => {
    const safe = clampMinutes(minutes)
    localStorage.setItem(TIMEOUT_KEY, String(safe))
    window.dispatchEvent(new Event('sci_config_updated'))
  },

  syncTimeoutFromServer: async (): Promise<number> => {
    try {
      const res = await api.get<{ minutos?: number }>('/configuracion/inactividad')
      if (typeof res?.minutos === 'number' && res.minutos >= 1) {
        const safe = clampMinutes(res.minutos)
        const prev = configService.getTimeoutMinutes()
        localStorage.setItem(TIMEOUT_KEY, String(safe))
        if (prev !== safe) {
          window.dispatchEvent(new Event('sci_config_updated'))
        }
        return safe
      }
    } catch {
      // Si está offline o falla la red, mantiene el valor cacheado en localStorage
    }
    return configService.getTimeoutMinutes()
  },

  saveTimeoutMinutes: async (minutes: number): Promise<number> => {
    const safe = clampMinutes(minutes)
    const res = await api.put<{ minutos?: number }>('/configuracion/inactividad', {
      minutos: safe,
    })
    const finalMinutes = typeof res?.minutos === 'number' ? clampMinutes(res.minutos) : safe
    configService.setTimeoutMinutes(finalMinutes)
    return finalMinutes
  },
}

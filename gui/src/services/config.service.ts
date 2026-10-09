const TIMEOUT_KEY = 'sci_session_timeout_minutes'
const DEFAULT_TIMEOUT_MINUTES = 5

export const configService = {
  getTimeoutMinutes: (): number => {
    const raw = localStorage.getItem(TIMEOUT_KEY)
    const parsed = raw ? parseInt(raw, 10) : DEFAULT_TIMEOUT_MINUTES
    return Number.isNaN(parsed) || parsed < 1 ? DEFAULT_TIMEOUT_MINUTES : parsed
  },

  setTimeoutMinutes: (minutes: number): void => {
    localStorage.setItem(TIMEOUT_KEY, String(minutes))
    window.dispatchEvent(new Event('sci_config_updated'))
  },
}
import { useState, useEffect, useRef, useCallback } from 'react'
import { authService } from '@/services/auth.service'
import { configService } from '@/services/config.service'
import { apiUrl } from '@/services/apiUrl'

const COUNTDOWN_SECONDS = 60
const STORAGE_KEY = 'sci_last_activity'

const getLimits = () => {
  const totalMinutes = configService.getTimeoutMinutes()
  const totalMs = totalMinutes * 60 * 1000
  const warningMs = totalMinutes === 1 ? 30 * 1000 : (totalMinutes - 1) * 60 * 1000
  return { totalMs, warningMs }
}

export const useIdleTimer = () => {
  const [showModal, setShowModal] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(COUNTDOWN_SECONDS)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isOfflineRef = useRef<boolean>(false)

  // Comprueba activamente si el backend está accesible
  const verificarConexionReal = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      isOfflineRef.current = true
      return false
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1000)

      // Ping ligero al backend
      await fetch(apiUrl('/health'), {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-store',
      })

      clearTimeout(timeoutId)
      isOfflineRef.current = false
      return true
    } catch {
      // Si falla la petición (sin red o timeout), estamos offline
      isOfflineRef.current = true
      return false
    }
  }, [])

  const limpiarTemporizador = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleLogout = useCallback(async () => {
    // Si estamos en modo offline, se cancela rotundamente el logout
    if (isOfflineRef.current) {
      setShowModal(false)
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
      return
    }

    // Comprobación de respaldo antes de cerrar
    const hayRed = await verificarConexionReal()
    if (!hayRed) {
      setShowModal(false)
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
      return
    }

    setShowModal(false)
    limpiarTemporizador()
    await authService.logout()
    window.location.replace('/login')
  }, [verificarConexionReal, limpiarTemporizador])

  const checkSession = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem('auth_token')
    if (!token) return false

    // Si no hay red, reseteamos el contador para proteger la sesión
    if (isOfflineRef.current) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
      setShowModal(false)
      return true
    }

    const { totalMs, warningMs } = getLimits()
    const lastActivityStr = localStorage.getItem(STORAGE_KEY)
    if (!lastActivityStr) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
      return true
    }

    const elapsed = Date.now() - parseInt(lastActivityStr, 10)

    if (elapsed >= totalMs) {
      void handleLogout()
      return false
    }

    if (elapsed >= warningMs) {
      const hayRed = await verificarConexionReal()
      if (!hayRed) {
        localStorage.setItem(STORAGE_KEY, Date.now().toString())
        setShowModal(false)
        return true
      }
      const remaining = Math.max(1, Math.ceil((totalMs - elapsed) / 1000))
      setSecondsRemaining(remaining)
      setShowModal(true)
    }

    return true
  }, [handleLogout, verificarConexionReal])

  const resetTimer = useCallback(() => {
    if (isOfflineRef.current) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
      limpiarTemporizador()
      setShowModal(false)
      return
    }

    if (showModal) return

    limpiarTemporizador()
    const { warningMs } = getLimits()
    localStorage.setItem(STORAGE_KEY, Date.now().toString())

    timerRef.current = setTimeout(async () => {
      const hayRed = await verificarConexionReal()
      if (!hayRed) {
        localStorage.setItem(STORAGE_KEY, Date.now().toString())
        setShowModal(false)
        return
      }
      setSecondsRemaining(COUNTDOWN_SECONDS)
      setShowModal(true)
    }, warningMs)
  }, [showModal, limpiarTemporizador, verificarConexionReal])

  const handleStayActive = () => {
    setShowModal(false)
    setSecondsRemaining(COUNTDOWN_SECONDS)
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    resetTimer()
  }

  useEffect(() => {
    // Sondeo de conectividad periódico cada 3 segundos
    const pollRed = setInterval(() => {
      void verificarConexionReal().then((hayRed) => {
        if (!hayRed) {
          // Renueva la actividad mientras no haya conexión
          localStorage.setItem(STORAGE_KEY, Date.now().toString())
          setShowModal(false)
          limpiarTemporizador()
        }
      })
    }, 3000)

    void checkSession().then((ok) => {
      if (ok) resetTimer()
    })

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart', 'touchend']
    const handler = () => {
      if (!isOfflineRef.current) {
        resetTimer()
      } else {
        localStorage.setItem(STORAGE_KEY, Date.now().toString())
      }
    }

    events.forEach((ev) => window.addEventListener(ev, handler, { passive: true }))
    window.addEventListener('sci_config_updated', handler)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkSession()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearInterval(pollRed)
      events.forEach((ev) => window.removeEventListener(ev, handler))
      window.removeEventListener('sci_config_updated', handler)
      document.removeEventListener('visibilitychange', handleVisibility)
      limpiarTemporizador()
    }
  }, [checkSession, resetTimer, verificarConexionReal, limpiarTemporizador])

  useEffect(() => {
    if (!showModal) return

    const interval = setInterval(() => {
      if (isOfflineRef.current) {
        setShowModal(false)
        clearInterval(interval)
        localStorage.setItem(STORAGE_KEY, Date.now().toString())
        return
      }

      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          void handleLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [showModal, handleLogout])

  return {
    showModal: showModal && !isOfflineRef.current,
    secondsRemaining,
    handleLogout: () => void handleLogout(),
    handleStayActive,
  }
}
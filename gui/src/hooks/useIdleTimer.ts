import { useState, useEffect, useRef, useCallback } from 'react'
import { authService } from '@/services/auth.service'
import { configService } from '@/services/config.service'

const COUNTDOWN_SECONDS = 60
const STORAGE_KEY = 'sci_last_activity'

const getLimits = () => {
  const totalMinutes = configService.getTimeoutMinutes()
  const totalMs = totalMinutes * 60 * 1000
  // Si el timeout es de 1 minuto, avisa a los 30s; si es mayor, avisa 1 minuto antes
  const warningMs = totalMinutes === 1 ? 30 * 1000 : (totalMinutes - 1) * 60 * 1000
  return { totalMs, warningMs }
}

export const useIdleTimer = () => {
  const [showModal, setShowModal] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(COUNTDOWN_SECONDS)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLogout = useCallback(async () => {
    setShowModal(false)
    await authService.logout()
    window.location.replace('/login')
  }, [])

  const checkSession = useCallback((): boolean => {
    const token = localStorage.getItem('auth_token')
    if (!token) return false

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
      const remaining = Math.max(1, Math.ceil((totalMs - elapsed) / 1000))
      setSecondsRemaining(remaining)
      setShowModal(true)
    }

    return true
  }, [handleLogout])

  const resetTimer = useCallback(() => {
    if (showModal) return

    const { warningMs } = getLimits()
    localStorage.setItem(STORAGE_KEY, Date.now().toString())

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      setSecondsRemaining(COUNTDOWN_SECONDS)
      setShowModal(true)
    }, warningMs)
  }, [showModal])

  const handleStayActive = () => {
    setShowModal(false)
    setSecondsRemaining(COUNTDOWN_SECONDS)
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    resetTimer()
  }

  useEffect(() => {
    const initialCheckId = window.setTimeout(() => {
      if (checkSession()) resetTimer()
    }, 0)

    const events = ['mousemove', 'keydown', 'scroll', 'click']
    const handler = () => resetTimer()
    const onConfigUpdate = () => resetTimer()

    events.forEach((ev) => window.addEventListener(ev, handler))
    window.addEventListener('sci_config_updated', onConfigUpdate)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkSession()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearTimeout(initialCheckId)
      events.forEach((ev) => window.removeEventListener(ev, handler))
      window.removeEventListener('sci_config_updated', onConfigUpdate)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [checkSession, resetTimer])

  useEffect(() => {
    if (!showModal) return

    const interval = setInterval(() => {
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
    showModal,
    secondsRemaining,
    handleLogout: () => void handleLogout(),
    handleStayActive,
  }
}
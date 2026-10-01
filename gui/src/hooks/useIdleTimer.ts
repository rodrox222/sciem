import { useState, useEffect, useRef, useCallback } from 'react'
import { authService } from '@/services/auth.service'

const WARNING_LIMIT_MS = 4 * 60 * 1000 
const COUNTDOWN_SECONDS = 60          
const TOTAL_LIMIT_MS = WARNING_LIMIT_MS + COUNTDOWN_SECONDS * 1000
const STORAGE_KEY = 'sci_last_activity' // <-- Actualizado a sci

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

    const lastActivityStr = localStorage.getItem(STORAGE_KEY)
    if (!lastActivityStr) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
      return true
    }

    const elapsed = Date.now() - parseInt(lastActivityStr, 10)

    if (elapsed >= TOTAL_LIMIT_MS) {
      void handleLogout()
      return false
    }

    if (elapsed >= WARNING_LIMIT_MS) {
      const remaining = Math.max(1, Math.ceil((TOTAL_LIMIT_MS - elapsed) / 1000))
      setSecondsRemaining(remaining)
      setShowModal(true)
    }

    return true
  }, [handleLogout])

  const resetTimer = useCallback(() => {
    if (showModal) return

    localStorage.setItem(STORAGE_KEY, Date.now().toString())

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      setSecondsRemaining(COUNTDOWN_SECONDS)
      setShowModal(true)
    }, WARNING_LIMIT_MS)
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

    events.forEach((ev) => window.addEventListener(ev, handler))

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkSession()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearTimeout(initialCheckId)
      events.forEach((ev) => window.removeEventListener(ev, handler))
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
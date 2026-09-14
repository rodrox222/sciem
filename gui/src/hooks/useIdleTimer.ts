import { useState, useEffect, useRef, useCallback } from 'react'

const WARNING_LIMIT_MS = 4 * 60 * 1000 // 4 minutos de inactividad
const COUNTDOWN_SECONDS = 60           // 1 minuto de modal (total 5 min)
const TOTAL_LIMIT_MS = WARNING_LIMIT_MS + COUNTDOWN_SECONDS * 1000
const STORAGE_KEY = 'sciem_last_activity'

export const useIdleTimer = () => {
  const [showModal, setShowModal] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(COUNTDOWN_SECONDS)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLogout = useCallback(() => {
    setShowModal(false)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_role')
    localStorage.removeItem(STORAGE_KEY)
    // Redirección dura inmediata: evita que pinte el dashboard
    window.location.replace('/login')
  }, [])

  // 1. Revisa el almacenamiento sin sobreescribir la hora previa
  const checkSession = useCallback((): boolean => {
    const token = localStorage.getItem('auth_token')
    if (!token) return false

    const lastActivityStr = localStorage.getItem(STORAGE_KEY)
    if (!lastActivityStr) {
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
      return true
    }

    const elapsed = Date.now() - parseInt(lastActivityStr, 10)

    // Si ya pasaron 5 minutos o más: expulsa inmediatamente
    if (elapsed >= TOTAL_LIMIT_MS) {
      handleLogout()
      return false
    }

    // Si pasaron más de 4 minutos pero menos de 5: levanta el modal
    if (elapsed >= WARNING_LIMIT_MS) {
      const remaining = Math.max(1, Math.ceil((TOTAL_LIMIT_MS - elapsed) / 1000))
      setSecondsRemaining(remaining)
      setShowModal(true)
    }

    return true
  }, [handleLogout])

  const resetTimer = useCallback(() => {
    if (showModal) return

    // Solo actualiza la fecha si la sesión sigue vigente
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

  // Montaje inicial y eventos de usuario
  useEffect(() => {
    // Primero comprobamos si el tiempo expiró mientras la pestaña estuvo cerrada
    const sessionActive = checkSession()
    if (!sessionActive) return

    // Si está activa, arrancamos el temporizador local
    resetTimer()

    const events = ['mousemove', 'keydown', 'scroll', 'click']
    const handler = () => resetTimer()

    events.forEach((ev) => window.addEventListener(ev, handler))

    // Detección al alternar pestañas
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkSession()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handler))
      document.removeEventListener('visibilitychange', handleVisibility)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [checkSession, resetTimer])

  // Cuenta regresiva del modal
  useEffect(() => {
    if (!showModal) return

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          handleLogout()
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
    handleLogout,
    handleStayActive,
  }
}
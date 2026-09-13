import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// 4 minutos de inactividad antes de la alerta (para pruebas puedes poner 10 * 1000 = 10s)
const WARNING_LIMIT_MS = 4 * 60 * 1000 
const COUNTDOWN_SECONDS = 60

export const useIdleTimer = () => {
  const [showModal, setShowModal] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(COUNTDOWN_SECONDS)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  const handleLogout = useCallback(() => {
    setShowModal(false)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_role')
    navigate('/login', { replace: true })
  }, [navigate])

  const resetTimer = useCallback(() => {
    // Si la alerta ya está visible en pantalla
    // El usuario debe hacer clic explícito en "Continuar sesión"
    if (showModal) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      setSecondsRemaining(COUNTDOWN_SECONDS)
      setShowModal(true)
    }, WARNING_LIMIT_MS)
  }, [showModal])

  const handleStayActive = () => {
    setShowModal(false)
    setSecondsRemaining(COUNTDOWN_SECONDS)
    resetTimer()
  }

  // Escuchador de actividad del usuario mientras trabaja
  useEffect(() => {
    const events = ['mousemove', 'keydown', 'scroll', 'click']
    const handler = () => resetTimer()

    events.forEach((ev) => window.addEventListener(ev, handler))
    resetTimer()

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handler))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer])

  // Efecto de la cuenta regresiva: se activa únicamente cuando showModal es true
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
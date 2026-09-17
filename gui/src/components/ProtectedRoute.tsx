import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

interface ProtectedRouteProps {
  allowedRoles?: string[]
}

const TIMEOUT_MS = 5 * 60 * 1000 // 5 minutos

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'))
  const userRole = localStorage.getItem('user_role')
  const location = useLocation()

  // 1. Verificación inmediata de inactividad antes de procesar el render
  const lastActivity = localStorage.getItem('sciem_last_activity')
  if (token && lastActivity) {
    const elapsed = Date.now() - parseInt(lastActivity, 10)
    if (elapsed >= TIMEOUT_MS) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_role')
      localStorage.removeItem('sciem_last_activity')
      return <Navigate to="/login" replace state={{ from: location }} />
    }
  }

  useEffect(() => {
    setToken(localStorage.getItem('auth_token'))

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted || !localStorage.getItem('auth_token')) {
        setToken(null)
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [location])

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole.toLowerCase())) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export const PublicRoute: React.FC = () => {
  const token = localStorage.getItem('auth_token')

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
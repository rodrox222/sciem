import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

interface ProtectedRouteProps {
  allowedRoles?: string[]
}

const TIMEOUT_MS = 5 * 60 * 1000
const ACTIVITY_KEY = 'sci_last_activity' // <-- Actualizado a sci

interface AuthState {
  checked: boolean
  token: string | null
}

const readValidToken = () => {
  const token = localStorage.getItem('auth_token')
  const lastActivity = localStorage.getItem(ACTIVITY_KEY)

  if (token && lastActivity) {
    const elapsed = Date.now() - Number.parseInt(lastActivity, 10)
    if (elapsed >= TIMEOUT_MS) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_role')
      localStorage.removeItem('user_data')
      localStorage.removeItem(ACTIVITY_KEY)
      return null
    }
  }

  return token
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const [auth, setAuth] = useState<AuthState>({ checked: false, token: null })
  const location = useLocation()

  useEffect(() => {
    const checkAuth = () => {
      setAuth({ checked: true, token: readValidToken() })
    }

    const initialCheckId = window.setTimeout(checkAuth, 0)
    const handlePageShow = () => checkAuth()
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      window.clearTimeout(initialCheckId)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  if (!auth.checked) return null

  if (!auth.token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const userRole = (localStorage.getItem('user_role') ?? '').toLowerCase()
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export const PublicRoute: React.FC = () => {
  const token = localStorage.getItem('auth_token')
  return token ? <Navigate to="/dashboard" replace /> : <Outlet />
}
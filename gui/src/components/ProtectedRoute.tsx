import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'

export const ProtectedRoute: React.FC = () => {
  const token = localStorage.getItem('auth_token')

  if (!token) {
    return <Navigate to="/login" replace />
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
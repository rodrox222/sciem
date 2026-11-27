// src/layouts/PublicLayout.tsx
import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { IdleTimer } from '@/components/IdleTimer'

export const PublicLayout: React.FC = () => {
  const isAuthenticated = Boolean(localStorage.getItem('auth_token'))
  const userRole = (localStorage.getItem('user_role') ?? '').toLowerCase()

  if (isAuthenticated && userRole === 'estudiante') {
    try {
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}')
      if (userData?.primer_acceso_completado === false) {
        return <Navigate to="/primer-acceso" replace />
      }
    } catch {
      // Ignorar errores de parseo
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <Header />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <Footer />
      {isAuthenticated && <IdleTimer />}
    </div>
  )
}

export default PublicLayout
import React, { useEffect } from 'react'
import { AdminDashboard } from '../components/dashboard/AdminDashboard'
import EstudianteDashboardPage from './EstudianteDashboardPage'

export const DashboardPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Dashboard | SCI'

    window.history.pushState({ dashboard: true }, '', window.location.href)

    const handleBackNavigation = () => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_role')
      localStorage.removeItem('user_data')
      localStorage.removeItem('sci_last_activity')

      window.location.replace('/login')
    }

    window.addEventListener('popstate', handleBackNavigation)

    return () => {
      window.removeEventListener('popstate', handleBackNavigation)
    }
  }, [])

  const role = localStorage.getItem('user_role') || 'Docente'
  const rolNormalizado = role.toLowerCase()

  if (['admin', 'administrador'].includes(rolNormalizado)) {
    return <AdminDashboard />
  }

  if (rolNormalizado === 'estudiante') {
    return <EstudianteDashboardPage />
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
          Panel de Control
        </span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-sci-navy capitalize">
          Bienvenido, {role}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sistema de Control de Ingreso (SCI) · Facultad de Ciencias y Tecnología
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <p className="text-sm text-muted-foreground">
          Selecciona un módulo en la barra de navegación superior para comenzar tus actividades académicas.
        </p>
      </div>
    </div>
  )
}

export default DashboardPage
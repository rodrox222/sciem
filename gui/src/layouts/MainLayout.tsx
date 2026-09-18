import React from 'react'
import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'
import { IdleTimer } from '../components/IdleTimer'

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_data')
    window.location.href = '/login'
  }

  const role = localStorage.getItem('user_role') || 'Docente'
  let displayName = role

  try {
    const userDataRaw = localStorage.getItem('user_data')
    const userData = userDataRaw ? JSON.parse(userDataRaw) : null
    if (userData?.nombre) {
      displayName = `${userData.nombre} ${userData.apellido || ''}`.trim()
    }
  } catch {
    // Si el JSON guardado no es válido, se mantiene el rol como respaldo
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Barra de navegación única adaptativa */}
      <Navbar rol={role} usuario={displayName} onLogout={handleLogout} />

      {/* Área principal de contenido */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6">
        {children}
      </main>

      {/* Footer institucional */}
      <Footer />

      {/* Modal único de control de inactividad */}
      <IdleTimer />
    </div>
  )
}

export default MainLayout
import React from 'react'
import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'
import { AdminNavbar } from '../components/AdminNavbar'

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_data')
    localStorage.removeItem('sciem_last_activity')
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

  // Determinar si el usuario es administrador
  const esAdministrador = role.toLowerCase() === 'admin'

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">

      {/* Navegación según el rol */}
      {esAdministrador ? (
        <AdminNavbar
          rol={role}
          usuario={displayName}
          onLogout={handleLogout}
        />
      ) : (
        <Navbar
          rol={role}
          usuario={displayName}
          onLogout={handleLogout}
        />
      )}

      {/* Área principal de contenido */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6">
        {children}
      </main>

      {/* Footer institucional */}
      <Footer />

    </div>
  )
}
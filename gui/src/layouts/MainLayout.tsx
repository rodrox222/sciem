import React from 'react'
import { ConfirmModal } from '../components/ConfirmModal'
import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'
import { useIdleTimer } from '../hooks/useIdleTimer'

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
    // Si el JSON guardado no es válido, nos quedamos con el rol como respaldo
  }

  // Listener de inactividad (5 minutos) con advertencia 1 minuto antes de cerrar sesión
  const { isPrompted, remainingTime, stayLoggedIn } = useIdleTimer({
    timeout: 5 * 60 * 1000,      // 5 minutos totales
    promptBefore: 1 * 60 * 1000, // Se abre el modal faltando 1 minuto 
    onIdle: handleLogout,
  })

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Barra de navegación superior */}
      <Navbar rol={role} usuario={displayName} onLogout={handleLogout} />

      {/* Área principal de contenido (empuja el footer hacia abajo) */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6">
        {children}
      </main>

      {/* Footer institucional con el texto y color exactos */}
      <Footer />

      {/* Modal reutilizable de advertencia por inactividad */}
      <ConfirmModal
        open={isPrompted}
        title="Advertencia de Inactividad"
        description={
          <span>
            Tu sesión está a punto de cerrarse por inactividad. El sistema se cerrará en{' '}
            <strong className="text-[#E30613] font-bold">{remainingTime} segundos</strong>. ¿Deseas continuar trabajando?
          </span>
        }
        confirmText="Mantener sesión iniciada"
        cancelText="Cerrar sesión ahora"
        onConfirm={stayLoggedIn}
        onCancel={handleLogout}
      />
    </div>
  )
}
import React from 'react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { ConfirmModal } from '../components/ConfirmModal'
import { useIdleTimer } from '../hooks/useIdleTimer'

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { showModal, secondsRemaining, handleLogout, handleStayActive } =
    useIdleTimer()

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Barra de navegación superior */}
      <Navbar onLogout={handleLogout} />

      {/* Área principal de contenido */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6">
        {children}
      </main>

      {/* Footer institucional */}
      <Footer />

      {/* Modal de advertencia por inactividad */}
      <ConfirmModal
        open={showModal}
        title="Advertencia de Inactividad"
        description={
          <span>
            Tu sesión está a punto de cerrarse por inactividad. El sistema se
            cerrará en{' '}
            <strong className="text-[#E30613] font-bold">
              {secondsRemaining} segundos
            </strong>
            . ¿Deseas continuar trabajando?
          </span>
        }
        confirmText="Mantener sesión iniciada"
        cancelText="Cerrar sesión ahora"
        onConfirm={handleStayActive}
        onCancel={handleLogout}
      />
    </div>
  )
}
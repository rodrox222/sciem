import React from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { IdleTimer } from '@/components/IdleTimer'

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      {/* Cabecera institucional unificada (detecta sesión activa automáticamente) */}
      <Header />

      {/* Contenedor central donde React Router inyecta la vista actual */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6">
        <Outlet />
      </main>

      {/* Pie de página institucional */}
      <Footer />

      {/* Control global de inactividad de sesión */}
      <IdleTimer />
    </div>
  )
}

export default MainLayout
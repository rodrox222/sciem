// src/layouts/AuthLayout.tsx
import React from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      {/* Cabecera institucional */}
      <Header />

      {/* Área central con ancho suficiente para la tarjeta horizontal */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 my-4 sm:my-8">
        <div className="w-full max-w-5xl flex justify-center">
          <Outlet />
        </div>
      </main>

      {/* Pie de página institucional */}
      <Footer />
    </div>
  )
}

export default AuthLayout
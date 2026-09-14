import React from 'react'

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-sci-blue text-white py-3 px-8 text-xs select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-slate-200">
          © 2026 SCI - Sistema de Control Ingreso - Universidad Mayor de San Simón
        </p>
        <p className="text-slate-300">
          Todos los derechos reservados.
        </p>
      </div>
    </footer>
  )
}
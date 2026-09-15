import React from 'react'

export function AdminFooter() {
  return (
    <footer className="w-full bg-[#002b5b] text-white py-4 px-8 flex flex-col sm:flex-row justify-between items-center text-xs tracking-wide mt-auto">
      <p className="text-slate-200">
        © 2026 SCI · Sistema de Control Institucional · Universidad Mayor de San Simón
      </p>
      <p className="text-slate-300 mt-2 sm:mt-0">
        Todos los derechos reservados.
      </p>
    </footer>
  )
}
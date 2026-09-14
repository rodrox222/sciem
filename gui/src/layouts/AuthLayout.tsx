import React from 'react'

interface AuthLayoutProps {
  children: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-sci-bg flex flex-col justify-between font-sans">
      {/* Header institucional */}
      <header className="w-full bg-sci-blue text-white px-4 sm:px-6 py-2.5 flex justify-between items-center text-[10px] sm:text-xs tracking-wide">
        <span className="font-semibold sm:font-normal">
          FCyT · UNIVERSIDAD MAYOR DE SAN SIMÓN
        </span>
        <a
          href="/"
          className="hidden sm:inline-flex items-center gap-1.5 text-slate-200 hover:text-white transition-colors"
        >
          <span>←</span> Volver al portal público
        </a>
      </header>

      {/* Contenedor de la tarjeta */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer institucional  */}
      <footer className="w-full bg-sci-blue text-slate-200 py-3 px-6 sm:px-10 border-t border-[#002852] font-sans">
        {/* Móvil */}
        <div className="sm:hidden text-center text-[11px]">
          © 2026 SCI · UMSS
        </div>

        {/* PC / Escritorio */}
        <div className="hidden sm:flex justify-between items-center text-xs tracking-wide">
          <span>
            © 2026 SCI – Sistema de Control Ingreso – Universidad Mayor de San Simón
          </span>
          <span className="text-slate-300">
            Todos los derechos reservados.
          </span>
        </div>
      </footer>
    </div>
  )
}

export default AuthLayout
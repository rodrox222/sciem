import React from 'react'

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-sci-blue text-white px-8 py-4 select-none">
      <div className="max-w-7xl mx-auto">

        {/* Enlaces institucionales */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
            Enlaces institucionales
          </span>

          <a
            href="http://tis.cs.umss.edu.bo/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-200 hover:text-white hover:underline transition-colors"
          >
            WebTis
          </a>

          <a
            href="https://www.fcyt.umss.edu.bo/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-200 hover:text-white hover:underline transition-colors"
          >
            FCyT
          </a>

          <a
            href="https://websis.umss.edu.bo/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-200 hover:text-white hover:underline transition-colors"
          >
            WebSISS
          </a>

          <a
            href="https://www.fcyt.umss.edu.bo/pregrado/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-200 hover:text-white hover:underline transition-colors"
          >
            Carreras FCyT
          </a>
        </div>

        {/* Información del sistema */}
        <div className="border-t border-white/15 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-slate-200 text-[11px]">
            © 2026 SCI - Sistema de Control de Ingreso - Universidad Mayor de San Simón
          </p>

          <p className="text-slate-300 text-[11px]">
            Todos los derechos reservados.
          </p>
        </div>

      </div>
    </footer>
  )
}
import React from 'react'
import { SciLogoIcon } from '../ui/SciLogoIcon'

export const LoginBranding: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-50 to-sky-50/70 p-8 sm:p-10 lg:p-12 flex flex-col justify-between overflow-hidden">
      
      {/* Decoración geométrica institucional */}
      <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-sci-cyan/10" />
      <div className="absolute -left-24 -bottom-24 w-56 h-56 rounded-full bg-sci-blue/10" />

      <div className="relative z-10">
        {/* Logotipo */}
        <div className="flex items-center gap-3">
          <SciLogoIcon className="h-14 sm:h-16 w-auto" />

          <div className="leading-tight">
            <span className="block text-2xl sm:text-3xl font-black text-sci-navy tracking-tight">
              SCI
            </span>

            <span className="block text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1">
              Sistema de Control de Ingreso
            </span>
          </div>
        </div>

        {/* Bloque de Información */}
        <div className="mt-10 sm:mt-14">
          <div className="w-10 h-1 rounded-full bg-sci-cyan mb-5" />

          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight text-sci-navy tracking-tight">
            Sistema de
            <br />
            Control de Ingreso
          </h1>

          <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
            Plataforma institucional para la gestión y consulta de
            información académica de la Facultad de Ciencias y Tecnología.
          </p>
        </div>
      </div>

      {/* Identidad institucional al pie */}
      <div className="relative z-10 mt-10 lg:mt-8">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Facultad de Ciencias y Tecnología
        </p>

        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.12em] text-sci-navy mt-1">
          Universidad Mayor de San Simón
        </p>
      </div>
    </div>
  )
}

export default LoginBranding
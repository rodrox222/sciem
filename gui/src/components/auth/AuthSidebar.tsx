import React from 'react'
import { ShieldCheck } from 'lucide-react'
import logoSSO from '@/assets/logo SSO.svg'

export const AuthSidebar: React.FC = () => {
  return (
    <div className="hidden md:flex md:w-[38%] bg-muted/30 p-8 lg:p-10 flex-col justify-between border-r border-border relative">
      <div className="absolute left-0 top-8 bottom-8 w-1.5 bg-sci-navy rounded-r" />
      <div>
        <div className="flex items-center gap-3">
          <img src={logoSSO} alt="SCI Logo" className="h-12 w-auto object-contain" />
          <div>
            <h1 className="font-bold text-2xl text-sci-navy tracking-tight leading-none">SCI</h1>
            <span className="text-[10px] text-muted-foreground font-semibold tracking-widest block mt-0.5 uppercase">
              Sistema de Control de Ingreso
            </span>
          </div>
        </div>

        <div className="mt-8 inline-block px-3 py-1 bg-sci-navy/10 text-sci-navy text-[11px] font-semibold rounded-full border border-sci-navy/20">
          SEGURIDAD INSTITUCIONAL
        </div>
        <h2 className="text-xl lg:text-2xl font-bold text-sci-navy mt-4 leading-snug tracking-tight">
          Recuperación y acceso protegido
        </h2>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          Protegemos la integridad y trazabilidad de tus evaluaciones académicas y credenciales institucionales.
        </p>
      </div>

      <div className="p-3.5 bg-card rounded-xl border border-border flex items-center gap-3 shadow-xs">
        <div className="w-8 h-8 rounded-lg bg-sci-cyan/15 text-sci-cyan flex items-center justify-center font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-sci-cyan" />
        </div>
        <div>
          <span className="text-xs font-bold text-foreground block">Canal oficial verificado</span>
          <span className="text-[10px] text-muted-foreground">Entrega institucional cifrada</span>
        </div>
      </div>
    </div>
  )
}
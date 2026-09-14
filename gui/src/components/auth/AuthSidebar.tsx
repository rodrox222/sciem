import React from 'react'
import { ShieldCheck } from 'lucide-react'
import logoSSO from '@/assets/logo SSO.svg'

export const AuthSidebar: React.FC = () => {
  return (
    <div className="hidden lg:flex lg:w-[38%] bg-white p-10 flex-col justify-between border-r border-slate-100 relative">
      <div className="absolute left-0 top-8 bottom-8 w-1.5 bg-[#003770] rounded-r" />
      <div>
        <div className="flex items-center gap-3">
          <img src={logoSSO} alt="SCI Logo" className="h-14 w-auto object-contain" />
          <div>
            <h1 className="font-bold text-2xl text-[#003770] tracking-tight leading-none">SCI</h1>
            <span className="text-[10px] text-slate-400 font-semibold tracking-widest block mt-0.5">
              SISTEMA DE CONTROL INGRESO
            </span>
          </div>
        </div>

        <div className="mt-8 inline-block px-3 py-1 bg-blue-50 text-[#003770] text-[11px] font-semibold rounded-full border border-blue-100">
          SEGURIDAD DE CUENTA
        </div>
        <h2 className="text-2xl font-bold text-[#003770] mt-4 leading-snug">
          Recuperación y acceso protegido.
        </h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Protegemos la integridad y trazabilidad de tus evaluaciones académicas y credenciales institucionales.
        </p>
      </div>

      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-800 block">Canal verificado</span>
          <span className="text-[10px] text-slate-400">Entrega cifrada con expiración de enlace</span>
        </div>
      </div>
    </div>
  )
}
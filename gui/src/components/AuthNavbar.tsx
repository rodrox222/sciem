import React from 'react'
import logoSSO from '../assets/logo SSO.svg'

export const AuthNavbar: React.FC = () => {
  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Identidad Institucional idéntica al Dashboard */}
        <div className="flex items-center gap-3">
          <img
            src={logoSSO}
            alt="Logo UMSS"
            className="h-10 w-auto object-contain"
          />
          <div className="flex flex-col">
            <span className="font-bold text-xl text-slate-800 tracking-tight leading-none">
              SCI<span className="text-[#E30613]">EM</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider mt-0.5">
              FCyT - UMSS
            </span>
          </div>
        </div>

      </div>
    </header>
  )
}
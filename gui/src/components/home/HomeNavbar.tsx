import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoSci from '../../assets/logo SSO.svg';
import logoFcyt from '../../assets/fcyt.svg';
import logoUmss from '../../assets/logo_umss_SVG.svg';

export const HomeNavbar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      {/* Mini cinta superior institucional (visible en móvil y desktop) */}
      <div className="bg-[#0b386b] text-white text-[10px] font-semibold tracking-wider px-4 py-1.5 flex items-center justify-between sm:hidden">
        <span>FCyT · UNIVERSIDAD MAYOR DE SAN SIMÓN</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo SCI */}
          <div 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none" 
            onClick={() => navigate('/')}
          >
            <img src={logoSci} alt="Logo SCI" className="h-10 sm:h-12 w-auto object-contain" />
            <div className="leading-tight">
              <span className="font-black text-blue-950 text-lg sm:text-xl tracking-tight block">SCI</span>
              <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">
                Sistema de Control de Ingreso
              </span>
            </div>
          </div>

          {/* Escudos institucionales (Solo Desktop) */}
          <div className="hidden lg:flex items-center gap-10">
            <div className="flex items-center gap-2.5">
              <img src={logoFcyt} alt="FCyT" className="h-8 w-auto object-contain" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-700">
                Facultad de Ciencias y Tecnología
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <img src={logoUmss} alt="UMSS" className="h-8 w-auto object-contain" />
              <span className="text-[11px] font-bold tracking-wider text-slate-700">
                Universidad Mayor de San Simón
              </span>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden md:inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium text-sky-700 bg-white border border-sky-300">
              Información académica oficial
            </span>
            <button
              onClick={() => navigate('/login')}
              className="px-5 sm:px-7 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0a58ca] hover:bg-blue-800 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              Ingresar
            </button>
          </div>
        </div>

        {/* Pestañas de navegación (Ocultas en móvil para dejar paso a la Bottom Nav) */}
        <nav className="hidden sm:flex space-x-1 sm:space-x-4 border-t border-slate-100 text-xs sm:text-sm font-medium pt-1">
          <button className="py-2.5 px-5 text-blue-950 bg-sky-50/70 border-b-2 border-sky-600 font-bold rounded-t-md cursor-pointer">
            Inicio
          </button>
          <button className="py-2.5 px-4 text-slate-600 hover:text-blue-950 transition-colors cursor-pointer">
            Exámenes pasados
          </button>
          <button className="py-2.5 px-4 text-slate-600 hover:text-blue-950 transition-colors cursor-pointer">
            Aulas
          </button>
          <button className="py-2.5 px-4 text-slate-600 hover:text-blue-950 transition-colors cursor-pointer">
            Mapa de aulas
          </button>
          <button className="py-2.5 px-4 text-slate-600 hover:text-blue-950 transition-colors cursor-pointer">
            Cronograma de exámenes
          </button>
          <button className="py-2.5 px-4 text-slate-600 hover:text-blue-950 transition-colors cursor-pointer">
            Noticias
          </button>
        </nav>
      </div>
    </header>
  );
};
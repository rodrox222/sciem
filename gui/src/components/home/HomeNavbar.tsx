import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import logoSci from '../../assets/logo SSO.svg';
import logoFcyt from '../../assets/fcyt.svg';
import logoUmss from '../../assets/logo_umss_SVG.svg';

interface HomeNavItem {
  name: string;
  href: string;
}

interface HomeNavbarProps {
  authenticated?: boolean;
  role?: string;
  user?: string;
  navItems?: HomeNavItem[];
  isLoggingOut?: boolean;
  onLogout?: () => void;
}

export const HomeNavbar: React.FC<HomeNavbarProps> = ({
  authenticated = false,
  role = '',
  user = '',
  navItems = [],
  isLoggingOut = false,
  onLogout,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const goTo = (href: string) => {
    if (href === '#') return;
    navigate(href);
    setMobileOpen(false);
  };

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
            onClick={() => goTo(authenticated ? '/dashboard' : '/')}
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

          {/* La identidad institucional es la misma en el portal y en las páginas con sesión. */}
          <div className="flex items-center gap-2 sm:gap-3">
            {authenticated ? (
              <>
                <span className="hidden xl:inline-flex items-center rounded-full border border-sky-300 bg-white px-3.5 py-1.5 text-xs font-medium text-sky-700">
                  Sesión institucional activa
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-blue-200 bg-blue-50 font-bold text-[#003770]" aria-hidden="true">
                  {user.charAt(0).toUpperCase()}
                </span>
                <div className="hidden min-w-0 flex-col text-left sm:flex">
                  <span className="max-w-36 truncate text-sm font-semibold text-blue-950">{user}</span>
                  <span className="text-xs capitalize text-slate-500">{role}</span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  disabled={isLoggingOut}
                  className="hidden min-h-11 rounded-xl border border-sky-300 px-3 text-xs font-semibold text-[#0a58ca] hover:bg-sky-50 disabled:opacity-50 sm:inline-flex sm:items-center"
                >
                  {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileOpen((open) => !open)}
                  aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
                  aria-expanded={mobileOpen}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-[#003770] sm:hidden"
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </>
            ) : (
              <>
                <span className="hidden md:inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium text-sky-700 bg-white border border-sky-300">
                  Información académica oficial
                </span>
                <button
                  type="button"
                  onClick={() => goTo('/login')}
                  className="px-5 sm:px-7 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0a58ca] hover:bg-blue-800 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  Ingresar
                </button>
              </>
            )}
          </div>
        </div>

        {/* La misma barra de navegación se usa en todas las páginas. */}
        <nav aria-label="Navegación principal" className="hidden flex-wrap justify-center border-t border-slate-100 pt-1 text-xs font-medium sm:flex sm:gap-1 xl:gap-3 xl:text-sm">
          {authenticated ? navItems.filter((item) => item.href !== '#').map((item) => {
            const active = location.pathname === item.href;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => goTo(item.href)}
                aria-current={active ? 'page' : undefined}
                className={'min-h-11 rounded-t-md border-b-2 px-3 py-2 transition-colors ' + (
                  active
                    ? 'border-sky-600 bg-sky-50/70 font-bold text-blue-950'
                    : 'border-transparent text-slate-600 hover:text-blue-950'
                )}
              >
                {item.name}
              </button>
            );
          }) : (
            <>
              <button type="button" onClick={() => goTo('/')} aria-current={location.pathname === '/' ? 'page' : undefined}
                className={'rounded-t-md border-b-2 px-5 py-2.5 font-bold transition-colors ' + (location.pathname === '/' ? 'border-sky-600 bg-sky-50/70 text-blue-950' : 'border-transparent text-slate-600 hover:text-blue-950')}>
                Inicio
              </button>
              <button type="button" onClick={() => goTo('/cronograma')} aria-current={location.pathname === '/cronograma' ? 'page' : undefined}
                className={'rounded-t-md border-b-2 px-4 py-2.5 transition-colors ' + (location.pathname === '/cronograma' ? 'border-sky-600 bg-sky-50/70 font-bold text-blue-950' : 'border-transparent text-slate-600 hover:text-blue-950')}>
                Cronograma de exámenes
              </button>
              <button type="button" disabled title="Disponible próximamente" className="rounded-t-md border-b-2 border-transparent px-4 py-2.5 text-slate-600">
                Noticias
              </button>
            </>
          )}
        </nav>
        {authenticated && mobileOpen && (
          <nav aria-label="Navegación móvil" className="border-t border-slate-100 py-2 sm:hidden">
            {navItems.filter((item) => item.href !== '#').map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => goTo(item.href)}
                className="block min-h-11 w-full rounded-lg px-4 py-2 text-left text-sm font-semibold text-[#003770] hover:bg-sky-50"
              >
                {item.name}
              </button>
            ))}
            <button type="button" onClick={onLogout} disabled={isLoggingOut} className="block min-h-11 w-full rounded-lg px-4 py-2 text-left text-sm font-semibold text-[#B0040E]">
              {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
            </button>
          </nav>
        )}
      </div>
    </header>
  );
};
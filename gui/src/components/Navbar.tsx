import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import logoSSO from '../assets/logo SSO.svg'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8200/api'

interface NavbarProps {
  rol?: string
  usuario?: string
  onLogout?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({
  rol = 'Docente',
  usuario = 'Docente',
  onLogout,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const baseNavItems = [
    { name: 'Inicio', href: '/dashboard' },
    { name: 'Exámenes', href: '/examenes' },
    { name: 'Estudiantes', href: '/estudiantes?rol=docente' },
    { name: 'Cronograma', href: '#' },
    { name: 'Normativas', href: '/normas' },
    { name: 'Perfil', href: '#' },
  ]

  const navItems =
    rol?.toLowerCase() === 'admin'
      ? [{ name: 'Inicio', href: '/dashboard' }, { name: 'Ambientes', href: '/aulas' }, ...baseNavItems.slice(1), { name: 'Auditoría', href: '/dashboard/auditoria' }]
      : baseNavItems

  const handleLogoutClick = async () => {
    setIsLoggingOut(true)
    const token = localStorage.getItem('auth_token')

    try {
      if (token) {
        await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      }
    } catch (err) {
      console.error('Error al revocar token en servidor:', err)
    } finally {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_role')
      localStorage.removeItem('user_data')
      setIsLoggingOut(false)

      if (onLogout) {
        onLogout()
      }
    }
  }

  return (
    <header className="w-full bg-white font-sans shadow-sm">
      {/* Franja Superior Institucional */}
      <div className="bg-[#003770] text-white px-4 py-2 sm:px-8 flex justify-between items-center text-xs tracking-wide">
        <span className="font-semibold uppercase text-[10px] sm:text-xs">
          Facultad de Ciencias y Tecnología
        </span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block shadow-[0_0_8px_#38BDF8]" />
          <span className="hidden text-slate-100 min-[400px]:inline">Sesión institucional activa</span>
        </div>
      </div>

      {/* Barra Principal */}
      <div className="border-b border-slate-200 px-4 sm:px-8">
        <div className="flex h-16 items-center justify-between gap-3 2xl:h-20">
          {/* Logo SCI */}
          <div className="flex items-center gap-3">
            <img
              src={logoSSO}
              alt="Logo Institucional"
              className="h-10 w-auto object-contain sm:h-12"
            />
            <div className="flex items-center">
              <span className="font-bold text-2xl text-[#003770] tracking-tight">
                SCI<span className="text-[#E30613]"></span>
              </span>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="hidden h-full items-center gap-1 2xl:flex">
            {navItems.map((item) => {
              const isActive =
                item.href !== '#' && location.pathname === item.href.split('?')[0]

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    if (item.href !== '#') {
                      navigate(item.href)
                    }
                  }}
                  className={`relative h-full flex items-center px-6 text-sm transition-colors ${
                    isActive
                      ? 'bg-slate-50 text-[#003770] font-semibold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#003770]" />
                  )}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 2xl:hidden">
            <span className="hidden max-w-28 truncate text-xs font-semibold text-[#003770] sm:block">
              {usuario}
            </span>
            <button
              type="button"
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-controls="mobile-main-nav"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
              className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 text-[#003770]"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Perfil de Usuario */}
          <div className="hidden items-center gap-3.5 2xl:flex">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#003770] border border-blue-200 flex items-center justify-center font-bold text-base shadow-sm select-none">
              {usuario.charAt(0).toUpperCase()}
            </div>

            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-800 leading-tight">
                {usuario}
              </span>
              <span className="text-xs text-slate-500">{rol}</span>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogoutClick}
                className="text-xs text-slate-400 hover:text-[#E30613] transition-colors text-left mt-0.5 disabled:opacity-50"
              >
                {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {isMenuOpen && (
        <nav
          id="mobile-main-nav"
          aria-label="Navegación móvil"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsMenuOpen(false)
          }}
          className="max-h-[calc(100dvh-6rem)] overflow-y-auto border-b border-slate-200 bg-white px-4 py-3 shadow-sm 2xl:hidden"
        >
          <div className="mx-auto max-w-7xl space-y-1">
            <p className="px-3 py-2 text-xs text-slate-500">{usuario} · {rol}</p>
            {navItems.filter((item) => item.href !== '#').map((item) => (
              <button
                key={item.name}
                type="button"
                aria-current={location.pathname === item.href.split('?')[0] ? 'page' : undefined}
                onClick={() => {
                  setIsMenuOpen(false)
                  navigate(item.href)
                }}
                className="block min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#003770] hover:bg-slate-100 aria-[current=page]:bg-blue-50 aria-[current=page]:font-bold"
              >
                {item.name}
              </button>
            ))}
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => {
                setIsMenuOpen(false)
                void handleLogoutClick()
              }}
              className="block min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#B0040E] hover:bg-red-50 disabled:opacity-50"
            >
              {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}
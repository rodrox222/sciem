import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import logoSSO from '../assets/logo SSO.svg'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8200/api'

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
  const [menuAbierto, setMenuAbierto] = useState(false)

  const baseNavItems = [
    { name: 'Inicio', href: '/dashboard' },
    { name: 'Mis exámenes', href: '/mis-examenes' },
    { name: 'Estudiantes', href: '/estudiantes?rol=docente' },
    { name: 'Cronograma', href: '#' },
    { name: 'Normativas', href: '/normas' },
    { name: 'Perfil', href: '#' },
  ]

  const navItems =
    rol?.toLowerCase() === 'admin'
      ? [...baseNavItems, { name: 'Auditoría', href: '/dashboard/auditoria' }]
      : baseNavItems

  const handleNavigate = (href: string) => {
    if (href !== '#') {
      navigate(href)
      setMenuAbierto(false)
    }
  }

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
      setMenuAbierto(false)

      if (onLogout) {
        onLogout()
      } else {
        window.location.href = '/login'
      }
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full overflow-x-clip bg-white font-sans shadow-sm">
      {/* Franja superior institucional */}
      <div className="bg-[#003770] px-4 py-1.5 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-[10px] tracking-wide sm:text-xs">
          <span className="truncate font-semibold uppercase">
            Facultad de Ciencias y Tecnología
          </span>

          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38BDF8]" />
            <span className="text-slate-100">
              Sesión institucional activa
            </span>
          </div>
        </div>
      </div>

      {/* Barra principal */}
      <div className="border-b border-slate-200">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-8">
          {/* Logo SCI */}
          <button
            type="button"
            onClick={() => handleNavigate('/dashboard')}
            className="flex min-w-0 items-center gap-2 sm:gap-3"
            aria-label="Ir al inicio"
          >
            <img
              src={logoSSO}
              alt="Logo Institucional"
              className="h-9 w-auto shrink-0 object-contain sm:h-12"
            />

            <span className="font-bold text-xl tracking-tight text-[#003770] sm:text-2xl">
              SCI
            </span>
          </button>

          {/* Navegación para escritorio */}
          <nav className="hidden h-20 items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const isActive =
                item.href !== '#' &&
                location.pathname === item.href.split('?')[0]

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleNavigate(item.href)}
                  className={`relative flex h-full items-center px-4 text-sm transition-colors xl:px-5 ${
                    isActive
                      ? 'bg-slate-50 font-semibold text-[#003770]'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  {item.name}

                  {isActive && (
                    <span className="absolute bottom-0 left-0 h-[3px] w-full bg-[#003770]" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Perfil para escritorio */}
          <div className="hidden items-center gap-3.5 lg:flex">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-base font-bold text-[#003770] shadow-sm">
              {usuario.charAt(0).toUpperCase()}
            </div>

            <div className="flex min-w-0 flex-col text-left">
              <span className="max-w-40 truncate text-sm font-semibold leading-tight text-slate-800">
                {usuario}
              </span>

              <span className="text-xs text-slate-500">{rol}</span>

              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogoutClick}
                className="mt-0.5 text-left text-xs text-slate-400 transition-colors hover:text-[#E30613] disabled:opacity-50"
              >
                {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
              </button>
            </div>
          </div>

          {/* Botón de menú móvil */}
          <button
            type="button"
            onClick={() => setMenuAbierto((anterior) => !anterior)}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#003770] shadow-sm transition hover:bg-slate-50 lg:hidden"
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
          >
            {menuAbierto ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Menú móvil */}
        {menuAbierto && (
          <div className="border-t border-slate-200 bg-white lg:hidden">
            <nav className="mx-auto max-w-7xl px-4 py-2">
              {navItems.map((item) => {
                const isActive =
                  item.href !== '#' &&
                  location.pathname === item.href.split('?')[0]

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleNavigate(item.href)}
                    className={`flex min-h-11 w-full items-center rounded-lg border-l-4 px-4 py-2.5 text-left text-sm transition ${
                      isActive
                        ? 'border-[#003770] bg-slate-50 font-semibold text-[#003770]'
                        : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {item.name}
                  </button>
                )
              })}

              {/* Perfil móvil */}
              <div className="mt-2 flex items-center gap-3 border-t border-slate-200 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-base font-bold text-[#003770]">
                  {usuario.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {usuario}
                  </p>
                  <p className="text-xs text-slate-500">{rol}</p>
                </div>

                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleLogoutClick}
                  className="min-h-11 rounded-lg px-3 text-xs font-semibold text-slate-500 transition hover:bg-red-50 hover:text-[#E30613] disabled:opacity-50"
                >
                  {isLoggingOut ? 'Cerrando...' : 'Salir'}
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
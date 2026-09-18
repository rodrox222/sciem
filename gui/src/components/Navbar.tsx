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

interface NavItem {
  name: string
  href: string
}

// Configuracion de los menus
const NAV_ITEMS_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { name: 'Inicio', href: '#' },
    { name: 'Usuarios', href: '#' },
    { name: 'Ambientes', href: '#' },
    { name: 'Auditoría', href: '/dashboard/auditoria' },
    { name: 'Logs', href: '#' },
    { name: 'Configuración', href: '#' },
    { name: 'Perfil', href: '#' },
  ],
  docente: [
    { name: 'Inicio', href: '/dashboard' },
    { name: 'Mis exámenes', href: '/mis-examenes' },
    { name: 'Estudiantes', href: '/estudiantes?rol=docente' },
    { name: 'Cronograma', href: '#' },
    { name: 'Normativas', href: '#' },
    { name: 'Perfil', href: '#' },
  ],
  auxiliar: [
    { name: 'Inicio', href: '/dashboard' },
    { name: 'Control de ingreso', href: '#' },
    { name: 'Aulas', href: '#' }, //aqui
    { name: 'Exámenes asignados', href: '#' }, //aqui 
    { name: 'Perfil', href: '#' },
  ],
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

  const normalizedRole = (rol || 'docente').toLowerCase()
  const navItems = NAV_ITEMS_BY_ROLE[normalizedRole] || NAV_ITEMS_BY_ROLE.docente

  // Paleta de estilos visuales para el recuadro del avatar según el rol
  const avatarTheme: Record<string, string> = {
    admin: 'bg-rose-50 text-[#E30613] border-rose-200',
    docente: 'bg-blue-50 text-[#003770] border-blue-200',
    auxiliar: 'bg-sky-50 text-sky-600 border-sky-200',
  }

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
        navigate('/login')
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
            <div className="flex flex-col">
              <span className="font-black text-2xl text-[#003770] tracking-tight leading-none">
                SCI
              </span>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                Sistema de Control de Ingreso
              </span>
            </div>
          </button>

          {/* Menú de Navegación Dinámico */}
          <nav className="hidden h-full items-center gap-1 lg:flex">
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

          {/* Perfil de Usuario */}
          <div className="hidden items-center gap-3.5 lg:flex">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black text-base shadow-xs select-none ${
                avatarTheme[normalizedRole] || avatarTheme.docente
              }`}
            >
              {usuario.charAt(0).toUpperCase()}
            </div>

            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-900 leading-tight">
                {usuario}
              </span>
              <span className="text-xs text-slate-500 capitalize">{rol}</span>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogoutClick}
                className="text-xs text-slate-400 hover:text-[#E30613] transition-colors text-left mt-0.5 disabled:opacity-50 font-medium"
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
                  <p className="text-xs text-slate-500 capitalize">{rol}</p>
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

export default Navbar
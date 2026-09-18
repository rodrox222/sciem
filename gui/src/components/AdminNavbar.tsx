import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import logoSSO from '../assets/logo SSO.svg'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8200/api'

interface AdminNavbarProps {
  rol?: string
  usuario?: string
  onLogout?: () => void
}

export function AdminNavbar({
  rol = 'Administrador',
  usuario = 'Administrador',
  onLogout,
}: AdminNavbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)

  const navItems = [
    { name: 'Inicio', href: '/dashboard' },
    { name: 'Usuarios', href: '/usuarios' },
    { name: 'Ambientes', href: '/aulas' },
    { name: 'Normas', href: '/normas' },
    { name: 'Exámenes', href: '/examenes' },
    { name: 'Estudiantes', href: '/estudiantes?rol=admin' },
   { name: 'Auditoría', href: '/dashboard/auditoria' },
    { name: 'Logs', href: '/logs' },
    { name: 'Configuración', href: '/configuracion' },
    { name: 'Perfil', href: '/perfil' },
  ]

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
    <header className="sticky top-0 z-40 w-full overflow-x-clip font-sans shadow-sm">
      {/* Franja superior institucional */}
      <div className="bg-[#002b5b] px-4 py-1.5 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-[10px] tracking-wide sm:text-xs">
          <span className="truncate font-semibold uppercase tracking-wider">
            FACULTAD DE CIENCIAS Y TECNOLOGÍA
          </span>

          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            <span className="hidden text-slate-100 sm:inline">
              Sesión institucional activa
            </span>
          </div>
        </div>
      </div>

      {/* Barra principal */}
      <div className="border-b border-slate-300 bg-slate-200/70">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-3 sm:h-20 sm:px-5 xl:px-8">

          {/* Logo */}
          <button
            type="button"
            onClick={() => handleNavigate('/dashboard')}
            className="flex shrink-0 items-center gap-2 sm:gap-3"
            aria-label="Ir al inicio"
          >
            <img
              src={logoSSO}
              alt="Logo Institucional"
              className="h-9 w-auto object-contain sm:h-11"
            />

            <span className="font-extrabold text-xl tracking-tight text-[#002b5b] sm:text-2xl">
              SCI
            </span>
          </button>

          {/* Navegación escritorio */}
          <nav className="hidden h-20 min-w-0 flex-1 items-center justify-center lg:flex">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.href.split('?')[0]

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleNavigate(item.href)}
                  className={`relative flex h-full shrink-0 items-center justify-center px-2.5 text-xs font-medium transition-all xl:px-3 xl:text-sm ${
                    isActive
                      ? 'bg-slate-300/80 font-bold text-[#002b5b]'
                      : 'text-slate-600 hover:bg-slate-300/40 hover:text-slate-900'
                  }`}
                >
                  {item.name}

                  {isActive && (
                    <span className="absolute bottom-0 left-0 h-[4px] w-full bg-[#004aad]" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Perfil escritorio */}
          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-2.5 py-1.5 shadow-sm xl:gap-3 xl:px-3">
              <div className="flex h-9 w-9 select-none items-center justify-center rounded-lg border border-red-200 bg-red-50 text-sm font-bold text-red-600">
                {usuario.charAt(0).toUpperCase()}
              </div>

              <div className="flex max-w-[130px] flex-col text-left xl:max-w-[160px]">
                <span className="truncate text-xs font-bold leading-tight text-slate-900">
                  {usuario}
                </span>

                <span className="truncate text-[11px] leading-tight text-slate-500">
                  {rol}
                </span>

                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleLogoutClick}
                  className="mt-0.5 text-left text-[11px] text-slate-500 transition-colors hover:text-red-600 disabled:opacity-50"
                >
                  {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
                </button>
              </div>
            </div>
          </div>

          {/* Botón menú móvil */}
          <button
            type="button"
            onClick={() => setMenuAbierto((anterior) => !anterior)}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-[#002b5b] transition hover:bg-slate-100 lg:hidden"
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
          <div className="border-t border-slate-300 bg-white lg:hidden">
            <nav className="mx-auto max-w-7xl px-4 py-2">
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.href.split('?')[0]

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleNavigate(item.href)}
                    className={`flex min-h-11 w-full items-center rounded-lg border-l-4 px-4 py-2.5 text-left text-sm transition ${
                      isActive
                        ? 'border-[#004aad] bg-slate-100 font-bold text-[#002b5b]'
                        : 'border-transparent font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {item.name}
                  </button>
                )
              })}

              {/* Perfil móvil */}
              <div className="mt-2 flex items-center gap-3 border-t border-slate-200 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-lg border border-red-200 bg-red-50 text-sm font-bold text-red-600">
                  {usuario.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-900">
                    {usuario}
                  </p>

                  <p className="text-[11px] text-slate-500">
                    {rol}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleLogoutClick}
                  className="min-h-11 rounded-lg px-3 text-xs font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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
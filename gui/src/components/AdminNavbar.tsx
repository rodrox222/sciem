import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import logoSSO from '../assets/logo SSO.svg'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8200/api'

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
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = [
  { name: 'Inicio', href: '/dashboard' },
  { name: 'Usuarios', href: '/usuarios' },
  { name: 'Ambientes', href: '/aulas' },
  { name: 'Normas', href: '/normas' },
  { name: 'Exámenes', href: '/examenes' },
  { name: 'Estudiantes', href: '/estudiantes?rol=admin' },
  { name: 'Auditoría', href: '/auditoria' },
  { name: 'Logs', href: '/logs' },
  { name: 'Configuración', href: '/configuracion' },
  { name: 'Perfil', href: '/perfil' },
]

  const handleLogoutClick = async () => {
    setIsLoggingOut(true)
    const token = localStorage.getItem('auth_token')

    try {
      if (token) {
        await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
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
      } else {
        window.location.href = '/login'
      }
    }
  }

  return (
    <header className="w-full font-sans shadow-sm sticky top-0 z-40">
      {/* Franja Superior Institucional */}
      <div className="bg-[#002b5b] text-white px-4 py-1.5 sm:px-8 flex justify-between items-center text-xs tracking-wide">
        <span className="font-semibold uppercase tracking-wider text-[10px] sm:text-xs">
          FACULTAD DE CIENCIAS Y TECNOLOGÍA
        </span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shadow-[0_0_6px_#22d3ee]" />
          <span className="hidden text-slate-100 min-[400px]:inline">Sesión institucional activa</span>
        </div>
      </div>

      {/* Barra Principal con el fondo gris institucional idéntico al diseño */}
      <div className="border-b border-slate-300 bg-slate-200/70 px-4 sm:px-8">
        <div className="flex h-16 items-center justify-between gap-3 2xl:h-20">

          {/* Logo SCI con su icono */}
          <div className="flex items-center gap-3">
            <img
                src={logoSSO}
                alt="Logo Institucional"
                className="h-10 w-auto object-contain 2xl:h-11"
                />
            <div className="flex items-center">
              <span className="font-extrabold text-2xl text-[#002b5b] tracking-tight">
                SCI
              </span>
            </div>
          </div>

          {/* Menú de Navegación Centrado (Con el fondo y borde inferior de la pestaña activa) */}
          <nav className="hidden h-full items-center 2xl:flex">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href.split('?')[0]

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
  if (item.href !== '#') {
    navigate(item.href)
  }
}}
                  className={`relative h-full flex items-center justify-center px-6 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-300/80 text-[#002b5b] font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
                  }`}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[4px] bg-[#004aad]" />
                  )}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 2xl:hidden">
            <span className="hidden max-w-28 truncate text-xs font-semibold text-[#002b5b] sm:block">
              {usuario}
            </span>
            <button
              type="button"
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-controls="mobile-admin-nav"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
              className="grid h-11 w-11 place-items-center rounded-lg border border-slate-300 text-[#002b5b]"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Perfil de Usuario Administrador (Tarjeta con la letra A en rojo) */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-xl border border-slate-300 bg-white/80 px-3 py-1.5 shadow-sm 2xl:flex">
              <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold text-sm select-none">
                {usuario.charAt(0).toUpperCase()}
              </div>

              <div className="flex flex-col text-left">
  <span className="text-xs font-bold text-slate-900 leading-tight">
    {usuario}
  </span>

  <span className="text-[11px] text-slate-500 leading-tight">
    {rol}
  </span>

  <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleLogoutClick}
                  className="text-[11px] text-slate-500 hover:text-red-600 transition-colors text-left mt-0.5 disabled:opacity-50"
                >
                  {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
      {isMenuOpen && (
        <nav
          id="mobile-admin-nav"
          aria-label="Navegación móvil del administrador"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsMenuOpen(false)
          }}
          className="max-h-[calc(100dvh-6rem)] overflow-y-auto border-b border-slate-300 bg-white px-4 py-3 shadow-sm 2xl:hidden"
        >
          <div className="mx-auto max-w-7xl space-y-1">
            <p className="px-3 py-2 text-xs text-slate-500">{usuario} · {rol}</p>
            {navItems.map((item) => (
              <button
                key={item.name}
                type="button"
                aria-current={location.pathname === item.href.split('?')[0] ? 'page' : undefined}
                onClick={() => {
                  setIsMenuOpen(false)
                  navigate(item.href)
                }}
                className="block min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#002b5b] hover:bg-slate-100 aria-[current=page]:bg-blue-50 aria-[current=page]:font-bold"
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
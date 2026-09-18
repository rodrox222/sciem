import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import logoSSO from '../assets/logo SSO.svg'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8200/api'

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

  const normalizedRole = (rol || 'docente').toLowerCase()
  const navItems = NAV_ITEMS_BY_ROLE[normalizedRole] || NAV_ITEMS_BY_ROLE.docente

  // Paleta de estilos visuales para el recuadro del avatar según el rol
  const avatarTheme: Record<string, string> = {
    admin: 'bg-rose-50 text-[#E30613] border-rose-200',
    docente: 'bg-blue-50 text-[#003770] border-blue-200',
    auxiliar: 'bg-sky-50 text-sky-600 border-sky-200',
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

      if (onLogout) {
        onLogout()
      } else {
        navigate('/login')
      }
    }
  }

  return (
    <header className="w-full bg-white font-sans shadow-xs">
      {/* Franja Superior Institucional */}
      <div className="bg-[#003770] text-white px-8 py-1.5 flex justify-between items-center text-xs tracking-wide">
        <span className="font-semibold uppercase tracking-wider text-[11px]">
          Facultad de Ciencias y Tecnología
        </span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 inline-block shadow-[0_0_8px_#38BDF8]" />
          <span className="text-slate-100 text-[11px]">Sesión institucional activa</span>
        </div>
      </div>

      {/* Barra Principal */}
      <div className="border-b border-slate-200 px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo SCI */}
          <div className="flex items-center gap-3">
            <img
              src={logoSSO}
              alt="Logo Institucional"
              className="h-12 w-auto object-contain"
            />
            <div className="flex flex-col">
              <span className="font-black text-2xl text-[#003770] tracking-tight leading-none">
                SCI
              </span>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                Sistema de Control de Ingreso
              </span>
            </div>
          </div>

          {/* Menú de Navegación Dinámico */}
          <nav className="flex h-full items-center gap-1">
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
                  className={`relative h-full flex items-center px-5 text-sm transition-colors ${
                    isActive
                      ? 'bg-slate-50 text-[#003770] font-bold'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/70 font-medium'
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

          {/* Perfil de Usuario */}
          <div className="flex items-center gap-3.5">
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
        </div>
      </div>
    </header>
  )
}

export default Navbar
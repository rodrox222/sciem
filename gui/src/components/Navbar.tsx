import React, { useState } from 'react'
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
  const [activeTab, setActiveTab] = useState('Estudiantes')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const navItems = [
    { name: 'Inicio', href: '#' },
    { name: 'Mis exámenes', href: '#' },
    { name: 'Estudiantes', href: '#' },
    { name: 'Cronograma', href: '#' },
    { name: 'Normativas', href: '#' },
    { name: 'Perfil', href: '#' },
  ]

  const handleLogoutClick = async () => {
    setIsLoggingOut(true)
    const token = localStorage.getItem('auth_token')

    try {
      if (token) {
        // Petición al endpoint protegido en api.php
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
      // Limpiar almacenamiento local sin importar si falló la red
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
      <div className="bg-[#003770] text-white px-8 py-2 flex justify-between items-center text-xs tracking-wide">
        <span className="font-semibold uppercase">
          Facultad de Ciencias y Tecnología
        </span>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block shadow-[0_0_8px_#38BDF8]" />
          <span className="text-slate-100">Sesión institucional activa</span>
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
            <div className="flex items-center">
              <span className="font-bold text-2xl text-[#003770] tracking-tight">
                SCI<span className="text-[#E30613]">EM</span>
              </span>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="flex h-full items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.name

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setActiveTab(item.name)}
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

          {/* Perfil de Usuario */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#003770] border border-blue-200 flex items-center justify-center font-bold text-base shadow-sm select-none">
              {usuario.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-800 leading-tight">
                {usuario}
              </span>
              <span className="text-xs text-slate-500">
                {rol}
              </span>
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
    </header>
  )
}
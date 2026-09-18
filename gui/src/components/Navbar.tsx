import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HomeNavbar } from './home/HomeNavbar'

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

const NAV_ITEMS_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { name: 'Inicio', href: '/dashboard' },
    { name: 'Usuarios', href: '/usuarios' },
    { name: 'Ambientes', href: '/aulas' },
    { name: 'Normativas', href: '/normas' },
    { name: 'Exámenes', href: '/examenes' },
    { name: 'Estudiantes', href: '/estudiantes' },
    { name: 'Auditoría', href: '/dashboard/auditoria' },
    { name: 'Perfil', href: '#' },
  ],
  docente: [
    { name: 'Inicio', href: '/dashboard' },
    { name: 'Mis exámenes', href: '/examenes' },
    { name: 'Estudiantes', href: '/estudiantes' },
    { name: 'Cronograma', href: '#' },
    { name: 'Perfil', href: '#' },
  ],
  auxiliar: [
    { name: 'Inicio', href: '/dashboard' },
    { name: 'Control de ingreso', href: '#' },
    { name: 'Aulas', href: '#' },
    { name: 'Exámenes asignados', href: '#' },
    { name: 'Perfil', href: '#' },
  ],
}


export const Navbar: React.FC<NavbarProps> = ({ rol = 'Docente', usuario = 'Docente', onLogout }) => {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const normalizedRole = rol.toLowerCase() === 'administrador' ? 'admin' : rol.toLowerCase()
  const navItems = NAV_ITEMS_BY_ROLE[normalizedRole] || NAV_ITEMS_BY_ROLE.docente

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
    <HomeNavbar
      authenticated
      role={rol}
      user={usuario}
      navItems={navItems}
      isLoggingOut={isLoggingOut}
      onLogout={() => void handleLogoutClick()}
    />
  )
}

export default Navbar

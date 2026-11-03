import { useEffect, useState } from 'react'
import { DashboardUnificado } from '@/components/dashboard/DashboardUnificado'
import EstudianteDashboardPage from './EstudianteDashboardPage'

export function DashboardPage() {
  const [rolActivo, setRolActivo] = useState(() => {
    return (localStorage.getItem('user_role') || 'estudiante').toLowerCase()
  })

  useEffect(() => {
    document.title = 'Dashboard | SCI'

    const handleRolCambiado = (e: Event) => {
      const customEvent = e as CustomEvent<string>
      if (customEvent.detail) {
        setRolActivo(customEvent.detail.toLowerCase())
      } else {
        const nuevo = localStorage.getItem('user_role')
        if (nuevo) setRolActivo(nuevo.toLowerCase())
      }
    }

    window.addEventListener('rolCambiado', handleRolCambiado)
    window.addEventListener('storage', handleRolCambiado)

    return () => {
      window.removeEventListener('rolCambiado', handleRolCambiado)
      window.removeEventListener('storage', handleRolCambiado)
    }
  }, [])

  // Si el usuario autenticado está en rol estudiante, muestra la vista completa de estudiante
  if (rolActivo === 'estudiante') {
    return <EstudianteDashboardPage />
  }

  // Para admin, docente y auxiliar se mantiene el dashboard analítico
  return <DashboardUnificado />
}

export default DashboardPage
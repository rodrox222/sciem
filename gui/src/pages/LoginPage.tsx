import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoginView } from '../components/LoginView'

export const LoginPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Iniciar sesión | SCI'
  }, [])

  const navigate = useNavigate()

  const handleLoginSuccess = (role: string) => {
    localStorage.setItem('user_role', role)

    try {
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}')
      if (
        role.toLowerCase() === 'estudiante' &&
        userData?.primer_acceso_completado === false
      ) {
        localStorage.removeItem('sci_idle_redirect')
        navigate('/primer-acceso', { replace: true })
        return
      }
    } catch {
      // Si falla el parseo continúa con la redirección normal
    }

    // Revisar si venimos rebotados por inactividad
    const idleRedirect = localStorage.getItem('sci_idle_redirect') // <-- Actualizado a sci

    if (idleRedirect) {
      localStorage.removeItem('sci_idle_redirect')
      navigate(idleRedirect, { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <LoginView
      onLoginSuccess={handleLoginSuccess}
      onForgotPassword={() => navigate('/recuperar-contrasena')}
    />
  )
}

export default LoginPage
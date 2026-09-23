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

    // Revisar si venimos rebotados por inactividad
    const idleRedirect = localStorage.getItem('sci_idle_redirect') // <-- Actualizado a sci

    if (idleRedirect) {
      localStorage.removeItem('sci_idle_redirect') 
      navigate(idleRedirect, { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
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
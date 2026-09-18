import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoginView } from '../components/LoginView'
import { AuthLayout } from '../layouts/AuthLayout'

export const LoginPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Iniciar sesión | SCI'
  }, [])

  const navigate = useNavigate()

  const handleLoginSuccess = (role: string) => {
    localStorage.setItem('user_role', role)

    // Revisar si venimos rebotados por inactividad
    const idleRedirect = localStorage.getItem('sciem_idle_redirect')

    if (idleRedirect) {
      localStorage.removeItem('sciem_idle_redirect') 
      navigate(idleRedirect, { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  return (
    <AuthLayout>
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onForgotPassword={() => navigate('/recuperar-contrasena')}
      />
    </AuthLayout>
  )
}

export default LoginPage
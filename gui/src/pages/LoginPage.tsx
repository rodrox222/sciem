import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LoginView } from '../components/LoginView'
import { AuthLayout } from '../layouts/AuthLayout'
import { useEffect } from 'react'


export const LoginPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Iniciar sesión | SCI'
  }, [])

  const navigate = useNavigate()

  const handleLoginSuccess = (role: string) => {
    localStorage.setItem('user_role', role)
    navigate('/dashboard')
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
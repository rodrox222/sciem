import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LoginView } from '../components/LoginView'
import { AuthLayout } from '../layouts/AuthLayout'

export const LoginPage: React.FC = () => {
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
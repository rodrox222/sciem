import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ForgotPasswordView } from '../components/ForgotPasswordView'
import { AuthLayout } from '../layouts/AuthLayout'

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate()

  const handleBackToLogin = () => {
    navigate('/login')
  }

  const handleSuccess = () => {
    alert('Contraseña actualizada con éxito.')
    navigate('/login')
  }

  return (
    <AuthLayout>
      <ForgotPasswordView
        onBackToLogin={handleBackToLogin}
        onSuccess={handleSuccess}
      />
    </AuthLayout>
  )
}

export default ForgotPasswordPage
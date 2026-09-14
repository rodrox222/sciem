import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ForgotPasswordView } from '../components/ForgotPasswordView'
import { AuthLayout } from '../layouts/AuthLayout'
import { useEffect } from 'react'

export const ForgotPasswordPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Recuperar contraseña | SCI'
  }, [])

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
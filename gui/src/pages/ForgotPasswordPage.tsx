import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ForgotPasswordView } from '../components/ForgotPasswordView'

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <ForgotPasswordView
      onBackToLogin={() => navigate('/login')}
      onSuccess={() => {
        alert('Contraseña actualizada con éxito.')
        navigate('/login')
      }}
    />
  )
}
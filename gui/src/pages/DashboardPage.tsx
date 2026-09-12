import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const role = localStorage.getItem('user_role') || 'Docente'

  const handleLogout = () => {
    localStorage.removeItem('user_role')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      <Navbar
        rol={role}
        usuario={role}
        onLogout={handleLogout}
      />
      <main className="max-w-7xl mx-auto p-8">
        <h2 className="text-xl font-bold text-[#003770]">
          Panel Principal - {role}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Bienvenido al Sistema de Control Institucional (SCI).
        </p>
      </main>
    </div>
  )
}
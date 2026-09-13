import React from 'react'
import { MainLayout } from '../layouts/MainLayout'

export const DashboardPage: React.FC = () => {
  const role = localStorage.getItem('user_role') || 'Docente'

  return (
    <MainLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-[#003770]">
            Panel Principal - {role}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Bienvenido al Sistema de Control Institucional (SCI).
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-600">
            Selecciona una opción del menú para comenzar a gestionar el módulo.
          </p>
        </div>
      </div>
    </MainLayout>
  )
}

export default DashboardPage
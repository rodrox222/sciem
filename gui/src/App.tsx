import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import { IdleTimer } from './components/IdleTimer'

// Páginas de HU4-front
import AulasPage from './pages/AulasPage'
import NormasPage from './pages/NormasPage'
import ProgramarExamenPage from './pages/ProgramarExamenPage'
import ExamenesPage from './pages/ExamenesPage'
import ProgramarExamenAdminPage from './pages/ProgramarExamenAdminPage'
import MisExamenesPage from './pages/MisExamenesPage'
import EstudiantesPage from './pages/EstudiantesPage'

// Páginas de integracion-front-back
import { AuditoriaPage } from './pages/AuditoriaPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta principal */}
        <Route path="/" element={<HomePage />} />

        {/* Rutas Públicas */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/recuperar-contrasena"
            element={<ForgotPasswordPage />}
          />
        </Route>

        {/* Rutas Protegidas Generales */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={
              <>
                <IdleTimer />
                <DashboardPage />
              </>
            }
          />
          <Route path="/aulas" element={<AulasPage />} />
          <Route path="/normas" element={<NormasPage />} />
          <Route path="/examenes" element={<ExamenesPage />} />
          <Route path="/mis-examenes" element={<MisExamenesPage />} />
          <Route path="/programar-examen" element={<ProgramarExamenPage />} />
          <Route
            path="/programar-examen-admin"
            element={<ProgramarExamenAdminPage />}
          />
          <Route path="/estudiantes" element={<EstudiantesPage />} />
        </Route>

        {/* Rutas Protegidas por Rol (Admin) */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route
            path="/dashboard/auditoria"
            element={
              <>
                <IdleTimer />
                <AuditoriaPage />
              </>
            }
          />
        </Route>

        {/* Ruta comodín por defecto */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
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

// Páginas de auditoría
import { AuditoriaPage } from './pages/AuditoriaPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Público general */}
        <Route path="/" element={<HomePage />} />

        {/* Rutas Públicas, osea sin iniciar session*/}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
        </Route>

        {/* Rutas compartidas por cualquier usuario logueado (Admin, Docente, Auxiliar) */}
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
          <Route path="/examenes" element={<ExamenesPage />} />
          <Route path="/mis-examenes" element={<MisExamenesPage />} />
          <Route path="/estudiantes" element={<EstudiantesPage />} />
        </Route>

        {/* Rutas EXCLUSIVAS de ADMINISTRADOR */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/normas" element={<NormasPage />} />
          <Route path="/aulas" element={<AulasPage />} />
          <Route path="/programar-examen-admin" element={<ProgramarExamenAdminPage />} />
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

        {/* Rutas exclusivas para docente y admin */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'docente']} />}>
          <Route path="/programar-examen" element={<ProgramarExamenPage />} />
        </Route>

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { IdleTimer } from './components/IdleTimer'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import AulasPage from './pages/AulasPage'
import { AuditoriaPage } from './pages/AuditoriaPage'
import { DashboardPage } from './pages/DashboardPage'
import EstudiantesPage from './pages/EstudiantesPage'
import ExamenesPage from './pages/ExamenesPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import NormasPage from './pages/NormasPage'
import ProgramarExamenAdminPage from './pages/ProgramarExamenAdminPage'
import ProgramarExamenPage from './pages/ProgramarExamenPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
        </Route>

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
          <Route path="/mis-examenes" element={<Navigate to="/examenes" replace />} />
          <Route path="/estudiantes" element={<EstudiantesPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/aulas" element={<AulasPage />} />
          <Route
            path="/programar-examen-admin"
            element={<ProgramarExamenAdminPage />}
          />
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

        <Route element={<ProtectedRoute allowedRoles={['admin', 'docente']} />}>
          <Route path="/normas" element={<NormasPage />} />
          <Route path="/programar-examen" element={<ProgramarExamenPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

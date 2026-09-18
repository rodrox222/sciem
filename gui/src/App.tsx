import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'

// Páginas de HU1, HU4, HU5, HU6 y HU7
import UsuariosPage from './pages/UsuariosPage'
import AulasPage from './pages/AulasPage'
import NormasPage from './pages/NormasPage'
import MisExamenesPage from './pages/MisExamenesPage'

// Página de HU3
import { AuditoriaPage } from './pages/AuditoriaPage'
import { DashboardPage } from './pages/DashboardPage'
import EstudiantesPage from './pages/EstudiantesPage'
import ExamenesPage from './pages/ExamenesPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import CronogramaPublicPage from './pages/CronogramaPublicPage'
import { LoginPage } from './pages/LoginPage'
import ProgramarExamenAdminPage from './pages/ProgramarExamenAdminPage'
import ProgramarExamenPage from './pages/ProgramarExamenPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cronograma" element={<CronogramaPublicPage />} />

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={
              <DashboardPage />
            }
          />
          <Route path="/examenes" element={<ExamenesPage />} />
          <Route path="/mis-examenes" element={<MisExamenesPage />} />
          <Route path="/estudiantes" element={<EstudiantesPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/aulas" element={<AulasPage />} />
          <Route path="/normas" element={<NormasPage />} />
          <Route
            path="/programar-examen-admin"
            element={<ProgramarExamenAdminPage />}
          />
          <Route
            path="/dashboard/auditoria"
            element={
              <AuditoriaPage />
            }
          />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin', 'docente']} />}>
          <Route path="/programar-examen" element={<ProgramarExamenPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
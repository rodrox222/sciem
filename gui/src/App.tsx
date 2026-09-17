import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import { IdleTimer } from './components/IdleTimer'

// Páginas de HU1, HU4, HU5, HU6 y HU7
import UsuariosPage from './pages/UsuariosPage'
import AulasPage from './pages/AulasPage'
import NormasPage from './pages/NormasPage'
import ProgramarExamenPage from './pages/ProgramarExamenPage'
import ExamenesPage from './pages/ExamenesPage'
import ProgramarExamenAdminPage from './pages/ProgramarExamenAdminPage'
import MisExamenesPage from './pages/MisExamenesPage'
import EstudiantesPage from './pages/EstudiantesPage'

// Página de HU3
import { AuditoriaPage } from './pages/AuditoriaPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Ruta principal */}
        <Route path="/" element={<HomePage />} />

        {/* ==================== RUTAS PÚBLICAS ==================== */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/recuperar-contrasena"
            element={<ForgotPasswordPage />}
          />
        </Route>

        {/* ==================== RUTAS PROTEGIDAS GENERALES ==================== */}
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

          {/* HU1 - Gestión de usuarios */}
          <Route
            path="/usuarios"
            element={<UsuariosPage />}
          />

          {/* HU4 - Aulas */}
          <Route
            path="/aulas"
            element={<AulasPage />}
          />

          {/* HU5 - Normas */}
          <Route
            path="/normas"
            element={<NormasPage />}
          />

          {/* HU6 - Exámenes */}
          <Route
            path="/examenes"
            element={<ExamenesPage />}
          />

          <Route
            path="/mis-examenes"
            element={<MisExamenesPage />}
          />

          <Route
            path="/programar-examen"
            element={<ProgramarExamenPage />}
          />

          <Route
            path="/programar-examen-admin"
            element={<ProgramarExamenAdminPage />}
          />

          {/* HU7 - Estudiantes */}
          <Route
            path="/estudiantes"
            element={<EstudiantesPage />}
          />

        </Route>

        {/* ==================== RUTAS PROTEGIDAS DE ADMIN ==================== */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>

          {/* HU3 - Auditoría */}
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

        {/* ==================== RUTA POR DEFECTO ==================== */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  )
}
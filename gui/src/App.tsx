import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'

// Layouts centralizados con Header y Footer
import PublicLayout from './layouts/PublicLayout'
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'

// Páginas públicas
import { HomePage } from './pages/HomePage'
import CronogramaPublicPage from './pages/CronogramaPublicPage'

// Páginas de autenticación
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'

// Páginas protegidas generales
import { DashboardPage } from './pages/DashboardPage'
import ExamenesPage from './pages/ExamenesPage'
import EstudiantesPage from './pages/EstudiantesPage'
import DetalleExamenPage from './pages/DetalleExamenPage'
import MateriasPage from './pages/MateriasPage'
// Páginas protegidas por Rol
import UsuariosPage from './pages/UsuariosPage'
import AulasPage from './pages/AulasPage'
import NormasPage from './pages/NormasPage'
import { AuditoriaPage } from './pages/AuditoriaPage'
import ProgramarExamenPage from './pages/ProgramarExamenPage'
import ConfiguracionPage from './pages/ConfiguracionPage'


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Rutas públicas con cabecera y pie oficial (PublicLayout) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/cronograma" element={<CronogramaPublicPage />} />
        </Route>

        {/* 2. Rutas de acceso (Login y recuperación) con AuthLayout */}
        <Route element={<PublicRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
          </Route>
        </Route>

        {/* 3. Panel autenticado con MainLayout (Header dinámico por rol + IdleTimer) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/examenes" element={<ExamenesPage />} />
            <Route path="/estudiantes" element={<EstudiantesPage />} />
            <Route path="/examenes" element={<ExamenesPage />} />
            <Route path="/examenes/:id" element={<DetalleExamenPage />} />

            {/* Exclusivo Administrador */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route path="/aulas" element={<AulasPage />} />
              <Route path="/normas" element={<NormasPage />} />
              <Route path="/dashboard/auditoria" element={<AuditoriaPage />} />
              <Route path="/configuracion" element={<ConfiguracionPage />} />
              <Route path="/materias" element={<MateriasPage />} />
            </Route>

            {/* Administrador y Docente */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'docente']} />}>
              <Route path="/programar-examen" element={<ProgramarExamenPage />} />
            </Route>
          </Route>
        </Route>

        {/* Redirección ante cualquier ruta inexistente */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
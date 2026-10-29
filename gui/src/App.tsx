import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'



// Layouts centralizados con Header y Footer
import PublicLayout from './layouts/PublicLayout'
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'
import EstudianteDashboardPage from './pages/EstudianteDashboardPage'
// Páginas públicas
import { HomePage } from './pages/HomePage'
import CronogramaPublicPage from './pages/CronogramaPublicPage'
import { NoticiasPage } from './pages/NoticiasPage'

// Páginas de autenticación
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'

// Páginas protegidas generales
import { DashboardPage } from './pages/DashboardPage'
import ExamenesPage from './pages/ExamenesPage'
import EstudiantesPage from './pages/EstudiantesPage'
import DetalleExamenPage from './pages/DetalleExamenPage'
import IntentosNoAutorizadosPage from './pages/IntentosNoAutorizadosPage'
import MateriasPage from './pages/MateriasPage'
// Páginas protegidas por Rol
import UsuariosPage from './pages/UsuariosPage'
import AulasPage from './pages/AulasPage'
import NormasPage from './pages/NormasPage'
import { AuditoriaPage } from './pages/AuditoriaPage'
import ProgramarExamenPage from './pages/ProgramarExamenPage'
import EstudianteDetalleExamenPage from './pages/EstudianteDetalleExamenPage'
import ConfiguracionPage from './pages/ConfiguracionPage'
import ReportesEstadisticosPage from './pages/ReportesEstadisticosPage'


export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={4000}
      />

      <BrowserRouter>
        <Routes>
        {/* 1. Rutas públicas con cabecera y pie oficial (PublicLayout) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/cronograma" element={<CronogramaPublicPage />} />
          <Route path="/noticias" element={<NoticiasPage />} />
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
          {/* Exclusivo Estudiante */}
<Route element={<ProtectedRoute allowedRoles={['estudiante']} />}>
  <Route
    path="/estudiante"
    element={<EstudianteDashboardPage />}
  />

  {/* Detalle del examen del estudiante */}
  <Route
    path="/estudiante/examenes/:id"
    element={<EstudianteDetalleExamenPage />}
  />
</Route>

<Route path="/examenes" element={<ExamenesPage />} />
            <Route path="/estudiantes" element={<EstudiantesPage />} />
            <Route path="/examenes" element={<ExamenesPage />} />
            <Route path="/examenes/:id" element={<DetalleExamenPage />} />
            <Route
  path="/examenes/:id/intentos-no-autorizados"
  element={
    <ProtectedRoute
      allowedRoles={['admin', 'administrador', 'docente', 'auxiliar']}
    />
  }
>
  <Route
    index
    element={<IntentosNoAutorizadosPage />}
  />
</Route>

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
            <Route element={<ProtectedRoute allowedRoles={['admin', 'administrador', 'docente']} />}>
              <Route path="/programar-examen" element={<ProgramarExamenPage />} />
              <Route path="/reportes" element={<ReportesEstadisticosPage />} />
            </Route>
          </Route>
        </Route>

        {/* Redirección ante cualquier ruta inexistente */}
        <Route path="*" element={<Navigate to="/" replace />} />
 </Routes>
      </BrowserRouter>
    </>
  )
}
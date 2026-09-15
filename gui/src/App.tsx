import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import { IdleTimer } from './components/IdleTimer'
import AulasPage from './pages/AulasPage'
import NormasPage from './pages/NormasPage'
import ProgramarExamenPage from './pages/ProgramarExamenPage'
import ExamenesPage from './pages/ExamenesPage'
import ProgramarExamenAdminPage from './pages/ProgramarExamenAdminPage'
import MisExamenesPage from './pages/MisExamenesPage'
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/recuperar-contrasena"
            element={<ForgotPasswordPage />}
          />
        </Route>

        {/* Rutas Protegidas */}
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

          <Route
            path="/aulas"
            element={<AulasPage />}
          />

          <Route
            path="/normas"
            element={<NormasPage />}
          />
          <Route path="/examenes" element={<ExamenesPage />} />
          <Route
  path="/mis-examenes"
  element={<MisExamenesPage />}
/>

          <Route
            path="/programar-examen"
            element={<ProgramarExamenPage />}
          />
        </Route>
        <Route
  path="/programar-examen-admin"
  element={<ProgramarExamenAdminPage />}
/>
        <Route
        

/>

        {/* Redirección por defecto */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
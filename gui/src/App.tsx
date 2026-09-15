import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { IdleTimer } from './components/IdleTimer'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import { AuditoriaPage } from './pages/AuditoriaPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas (si está logueado, redirige a /dashboard) */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
        </Route>

        {/* Rutas Protegidas (si no hay token, rebota a /login) */}
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
        </Route>

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

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
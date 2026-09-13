import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import { IdleTimer } from './components/IdleTimer'

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

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
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
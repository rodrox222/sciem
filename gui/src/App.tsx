import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import { IdleTimer } from './components/IdleTimer'
import AulasPage from './pages/AulasPage'
import NormasPage from './pages/NormasPage'

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
        </Route>

        {/* Redirección por defecto */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
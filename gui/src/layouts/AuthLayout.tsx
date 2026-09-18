import React from 'react'
import { HomeNavbar } from '../components/home/HomeNavbar'
import { Footer } from '../components/Footer'

interface AuthLayoutProps {
  children: React.ReactNode
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => (
  <div className="flex min-h-screen w-full flex-col bg-sci-bg font-sans">
    <HomeNavbar />
    <main className="flex flex-1 items-center justify-center p-3 sm:p-6 lg:p-8">
      {children}
    </main>
    <Footer />
  </div>
)

export default AuthLayout

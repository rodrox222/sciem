import { useEffect } from 'react'
import { DashboardUnificado } from '@/components/dashboard/DashboardUnificado'

export function DashboardPage() {
  useEffect(() => {
    document.title = 'Dashboard | SCI'
  }, [])

  return <DashboardUnificado />
}

export default DashboardPage

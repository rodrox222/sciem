import { api } from '@/services/api'
import { apiUrl } from '@/services/apiUrl'

export interface BackupItem {
  nombre: string
  tipo: 'manual' | 'automatico' | 'pre_restore'
  tamano_bytes: number
  fecha_creacion: string
}

export const backupService = {
  async list(): Promise<BackupItem[]> {
    const res = await api.get<{ success: boolean; backups: BackupItem[] }>('/admin/backups')
    return res.backups ?? []
  },

  async createManual(): Promise<BackupItem> {
    const res = await api.post<{ success: boolean; message: string; backup: BackupItem }>(
      '/admin/backups',
      {},
    )
    return res.backup
  },

  async restore(nombreArchivo: string): Promise<{
    message: string
    restaurado: string
    pre_restore: string
  }> {
    return api.post(`/admin/backups/${encodeURIComponent(nombreArchivo)}/restaurar`, {
      confirmacion: 'RESTAURAR',
    })
  },

  async remove(nombreArchivo: string): Promise<void> {
    await api.delete(`/admin/backups/${encodeURIComponent(nombreArchivo)}`)
  },

  async download(nombreArchivo: string): Promise<void> {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || ''
    const res = await fetch(
      apiUrl(`/admin/backups/${encodeURIComponent(nombreArchivo)}/descargar`),
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    )
    if (!res.ok) {
      throw new Error('No se pudo descargar el respaldo.')
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = nombreArchivo
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },
}

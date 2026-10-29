import type { Examen } from '@/services/examenes.service'

const rolActual = () => (localStorage.getItem('user_role') ?? '').toLowerCase()
const idActual = (): string | null => {
  try {
    const usuario = JSON.parse(localStorage.getItem('user_data') ?? 'null') as { id?: string | number } | null
    return usuario?.id != null ? String(usuario.id) : null
  } catch {
    return null
  }
}

/** El filtro de UI no sustituye las autorizaciones obligatorias del backend. */
export function permiteMonitoreoFrontend(exam: Examen): boolean {
  const rol = rolActual()
  if (rol === 'admin' || rol === 'administrador') return true
  return rol === 'docente' && idActual() !== null && idActual() === String(exam.id_docente)
}

/**
 * Contratos oficiales de HU16: únicamente GET autenticados.
 * El permiso del frontend es orientativo; la API debe validar rol y propiedad del examen.
 */
import { api } from './api'

export interface EstudianteMonitoreo {
  id: string
  nombre: string
  sis: string
  fechaIngreso?: string
  horaIngreso?: string
}

export interface ResumenMonitoreo {
  inscritos: number
  ingresados: number
  ausentes: number
}

export interface ListasMonitoreo {
  ingresados: EstudianteMonitoreo[]
  ausentes: EstudianteMonitoreo[]
}

interface ResumenRespuesta {
  examen: { id: string; nombre: string; fecha: string | null }
  resumen: {
    total_estudiantes: number
    total_ingresados: number
    total_ausentes: number
  }
}

interface EstudianteRespuesta {
  id: string | number
  codigo_sis: string | null
  ci: string | null
  nombre: string | null
  apellido_paterno: string | null
  apellido_materno: string | null
  fecha_ingreso: string | null
}

interface ListaRespuesta {
  examen: { id: string; nombre: string }
  estado: 'ingresados' | 'ausentes'
  total: number
  estudiantes: EstudianteRespuesta[]
}

const ordenar = (a: EstudianteMonitoreo, b: EstudianteMonitoreo) =>
  a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })

function fechaYHora(valor: string | null): { fechaIngreso?: string; horaIngreso?: string } {
  if (!valor) return {}

  // Los timestamps ISO con zona explícita se convierten a la hora boliviana.
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(valor)) {
    const fecha = new Date(valor)
    if (!Number.isNaN(fecha.getTime())) {
      return {
        fechaIngreso: new Intl.DateTimeFormat('es-BO', {
          day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/La_Paz',
        }).format(fecha),
        horaIngreso: new Intl.DateTimeFormat('es-BO', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/La_Paz',
        }).format(fecha),
      }
    }
  }

  // Si Laravel entrega hora sin zona, no inventamos una conversión horaria.
  const coincidencia = valor.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/)
  if (coincidencia) {
    return {
      fechaIngreso: `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}`,
      horaIngreso: coincidencia[4],
    }
  }
  return { fechaIngreso: valor }
}

function normalizarEstudiantes(entradas: EstudianteRespuesta[]): EstudianteMonitoreo[] {
  const unicos = new Map<string, EstudianteMonitoreo>()
  for (const estudiante of entradas) {
    const id = String(estudiante.id)
    if (unicos.has(id)) continue
    const nombre = [estudiante.nombre, estudiante.apellido_paterno, estudiante.apellido_materno]
      .filter((fragmento): fragmento is string => Boolean(fragmento?.trim()))
      .join(' ')
    unicos.set(id, {
      id,
      nombre: nombre || 'Estudiante sin nombre',
      sis: estudiante.codigo_sis || 'Sin código SIS',
      ...fechaYHora(estudiante.fecha_ingreso),
    })
  }
  return [...unicos.values()].sort(ordenar)
}

export function construirListasMonitoreo(
  ingresados: ListaRespuesta,
  ausentes: ListaRespuesta,
): ListasMonitoreo {
  if (ingresados.estado !== 'ingresados' || ausentes.estado !== 'ausentes' ||
      ingresados.examen.id !== ausentes.examen.id) {
    throw new Error('El servidor devolvió listas de monitoreo incompatibles.')
  }

  const listaIngresados = normalizarEstudiantes(ingresados.estudiantes)
  const idsIngresados = new Set(listaIngresados.map((estudiante) => estudiante.id))
  const listaAusentes = normalizarEstudiantes(ausentes.estudiantes)
  if (listaAusentes.some((estudiante) => idsIngresados.has(estudiante.id))) {
    throw new Error('Las listas contienen estudiantes en ambos estados. Se reintentará la consulta.')
  }
  return { ingresados: listaIngresados, ausentes: listaAusentes }
}

export function validarResumenYListas(resumen: ResumenMonitoreo, listas: ListasMonitoreo): void {
  if (resumen.inscritos !== resumen.ingresados + resumen.ausentes ||
      resumen.ingresados !== listas.ingresados.length ||
      resumen.ausentes !== listas.ausentes.length) {
    throw new Error('Los totales y las listas aún no coinciden. Se reintentará la sincronización.')
  }
}

export const monitoreoService = {
  async resumen(examenId: string): Promise<ResumenMonitoreo> {
    const respuesta = await api.get<ResumenRespuesta>(`/examenes/${encodeURIComponent(examenId)}/monitoreo`)
    if (String(respuesta.examen.id) !== examenId) {
      throw new Error('El servidor devolvió un resumen de otro examen.')
    }
    return {
      inscritos: respuesta.resumen.total_estudiantes,
      ingresados: respuesta.resumen.total_ingresados,
      ausentes: respuesta.resumen.total_ausentes,
    }
  },

  async listas(examenId: string): Promise<ListasMonitoreo> {
    const base = `/examenes/${encodeURIComponent(examenId)}/monitoreo/estudiantes`
    const [ingresados, ausentes] = await Promise.all([
      api.get<ListaRespuesta>(`${base}?estado=ingresados`),
      api.get<ListaRespuesta>(`${base}?estado=ausentes`),
    ])
    if (String(ingresados.examen.id) !== examenId || String(ausentes.examen.id) !== examenId) {
      throw new Error('El servidor devolvió estudiantes de otro examen.')
    }
    return construirListasMonitoreo(ingresados, ausentes)
  },
}

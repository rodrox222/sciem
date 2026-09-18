import React, { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  X,
} from 'lucide-react'

import { MainLayout } from '../layouts/MainLayout'
import { NormaSelector } from '../components/normas/NormaSelector'
import type { Norma } from '../components/normas/NormaFormModal'

type Paso = 1 | 2 | 3 | 4

interface Aula {
  id: number
  nombre: string
  capacidad: number
  disponible: boolean
}

const normasIniciales: Norma[] = [
  {
    id: 1,
    descripcion:
      'El estudiante deberá presentar su identificación institucional antes de iniciar el examen.',
    tipo: 'General',
    estado: 'Activo',
  },
  {
    id: 2,
    descripcion:
      'No está permitido utilizar teléfonos celulares u otros dispositivos electrónicos durante el examen.',
    tipo: 'General',
    estado: 'Activo',
  },
  {
    id: 3,
    descripcion:
      'El estudiante deberá permanecer en el ambiente asignado durante todo el desarrollo del examen.',
    tipo: 'General',
    estado: 'Activo',
  },
  {
    id: 4,
    descripcion:
      'Los estudiantes seleccionados deberán presentarse 15 minutos antes de la hora programada.',
    tipo: 'Particular',
    estado: 'Activo',
  },
]

const asignaturasIniciales = [
  { id: 1, nombre: 'Sistemas Operativos' },
  { id: 2, nombre: 'Ingeniería de Software' },
  { id: 3, nombre: 'Redes de Computadoras' },
  { id: 4, nombre: 'Bases de Datos' },
  { id: 5, nombre: 'Simulación de Sistemas' },
]

const aulasIniciales: Aula[] = [
  {
    id: 1,
    nombre: 'Aula A-101',
    capacidad: 30,
    disponible: true,
  },
  {
    id: 2,
    nombre: 'Aula A-203',
    capacidad: 40,
    disponible: true,
  },
  {
    id: 3,
    nombre: 'Laboratorio L-01',
    capacidad: 25,
    disponible: true,
  },
  {
    id: 4,
    nombre: 'Aula B-105',
    capacidad: 35,
    disponible: false,
  },
]

const pasos = [
  {
    numero: 1,
    titulo: 'Datos del examen',
    descripcion: 'Información de la asignatura',
    icono: FileText,
  },
  {
    numero: 2,
    titulo: 'Horario',
    descripcion: 'Fecha y duración',
    icono: Clock,
  },
  {
    numero: 3,
    titulo: 'Ambiente y normas',
    descripcion: 'Aula y normas',
    icono: MapPin,
  },
  {
    numero: 4,
    titulo: 'Confirmación',
    descripcion: 'Revisar información',
    icono: CheckCircle2,
  },
]

const TIPO_NORMA_BADGE: Record<string, string> = {
  General: 'border-blue-200 bg-blue-50 text-[#002b5b]',
  Particular: 'border-purple-200 bg-purple-50 text-purple-700',
}

export const ProgramarExamenPage: React.FC = () => {
  const role = localStorage.getItem('user_role') || 'Docente'
  const esAdministrador =
    role.toLowerCase() === 'administrador' || role.toLowerCase() === 'admin'

  const [pasoActual, setPasoActual] = useState<Paso>(1)

  const [asignatura, setAsignatura] = useState('')
  const [fecha, setFecha] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [duracion, setDuracion] = useState('')

  const [aulaId, setAulaId] = useState<number | null>(null)
  const [normasSeleccionadas, setNormasSeleccionadas] = useState<number[]>([])
  const [normas, setNormas] = useState<Norma[]>(normasIniciales)

  const [error, setError] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')

  const aulasDisponibles = useMemo(
    () => aulasIniciales.filter((aula) => aula.disponible),
    []
  )

  const horaFin = useMemo(() => {
    if (!horaInicio || !duracion) return ''

    const minutosDuracion = Number(duracion)

    if (!Number.isFinite(minutosDuracion) || minutosDuracion <= 0) {
      return ''
    }

    const [horas, minutos] = horaInicio.split(':').map(Number)

    if (Number.isNaN(horas) || Number.isNaN(minutos)) {
      return ''
    }

    const fechaHora = new Date()
    fechaHora.setHours(horas, minutos, 0, 0)
    fechaHora.setMinutes(fechaHora.getMinutes() + minutosDuracion)

    const horasFin = String(fechaHora.getHours()).padStart(2, '0')
    const minutosFin = String(fechaHora.getMinutes()).padStart(2, '0')

    return `${horasFin}:${minutosFin}`
  }, [horaInicio, duracion])

  const fechaMinima = useMemo(() => {
    const hoy = new Date()
    const year = hoy.getFullYear()
    const month = String(hoy.getMonth() + 1).padStart(2, '0')
    const day = String(hoy.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }, [])

  const aulaSeleccionada = aulasIniciales.find((aula) => aula.id === aulaId)

  const normasSeleccionadasData = normas.filter((norma) =>
    normasSeleccionadas.includes(norma.id)
  )

  const limpiarMensajes = () => {
    setError('')
    setMensajeExito('')
  }

  const crearNormaParticular = (descripcion: string) => {
    const nuevaNorma: Norma = {
      id: Date.now(),
      descripcion,
      tipo: 'Particular',
      estado: 'Activo',
    }

    setNormas((normasActuales) => [...normasActuales, nuevaNorma])
    setNormasSeleccionadas((seleccionadas) => [
      ...seleccionadas,
      nuevaNorma.id,
    ])
  }

  const validarPaso1 = () => {
    if (!asignatura.trim()) {
      setError('Debes seleccionar la asignatura del examen.')
      return false
    }
    return true
  }

  const validarPaso2 = () => {
    if (!fecha) {
      setError('Debes seleccionar la fecha del examen.')
      return false
    }

    if (fecha < fechaMinima) {
      setError('La fecha del examen no puede ser anterior a la fecha actual.')
      return false
    }

    if (!horaInicio) {
      setError('Debes seleccionar la hora de inicio.')
      return false
    }

    if (!duracion.trim()) {
      setError('Debes ingresar la duración del examen.')
      return false
    }

    const minutosDuracion = Number(duracion)

    if (!Number.isFinite(minutosDuracion) || minutosDuracion <= 0) {
      setError('La duración del examen debe ser mayor a 0 minutos.')
      return false
    }

    if (!horaFin) {
      setError('No fue posible calcular la hora de finalización.')
      return false
    }

    return true
  }

  const validarPaso3 = () => {
    if (!aulaId) {
      setError('Debes seleccionar un aula para el examen.')
      return false
    }

    if (normasSeleccionadas.length === 0) {
      setError('Debes seleccionar al menos una norma para el examen.')
      return false
    }

    return true
  }

  const cambiarPaso = (destino: Paso) => {
    limpiarMensajes()

    if (destino === pasoActual) return

    if (destino > pasoActual) {
      if (destino >= 2 && !validarPaso1()) {
        setPasoActual(1)
        return
      }

      if (destino >= 3 && !validarPaso2()) {
        setPasoActual(2)
        return
      }

      if (destino >= 4 && !validarPaso3()) {
        setPasoActual(3)
        return
      }
    }

    setPasoActual(destino)
  }

  const irSiguiente = () => {
    limpiarMensajes()

    if (pasoActual === 1) {
      if (!validarPaso1()) return
      setPasoActual(2)
      return
    }

    if (pasoActual === 2) {
      if (!validarPaso2()) return
      setPasoActual(3)
      return
    }

    if (pasoActual === 3) {
      if (!validarPaso3()) return
      setPasoActual(4)
    }
  }

  const irAnterior = () => {
    limpiarMensajes()

    if (pasoActual > 1) {
      setPasoActual((pasoActual - 1) as Paso)
    }
  }

  const cancelarFormulario = () => {
    setAsignatura('')
    setFecha('')
    setHoraInicio('')
    setDuracion('')
    setAulaId(null)
    setNormasSeleccionadas([])
    setPasoActual(1)
    limpiarMensajes()
  }

  const confirmarProgramacion = () => {
    limpiarMensajes()

    if (!validarPaso1() || !validarPaso2() || !validarPaso3()) {
      return
    }

    setMensajeExito(
      'El examen fue validado correctamente. La conexión con el API se integrará posteriormente.'
    )
  }

  const renderPasoActual = () => {
    switch (pasoActual) {
      case 1:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#003770]">
                Datos del examen
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ingresa la información básica del examen que deseas programar.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Asignatura <span className="text-[#E30613]">*</span>
              </label>

              <p className="mb-3 text-sm text-slate-500">
                Selecciona la asignatura correspondiente al examen.
              </p>

              <div className="space-y-2">
                {asignaturasIniciales.map((asignaturaItem) => {
                  const seleccionada = asignatura === asignaturaItem.nombre

                  return (
                    <button
                      key={asignaturaItem.id}
                      type="button"
                      onClick={() => setAsignatura(asignaturaItem.nombre)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                        seleccionada
                          ? 'border-[#003770] bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          seleccionada
                            ? 'border-[#003770] bg-[#003770]'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {seleccionada && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                        )}
                      </span>

                      <span className="text-sm font-medium text-slate-700">
                        {asignaturaItem.nombre}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        )

      case 2:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#003770]">
                Horario del examen
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Define la fecha, hora de inicio y duración. La hora de
                finalización se calculará automáticamente.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label
                  htmlFor="fecha"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Fecha <span className="text-[#E30613]">*</span>
                </label>

                <input
                  id="fecha"
                  type="date"
                  min={fechaMinima}
                  value={fecha}
                  onChange={(event) => setFecha(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="horaInicio"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Hora de inicio <span className="text-[#E30613]">*</span>
                </label>

                <input
                  id="horaInicio"
                  type="time"
                  value={horaInicio}
                  onChange={(event) => setHoraInicio(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="duracion"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Duración en minutos <span className="text-[#E30613]">*</span>
                </label>

                <input
                  id="duracion"
                  type="text"
                  inputMode="numeric"
                  value={duracion}
                  maxLength={3}
                  onChange={(event) => {
                    const valor = event.target.value.replace(/\D/g, '')

                    if (valor === '') {
                      setDuracion('')
                      return
                    }

                    const minutos = Number(valor)

                    if (minutos <= 270) {
                      setDuracion(valor)
                    }
                  }}
                  placeholder="Ej. 90"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20"
                />

                <p className="mt-1.5 text-xs text-slate-400">
                  La duración debe estar entre 1 y 270 minutos (máximo 4 horas y 30 minutos).
                </p>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#003770]">
                      Hora de finalización
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Calculada automáticamente
                    </p>
                  </div>

                  <span className="text-xl font-bold text-[#003770]">
                    {horaFin || '--:--'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )

      case 3:
        return (
          <section className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-[#003770]">
                Ambiente y normas
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Selecciona el aula donde se realizará el examen y las normas
                que deberán cumplirse.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="aula"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Aula <span className="text-[#E30613]">*</span>
                </label>

                <select
                  id="aula"
                  value={aulaId ?? ''}
                  onChange={(event) =>
                    setAulaId(
                      event.target.value ? Number(event.target.value) : null
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20"
                >
                  <option value="">Selecciona un aula disponible</option>
                  {aulasDisponibles.map((aula) => (
                    <option key={aula.id} value={aula.id}>
                      {aula.nombre} · Capacidad: {aula.capacidad}
                    </option>
                  ))}
                </select>

                <p className="mt-1.5 text-xs text-slate-400">
                  Solo se muestran ambientes actualmente disponibles.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <NormaSelector
                  normas={normas}
                  selectedIds={normasSeleccionadas}
                  onChange={setNormasSeleccionadas}
                  permitirNormaParticular={!esAdministrador}
                  onCrearNormaParticular={crearNormaParticular}
                />
              </div>
            </div>
          </section>
        )

      case 4:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#003770]">
                Confirmar programación
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Revisa la información antes de confirmar el examen.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="divide-y divide-slate-200">
                <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Asignatura
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {asignatura}
                  </span>
                </div>

                <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-slate-500">Fecha</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {fecha}
                  </span>
                </div>

                <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Horario
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {horaInicio} - {horaFin}
                  </span>
                </div>

                <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    Duración
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {duracion} minutos
                  </span>
                </div>

                <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-slate-500">Aula</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {aulaSeleccionada?.nombre || 'No seleccionada'}
                  </span>
                </div>

                <div className="px-4 py-4">
                  <span className="text-sm font-medium text-slate-500">
                    Normas seleccionadas
                  </span>

                  <div className="mt-3 space-y-2">
                    {normasSeleccionadasData.map((norma) => (
                      <div
                        key={norma.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <span
                          className={`mb-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            TIPO_NORMA_BADGE[norma.tipo] ||
                            'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          {norma.tipo}
                        </span>

                        <p className="text-sm leading-relaxed text-slate-700">
                          {norma.descripcion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm leading-relaxed text-amber-800">
                Al confirmar, el sistema deberá verificar nuevamente la
                disponibilidad del aula y que no exista un conflicto de
                horario antes de guardar el examen.
              </p>
            </div>
          </section>
        )

      default:
        return null
    }
  }

  return (
    <MainLayout>
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Programación de exámenes
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#003770] sm:text-3xl">
              Programar examen
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Completa la información requerida para programar un examen.
            </p>
          </div>

          <button
            type="button"
            onClick={cancelarFormulario}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Limpiar
          </button>
        </div>

        {/* Stepper de Pasos */}
        <div className="overflow-x-auto">
          <div className="min-w-[680px] rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-start">
              {pasos.map((paso, index) => {
                const Icon = paso.icono
                const completado = paso.numero < pasoActual
                const activo = paso.numero === pasoActual

                return (
                  <React.Fragment key={paso.numero}>
                    <button
                      type="button"
                      onClick={() => cambiarPaso(paso.numero as Paso)}
                      className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg p-2 text-left transition hover:bg-slate-50"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                          completado
                            ? 'border-[#003770] bg-[#003770] text-white'
                            : activo
                            ? 'border-[#003770] bg-blue-50 text-[#003770]'
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        {completado ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            activo || completado
                              ? 'text-[#003770]'
                              : 'text-slate-400'
                          }`}
                        >
                          {paso.titulo}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {paso.descripcion}
                        </p>
                      </div>
                    </button>

                    {index < pasos.length - 1 && (
                      <div
                        className={`mt-5 h-0.5 w-10 shrink-0 ${
                          paso.numero < pasoActual
                            ? 'bg-[#003770]'
                            : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tarjeta de Contenido */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="p-5 sm:p-8">
            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium leading-relaxed text-red-700">
                  {error}
                </p>
              </div>
            )}

            {mensajeExito && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Programación validada
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-green-700">
                    {mensajeExito}
                  </p>
                </div>
              </div>
            )}

            {renderPasoActual()}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              {pasoActual > 1 && (
                <button
                  type="button"
                  onClick={irAnterior}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </button>
              )}
            </div>

            <div>
              {pasoActual < 4 ? (
                <button
                  type="button"
                  onClick={irSiguiente}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#003770] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002b5b] sm:w-auto"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={confirmarProgramacion}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#E30613] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c90511] sm:w-auto"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar programación
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default ProgramarExamenPage
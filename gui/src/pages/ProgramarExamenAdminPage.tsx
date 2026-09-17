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

import { AdminNavbar } from '../components/AdminNavbar'
import { AdminFooter } from '../components/AdminFooter'
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

export const ProgramarExamenAdminPage: React.FC = () => {
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
    [],
  )

  const fechaMinima = useMemo(() => {
    const hoy = new Date()
    const year = hoy.getFullYear()
    const month = String(hoy.getMonth() + 1).padStart(2, '0')
    const day = String(hoy.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }, [])

  const horaFin = useMemo(() => {
    if (!horaInicio || !duracion) return ''

    const minutosDuracion = Number(duracion)

    if (
      !Number.isFinite(minutosDuracion) ||
      minutosDuracion <= 0
    ) {
      return ''
    }

    const [horas, minutos] = horaInicio.split(':').map(Number)

    if (
      Number.isNaN(horas) ||
      Number.isNaN(minutos)
    ) {
      return ''
    }

    const fechaHora = new Date()

    fechaHora.setHours(horas, minutos, 0, 0)
    fechaHora.setMinutes(
      fechaHora.getMinutes() + minutosDuracion,
    )

    const horasFin = String(fechaHora.getHours()).padStart(2, '0')
    const minutosFin = String(fechaHora.getMinutes()).padStart(2, '0')

    return `${horasFin}:${minutosFin}`
  }, [horaInicio, duracion])

  const aulaSeleccionada = aulasIniciales.find(
    (aula) => aula.id === aulaId,
  )

  const normasSeleccionadasData = normas.filter((norma) =>
    normasSeleccionadas.includes(norma.id),
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

    setNormas((normasActuales) => [
      ...normasActuales,
      nuevaNorma,
    ])

    setNormasSeleccionadas((seleccionadas) => [
      ...seleccionadas,
      nuevaNorma.id,
    ])
  }

  const validarPaso1 = () => {
    if (!asignatura.trim()) {
      setError('Debes seleccionar una asignatura para el examen.')
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
      setError(
        'La fecha del examen no puede ser anterior a la fecha actual.',
      )
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

    if (
      !Number.isFinite(minutosDuracion) ||
      minutosDuracion <= 0
    ) {
      setError(
        'La duración del examen debe ser mayor a 0 minutos.',
      )
      return false
    }

    if (minutosDuracion > 270) {
      setError(
        'La duración máxima permitida para el examen es de 270 minutos.',
      )
      return false
    }

    if (!horaFin) {
      setError(
        'No fue posible calcular la hora de finalización.',
      )
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
      setError(
        'Debes seleccionar al menos una norma para el examen.',
      )
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

    if (
      !validarPaso1() ||
      !validarPaso2() ||
      !validarPaso3()
    ) {
      return
    }

    setMensajeExito(
      'El examen fue validado correctamente. La conexión con el API se integrará posteriormente.',
    )
  }

  const renderPasoActual = () => {
    switch (pasoActual) {
      case 1:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Datos del examen
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Selecciona la asignatura correspondiente al examen.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                Asignatura
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {asignaturasIniciales.map((item) => {
                  const seleccionada =
                    asignatura === item.nombre

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setAsignatura(item.nombre)
                        limpiarMensajes()
                      }}
                      className={`rounded-xl border p-4 text-left transition ${
                        seleccionada
                          ? 'border-[#003770] bg-blue-50 ring-2 ring-[#003770]/20'
                          : 'border-slate-200 bg-white hover:border-[#00A3E0] hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            seleccionada
                              ? 'border-[#003770] bg-[#003770]'
                              : 'border-slate-300'
                          }`}
                        >
                          {seleccionada && (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-800">
                            {item.nombre}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Asignatura disponible
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {asignatura && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#003770]">
                  Asignatura seleccionada
                </p>

                <p className="mt-1 font-bold text-slate-800">
                  {asignatura}
                </p>
              </div>
            )}
          </section>
        )

      case 2:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Horario del examen
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Define la fecha, hora de inicio y duración.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <label
                  htmlFor="fecha-examen"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Fecha
                </label>

                <input
                  id="fecha-examen"
                  type="date"
                  min={fechaMinima}
                  value={fecha}
                  onChange={(event) => {
                    setFecha(event.target.value)
                    limpiarMensajes()
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="hora-inicio"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Hora de inicio
                </label>

                <input
                  id="hora-inicio"
                  type="time"
                  value={horaInicio}
                  onChange={(event) => {
                    setHoraInicio(event.target.value)
                    limpiarMensajes()
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="duracion"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Duración (minutos)
                </label>

                <input
                  id="duracion"
                  type="number"
                  min="1"
                  max="270"
                  value={duracion}
                  onChange={(event) => {
                    setDuracion(event.target.value)
                    limpiarMensajes()
                  }}
                  placeholder="Ej. 90"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20"
                />

                <p className="text-xs text-slate-500">
                  Máximo permitido: 270 minutos.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Hora de finalización
                  </p>

                  <p className="mt-1 text-2xl font-bold text-[#003770]">
                    {horaFin || '--:--'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="h-5 w-5" />
                  <span>
                    Se calcula automáticamente según la duración.
                  </span>
                </div>
              </div>
            </div>
          </section>
        )

      case 3:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Ambiente y normas
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Selecciona el aula y las normas que aplicarán al examen.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="aula"
                className="block text-sm font-semibold text-slate-700"
              >
                Aula disponible
              </label>

              <select
                id="aula"
                value={aulaId ?? ''}
                onChange={(event) => {
                  const value = event.target.value

                  setAulaId(
                    value ? Number(value) : null,
                  )

                  limpiarMensajes()
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-[#003770] focus:ring-2 focus:ring-[#003770]/20"
              >
                <option value="">
                  Selecciona un aula
                </option>

                {aulasDisponibles.map((aula) => (
                  <option
                    key={aula.id}
                    value={aula.id}
                  >
                    {aula.nombre} · Capacidad: {aula.capacidad}
                  </option>
                ))}
              </select>
            </div>

            {aulaSeleccionada && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                <div>
                  <p className="font-semibold text-slate-800">
                    {aulaSeleccionada.nombre}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Capacidad disponible:{' '}
                    {aulaSeleccionada.capacidad} estudiantes.
                  </p>
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 pt-6">
              <NormaSelector
                normas={normas}
                selectedIds={normasSeleccionadas}
                onChange={setNormasSeleccionadas}
                permitirNormaParticular={true}
                onCrearNormaParticular={
                  crearNormaParticular
                }
              />
            </div>
          </section>
        )

      case 4:
        return (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Confirmación
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Revisa la información antes de programar el examen.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Asignatura
                </p>

                <p className="mt-2 font-bold text-slate-800">
                  {asignatura}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fecha
                </p>

                <p className="mt-2 font-bold text-slate-800">
                  {fecha || 'No definida'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Horario
                </p>

                <p className="mt-2 font-bold text-slate-800">
                  {horaInicio || '--:--'} - {horaFin || '--:--'}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Duración: {duracion || '0'} minutos
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ambiente
                </p>

                <p className="mt-2 font-bold text-slate-800">
                  {aulaSeleccionada?.nombre ||
                    'No seleccionado'}
                </p>

                {aulaSeleccionada && (
                  <p className="mt-1 text-sm text-slate-500">
                    Capacidad: {aulaSeleccionada.capacidad}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Normas seleccionadas
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {normasSeleccionadasData.length} norma(s)
                  </p>
                </div>

                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>

              <div className="mt-4 space-y-3">
                {normasSeleccionadasData.map((norma) => (
                  <div
                    key={norma.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          norma.tipo === 'General'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {norma.tipo}
                      </span>

                      <span className="text-xs font-medium text-emerald-600">
                        {norma.estado}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {norma.descripcion}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm leading-6 text-amber-800">
                Al confirmar, el examen quedará registrado con
                estado <strong>Programado</strong>. La validación
                definitiva de disponibilidad y solapamiento del
                aula será realizada posteriormente por el API.
              </p>
            </div>
          </section>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col">
      <AdminNavbar
        rol="Administrador"
        usuario="Administrador"
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#003770]">
                Administración de exámenes
              </p>

              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                Programar examen
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Registra y programa un nuevo examen indicando su
                asignatura, horario, ambiente y normas aplicables.
              </p>
            </div>

            <button
              type="button"
              onClick={cancelarFormulario}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Limpiar
            </button>
          </div>
        </div>

        <div className="mb-8 overflow-x-auto">
          <div className="flex min-w-[700px] items-start">
            {pasos.map((paso, index) => {
              const Icon = paso.icono

              const activo = paso.numero === pasoActual
              const completado = paso.numero < pasoActual

              return (
                <React.Fragment key={paso.numero}>
                  <button
                    type="button"
                    onClick={() =>
                      cambiarPaso(paso.numero as Paso)
                    }
                    className="flex min-w-[150px] flex-1 flex-col items-center text-center"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition ${
                        activo
                          ? 'border-[#003770] bg-[#003770] text-white'
                          : completado
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 bg-white text-slate-400'
                      }`}
                    >
                      {completado ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>

                    <p
                      className={`mt-2 text-sm font-semibold ${
                        activo
                          ? 'text-[#003770]'
                          : completado
                            ? 'text-emerald-600'
                            : 'text-slate-500'
                      }`}
                    >
                      {paso.titulo}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {paso.descripcion}
                    </p>
                  </button>

                  {index < pasos.length - 1 && (
                    <div
                      className={`mt-5 h-0.5 min-w-8 flex-1 ${
                        paso.numero < pasoActual
                          ? 'bg-emerald-500'
                          : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5 sm:p-8">
            {error && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {error}
              </div>
            )}

            {mensajeExito && (
              <div
                role="status"
                className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-700"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                <div>
                  <p className="font-bold">
                    Examen validado correctamente
                  </p>

                  <p className="mt-1">
                    {mensajeExito}
                  </p>
                </div>
              </div>
            )}

            {renderPasoActual()}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <button
              type="button"
              onClick={irAnterior}
              disabled={pasoActual === 1}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </button>

            {pasoActual < 4 ? (
              <button
                type="button"
                onClick={irSiguiente}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#003770] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#002b5b]"
              >
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={confirmarProgramacion}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmar programación
              </button>
            )}
          </div>
        </div>
      </main>

      <AdminFooter />
    </div>
  )
}

export default ProgramarExamenAdminPage

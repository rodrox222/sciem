import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  Camera,
  CheckCircle2,
  Clock3,
  IdCard,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRoundCheck,
  UserRoundX,
  VideoOff,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/services/api'
import {
  expulsionesService,
  type AsistenciaExpulsion,
} from '@/services/expulsiones.service'
import {
  estudiantesService,
  type Estudiante,
  type EstudianteInscritoExamen,
} from '@/services/estudiantes.service'
import type { Examen } from '@/services/examenes.service'

const READER_ID = 'expulsion-qr-reader'

type Elegibilidad = {
  elegible: boolean
  etiqueta: string
  detalle: string
  asistencia?: AsistenciaExpulsion
}

const nombreCompleto = (estudiante: Estudiante) =>
  [
    estudiante.nombre,
    estudiante.apellido_paterno,
    estudiante.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function DetalleExpulsionesTab({ exam }: { exam: Examen }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<Estudiante[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [roster, setRoster] = useState<EstudianteInscritoExamen[]>([])
  const [asistencias, setAsistencias] = useState<AsistenciaExpulsion[]>([])
  const [contextLoading, setContextLoading] = useState(true)
  const [contextError, setContextError] = useState('')

  const [selectedStudent, setSelectedStudent] = useState<Estudiante | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [qrSearching, setQrSearching] = useState(false)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scanLockedRef = useRef(false)
  const searchRequestRef = useRef(0)

  const loadContext = useCallback(async () => {
    setContextLoading(true)
    setContextError('')

    try {
      const [rosterResponse, asistenciasResponse] = await Promise.all([
        estudiantesService.listByExam(exam.id),
        expulsionesService.listarAsistencias(exam.id),
      ])

      setRoster(rosterResponse.estudiantes ?? [])
      setAsistencias(asistenciasResponse.asistencias ?? [])
    } catch (error) {
      setContextError(
        getErrorMessage(
          error,
          'No se pudo verificar el padrón y los ingresos registrados para este examen.',
        ),
      )
    } finally {
      setContextLoading(false)
    }
  }, [exam.id])

  useEffect(() => {
    let cancelled = false

    Promise.all([
      estudiantesService.listByExam(exam.id),
      expulsionesService.listarAsistencias(exam.id),
    ])
      .then(([rosterResponse, asistenciasResponse]) => {
        if (cancelled) return
        setRoster(rosterResponse.estudiantes ?? [])
        setAsistencias(asistenciasResponse.asistencias ?? [])
        setContextError('')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setContextError(
          getErrorMessage(
            error,
            'No se pudo verificar el padrón y los ingresos registrados para este examen.',
          ),
        )
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [exam.id])

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    scannerRef.current = null

    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop()
        await scanner.clear()
      } catch {
        // El lector puede haber sido liberado por el navegador al cerrar la cámara.
      }
    }

    scanLockedRef.current = false
    setCameraActive(false)
  }, [])

  const buscarQr = useCallback(
    async (decodedText: string) => {
      if (scanLockedRef.current) return

      scanLockedRef.current = true
      searchRequestRef.current += 1
      setQrSearching(true)
      setSearchQuery('')
      setSearchError('')
      setSelectedStudent(null)

      try {
        const response = await expulsionesService.buscarPorQr(decodedText)
        setResults(response.estudiantes ?? [])
        setSearched(true)

        if ((response.estudiantes ?? []).length === 0) {
          setSearchError('El código QR no corresponde a un estudiante registrado.')
        }
      } catch (error) {
        setResults([])
        setSearched(true)
        setSearchError(
          getErrorMessage(error, 'No se pudo identificar al estudiante mediante el código QR.'),
        )
      } finally {
        setQrSearching(false)
        await stopScanner()
      }
    },
    [stopScanner],
  )

  const startScanner = useCallback(async () => {
    setCameraError('')
    setSearchError('')
    await stopScanner()

    try {
      const scanner = new Html5Qrcode(READER_ID)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: (width, height) => {
            const edge = Math.floor(Math.min(width, height) * 0.68)
            return { width: edge, height: edge }
          },
          aspectRatio: 1,
        },
        (decodedText) => void buscarQr(decodedText),
        () => {},
      )

      setCameraActive(true)
    } catch (error) {
      scannerRef.current = null
      setCameraActive(false)
      setCameraError(
        getErrorMessage(
          error,
          'No se pudo acceder a la cámara. Revisa los permisos del navegador.',
        ),
      )
    }
  }, [buscarQr, stopScanner])

  useEffect(
    () => () => {
      void stopScanner()
    },
    [stopScanner],
  )

  const executeSearch = useCallback(async (query: string) => {
    const requestId = ++searchRequestRef.current

    setSearching(true)
    setSearchError('')

    try {
      const response = await expulsionesService.buscarEstudiantes(query)

      if (requestId !== searchRequestRef.current) return

      setResults(response.estudiantes ?? [])
      setSearched(true)
    } catch (error) {
      if (requestId !== searchRequestRef.current) return

      setResults([])
      setSearched(true)
      setSearchError(
        getErrorMessage(error, 'No se pudo completar la búsqueda de estudiantes.'),
      )
    } finally {
      if (requestId === searchRequestRef.current) {
        setSearching(false)
      }
    }
  }, [])

  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) return

    const timeoutId = window.setTimeout(() => {
      void executeSearch(query)
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [executeSearch, searchQuery])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setSelectedStudent(null)
    setSearchError('')

    if (!value.trim()) {
      searchRequestRef.current += 1
      setResults([])
      setSearched(false)
      setSearching(false)
    }
  }

  const getElegibilidad = (student: Estudiante): Elegibilidad => {
    if (contextLoading) {
      return {
        elegible: false,
        etiqueta: 'Verificando',
        detalle: 'Comprobando inscripción e ingreso previo.',
      }
    }

    if (contextError) {
      return {
        elegible: false,
        etiqueta: 'Sin verificar',
        detalle: 'No fue posible comprobar la elegibilidad en este momento.',
      }
    }

    const inscrito = roster.some((item) => item.id === student.id)

    if (!inscrito) {
      return {
        elegible: false,
        etiqueta: 'No inscrito',
        detalle: 'El estudiante no pertenece al padrón de este examen.',
      }
    }

    const asistencia = asistencias.find(
      (item) => item.estudiante_id === student.id,
    )

    if (!asistencia) {
      return {
        elegible: false,
        etiqueta: 'Sin ingreso',
        detalle: 'Está inscrito, pero todavía no registró un ingreso autorizado.',
      }
    }

    return {
      elegible: true,
      etiqueta: 'Elegible',
      detalle: 'Ingreso autorizado verificado. Puede continuar con la expulsión.',
      asistencia,
    }
  }

  const selectedEligibility = selectedStudent
    ? getElegibilidad(selectedStudent)
    : null

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="space-y-6 xl:col-span-8">
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-sci-cyan">
                Registro de expulsiones
              </span>
              <h2 className="mt-1 text-lg font-extrabold text-sci-navy">
                Buscar estudiante
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Localiza al estudiante por nombre, apellido o código SIS. Solo podrá seleccionarse
                si pertenece al examen y ya registró un ingreso autorizado.
              </p>
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Nombre, apellido o código SIS..."
                className="h-10 bg-background pl-9 pr-10 text-xs"
                aria-label="Buscar estudiante para expulsión"
                autoComplete="off"
              />
              {searching && (
                <Loader2
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-sci-cyan"
                  aria-label="Buscando coincidencias"
                />
              )}
            </div>

            {contextError && (
              <div
                className="flex items-start gap-2 rounded-xl border border-sci-amber/30 bg-sci-amber/10 p-3 text-xs text-foreground"
                role="alert"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-sci-amber" />
                <div className="flex-1">
                  <p className="font-bold">No se pudo verificar la elegibilidad.</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{contextError}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void loadContext()}
                  className="cursor-pointer gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reintentar
                </Button>
              </div>
            )}

            {searchError && (
              <div
                className="rounded-xl border border-sci-red/20 bg-sci-red/10 p-3 text-xs font-semibold text-sci-red"
                role="alert"
              >
                {searchError}
              </div>
            )}

            <div className="space-y-3" aria-live="polite">
              {results.map((student) => {
                const eligibility = getElegibilidad(student)
                const selected = selectedStudent?.id === student.id

                return (
                  <div
                    key={student.id}
                    className={`rounded-2xl border p-4 transition-colors ${
                      selected
                        ? 'border-sci-cyan bg-sci-cyan/5'
                        : 'border-border bg-muted/20 hover:bg-muted/35'
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words text-sm font-extrabold text-sci-navy">
                            {nombreCompleto(student)}
                          </p>
                          <Badge
                            variant="outline"
                            className={
                              eligibility.elegible
                                ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700'
                                : 'border-sci-amber/30 bg-sci-amber/10 text-sci-amber'
                            }
                          >
                            {eligibility.etiqueta}
                          </Badge>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="font-mono">SIS: {student.codigo_sis}</span>
                          <span className="flex items-center gap-1">
                            <IdCard className="h-3.5 w-3.5 text-sci-cyan" />
                            CI: {student.ci || 'No registrado'}
                            {student.ci_extension ? ` ${student.ci_extension}` : ''}
                          </span>
                        </div>

                        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                          {eligibility.detalle}
                        </p>

                        {eligibility.asistencia && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <Clock3 className="h-3.5 w-3.5" />
                            Ingreso: {eligibility.asistencia.fecha_ingreso} ·{' '}
                            {eligibility.asistencia.hora_ingreso}
                          </p>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant={eligibility.elegible ? 'default' : 'outline'}
                        disabled={!eligibility.elegible}
                        onClick={() => setSelectedStudent(student)}
                        className={
                          eligibility.elegible
                            ? 'w-full cursor-pointer bg-sci-blue text-xs font-bold text-white hover:opacity-90 sm:w-auto'
                            : 'w-full text-xs sm:w-auto'
                        }
                      >
                        {eligibility.elegible ? (
                          <UserRoundCheck className="h-4 w-4" />
                        ) : (
                          <UserRoundX className="h-4 w-4" />
                        )}
                        {selected ? 'Seleccionado' : 'Seleccionar'}
                      </Button>
                    </div>
                  </div>
                )
              })}

              {searched && !searching && results.length === 0 && !searchError && (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
                  <UserRoundX className="mx-auto h-8 w-8 text-muted-foreground/70" />
                  <p className="mt-3 text-xs font-bold text-foreground">
                    No se encontraron estudiantes
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Prueba con otro nombre, apellido o código SIS.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 xl:col-span-4">
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardContent className="space-y-4 p-5">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-sci-navy">
                <QrCode className="h-4 w-4 text-sci-cyan" />
                Identificación por QR
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                El escaneo solo identifica al estudiante. No registra un nuevo ingreso ni una expulsión.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border-2 border-border bg-black">
              <div
                id={READER_ID}
                className="aspect-square w-full overflow-hidden [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
              />

              {!cameraActive && !qrSearching && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card p-6 text-center">
                  <Camera className="h-9 w-9 text-sci-cyan" />
                  <p className="mt-3 text-xs font-bold text-foreground">Lector QR en espera</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Activa la cámara cuando necesites identificar una credencial.
                  </p>
                </div>
              )}

              {cameraActive && !qrSearching && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-44 w-44 rounded-2xl border-2 border-sci-cyan/80 shadow-[0_0_18px_rgba(22,143,189,0.35)]">
                    <div className="h-0.5 w-full animate-pulse bg-sci-cyan" />
                  </div>
                </div>
              )}

              {qrSearching && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-sci-navy/85 text-white">
                  <Loader2 className="h-8 w-8 animate-spin text-sci-cyan" />
                  <p className="mt-3 text-xs font-bold">Identificando estudiante...</p>
                </div>
              )}
            </div>

            {cameraError && (
              <div
                className="rounded-xl border border-sci-red/20 bg-sci-red/10 p-3 text-[11px] font-semibold text-sci-red"
                role="alert"
              >
                {cameraError}
              </div>
            )}

            <Button
              type="button"
              variant={cameraActive ? 'outline' : 'default'}
              onClick={() =>
                cameraActive ? void stopScanner() : void startScanner()
              }
              disabled={qrSearching}
              className={
                cameraActive
                  ? 'w-full cursor-pointer text-xs text-sci-red hover:text-sci-red'
                  : 'w-full cursor-pointer bg-sci-blue text-xs font-bold text-white hover:opacity-90'
              }
            >
              {cameraActive ? (
                <>
                  <VideoOff className="h-4 w-4" /> Detener cámara
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" /> Escanear código QR
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="order-1 rounded-2xl border-border bg-card shadow-xs xl:order-none">
          <CardContent className="space-y-4 p-5">
            <div>
              <h3 className="text-sm font-extrabold text-sci-navy">
                Estudiante seleccionado
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                La selección solo está disponible para estudiantes con ingreso autorizado.
              </p>
            </div>

            {selectedStudent && selectedEligibility?.elegible ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-600/25 bg-emerald-600/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600/10">
                      <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-extrabold text-sci-navy">
                        {nombreCompleto(selectedStudent)}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        SIS: {selectedStudent.codigo_sis}
                      </p>
                      {selectedEligibility.asistencia && (
                        <p className="mt-2 text-[11px] font-semibold text-emerald-700">
                          Ingreso verificado · {selectedEligibility.asistencia.hora_ingreso}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedStudent(null)}
                  className="w-full cursor-pointer gap-1.5 text-xs"
                >
                  <X className="h-3.5 w-3.5" /> Quitar selección
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <UserRoundCheck className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <p className="mt-3 text-xs font-semibold text-muted-foreground">
                  Busca y selecciona un estudiante elegible.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

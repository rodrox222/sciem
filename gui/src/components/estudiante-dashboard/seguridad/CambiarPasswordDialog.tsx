import { Save, UserRound, X } from 'lucide-react'

interface CambiarPasswordDialogProps {
  passwordActual: string
  passwordNueva: string
  passwordConfirmacion: string
  cambiandoPassword: boolean
  mensajePassword: string
  errorPassword: string
  mostrarPassword: boolean
  modalPasswordAbierto: boolean

  setPasswordActual: (valor: string) => void
  setPasswordNueva: (valor: string) => void
  setPasswordConfirmacion: (valor: string) => void
  setMostrarPassword: (valor: boolean) => void
  setModalPasswordAbierto: (valor: boolean) => void
  setMensajePassword: (valor: string) => void
  setErrorPassword: (valor: string) => void

  cambiarPassword: () => Promise<void>
}

export default function CambiarPasswordDialog({
  passwordActual,
  passwordNueva,
  passwordConfirmacion,
  cambiandoPassword,
  mensajePassword,
  errorPassword,
  mostrarPassword,
  modalPasswordAbierto,
  setPasswordActual,
  setPasswordNueva,
  setPasswordConfirmacion,
  setMostrarPassword,
  setModalPasswordAbierto,
  setMensajePassword,
  setErrorPassword,
  cambiarPassword,
}: CambiarPasswordDialogProps) {
  const cerrarModal = () => {
    if (cambiandoPassword) return

    setModalPasswordAbierto(false)
    setErrorPassword('')
    setMensajePassword('')
  }

  return (
    <>
      {/* Sección para abrir el modal */}
      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <UserRound size={22} />
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                Cambiar contraseña
              </h2>

              <p className="text-sm text-muted-foreground">
                Actualiza tu contraseña para mantener segura tu cuenta.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setErrorPassword('')
              setMensajePassword('')
              setModalPasswordAbierto(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Save size={16} />
            Cambiar contraseña
          </button>
        </div>
      </section>

      {/* Modal para cambiar contraseña */}
      {modalPasswordAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              cerrarModal()
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-password"
            className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl"
          >
            {/* Encabezado */}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <UserRound size={22} />
                </div>

                <div>
                  <h2
                    id="titulo-modal-password"
                    className="text-lg font-semibold"
                  >
                    Cambiar contraseña
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    Actualiza tu contraseña para mantener segura tu cuenta.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                disabled={cambiandoPassword}
                aria-label="Cerrar modal"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void cambiarPassword()
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label
                  htmlFor="passwordActual"
                  className="text-sm font-medium"
                >
                  Contraseña actual
                </label>

                <input
                  id="passwordActual"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={passwordActual}
                  onChange={(e) => {
                    setPasswordActual(e.target.value)
                    setErrorPassword('')
                    setMensajePassword('')
                  }}
                  required
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Ingresa tu contraseña actual"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="passwordNueva"
                  className="text-sm font-medium"
                >
                  Nueva contraseña
                </label>

                <input
                  id="passwordNueva"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={passwordNueva}
                  onChange={(e) => {
                    setPasswordNueva(e.target.value)
                    setErrorPassword('')
                    setMensajePassword('')
                  }}
                  minLength={8}
                  required
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="passwordConfirmacion"
                  className="text-sm font-medium"
                >
                  Confirmar nueva contraseña
                </label>

                <input
                  id="passwordConfirmacion"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={passwordConfirmacion}
                  onChange={(e) => {
                    setPasswordConfirmacion(e.target.value)
                    setErrorPassword('')
                    setMensajePassword('')
                  }}
                  minLength={8}
                  required
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Repite la nueva contraseña"
                />
              </div>

              {/* Mostrar u ocultar contraseñas */}
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mostrarPassword}
                  onChange={(e) => setMostrarPassword(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Mostrar contraseñas
              </label>

              {/* Mensajes */}
              {mensajePassword && (
                <p
                  role="status"
                  className="rounded-lg bg-green-50 p-3 text-sm text-green-800"
                >
                  {mensajePassword}
                </p>
              )}

              {errorPassword && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                  {errorPassword}
                </p>
              )}

              {/* Botones */}
              <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setModalPasswordAbierto(false)
                    setErrorPassword('')
                    setMensajePassword('')
                    setPasswordActual('')
                    setPasswordNueva('')
                    setPasswordConfirmacion('')
                    setMostrarPassword(false)
                  }}
                  disabled={cambiandoPassword}
                  className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={cambiandoPassword}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={16} />
                  {cambiandoPassword
                    ? 'Cambiando contraseña...'
                    : 'Cambiar contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
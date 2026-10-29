import { Save } from 'lucide-react'

interface FormularioPerfilProps {
  ci: string
  ciExtension: string
  errorPerfil: string
  guardandoPerfil: boolean
  onCiChange: (valor: string) => void
  onCiExtensionChange: (valor: string) => void
  onGuardarPerfil: () => void | Promise<void>
}

export default function FormularioPerfil({
  ci,
  ciExtension,
  errorPerfil,
  guardandoPerfil,
  onCiChange,
  onCiExtensionChange,
  onGuardarPerfil,
}: FormularioPerfilProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void onGuardarPerfil()
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div className="space-y-2">
        <label htmlFor="ci" className="text-sm font-medium">
          Carnet de identidad (CI)
        </label>

        <input
          id="ci"
          type="text"
          value={ci}
          onChange={(e) => onCiChange(e.target.value)}
          required
          maxLength={20}
          inputMode="numeric"
          pattern="[0-9]+"
          aria-invalid={Boolean(errorPerfil)}
          aria-describedby={errorPerfil ? 'ci-error' : undefined}
          placeholder="Ingresa tu CI"
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ${
            errorPerfil
              ? 'border-red-500 focus-visible:outline-red-500'
              : ''
          }`}
        />

        {errorPerfil && (
          <p
            id="ci-error"
            role="alert"
            className="text-sm text-red-600"
          >
            {errorPerfil}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="ciExtension" className="text-sm font-medium">
          Extensión
        </label>

        <select
          id="ciExtension"
          value={ciExtension}
          onChange={(e) => onCiExtensionChange(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Sin extensión</option>
          <option value="CB">CB - Cochabamba</option>
          <option value="LP">LP - La Paz</option>
          <option value="SC">SC - Santa Cruz</option>
          <option value="OR">OR - Oruro</option>
          <option value="PT">PT - Potosí</option>
          <option value="TJ">TJ - Tarija</option>
          <option value="CH">CH - Chuquisaca</option>
          <option value="BE">BE - Beni</option>
          <option value="PD">PD - Pando</option>
        </select>
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={guardandoPerfil}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Save size={16} />

          {guardandoPerfil ? 'Guardando...' : 'Guardar datos'}
        </button>
      </div>
    </form>
  )
}
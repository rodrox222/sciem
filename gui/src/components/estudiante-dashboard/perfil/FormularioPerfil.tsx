interface FormularioPerfilProps {
  ci: string
  ciExtension: string
  errorCi?: string
  errorExtension?: string
  onCiChange: (valor: string) => void
  onCiExtensionChange: (valor: string) => void
}

export default function FormularioPerfil({
  ci,
  ciExtension,
  errorCi,
  errorExtension,
  onCiChange,
  onCiExtensionChange,
}: FormularioPerfilProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* CI */}
      <div className="space-y-1.5">
        <label htmlFor="ci" className="text-sm font-medium">
          Carnet de identidad (CI) <span className="text-red-500">*</span>
        </label>
        <input
          id="ci"
          type="text"
          value={ci}
          onChange={(e) => onCiChange(e.target.value)}
          maxLength={10}
          inputMode="numeric"
          placeholder="Ej. 12345678"
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary ${
            errorCi ? 'border-red-500' : 'border-input'
          }`}
        />
        {errorCi && (
          <p id="ci-error" role="alert" className="text-sm text-red-600">
            {errorCi}
          </p>
        )}
      </div>

      {/* Extensión / Complemento */}
      <div className="space-y-1.5">
        <label htmlFor="ciExtension" className="text-sm font-medium">
          Extensión <span className="text-xs text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="ciExtension"
          type="text"
          value={ciExtension}
          onChange={(e) => onCiExtensionChange(e.target.value.toUpperCase())}
          maxLength={5}
          placeholder="Ej. 1A, KLH"
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm uppercase outline-none transition focus:ring-2 focus:ring-primary ${
            errorExtension ? 'border-red-500' : 'border-input'
          }`}
        />
        {errorExtension && (
          <p id="extension-error" role="alert" className="text-sm text-red-600">
            {errorExtension}
          </p>
        )}
      </div>
    </div>
  )
}
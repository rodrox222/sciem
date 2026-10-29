import { QRCodeSVG } from 'qrcode.react'

interface CodigoQrEstudianteProps {
  qrToken: string
  onDescargarQr: () => void
}

export default function CodigoQrEstudiante({
  qrToken,
  onDescargarQr,
}: CodigoQrEstudianteProps) {
  return (
    <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border p-4">
      <h3 className="font-semibold">Tu código QR de ingreso</h3>

      <QRCodeSVG
        data-qr-estudiante="true"
        value={qrToken}
        size={220}
        level="M"
        includeMargin
      />

      <button
        type="button"
        onClick={onDescargarQr}
        className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        Descargar QR
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Presenta este código QR para verificar tu ingreso al examen.
      </p>
    </div>
  )
}
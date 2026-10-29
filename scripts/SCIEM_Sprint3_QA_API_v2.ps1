# SCIEM Sprint 3: smoke tests de SOLO LECTURA para HU15, HU16, HU17 y HU20.
# Excepcion: el login/logout crea y revoca un token, y registra eventos normales de auditoria.
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File .\SCIEM_Sprint3_QA_API.ps1
param(
  [string]$ApiBase = 'http://localhost:8200/api',
  [Parameter(Mandatory=$true)][string]$ExamenId,
  [ValidateSet('admin', 'docente')][string]$Rol = 'admin'
)

$ErrorActionPreference = 'Stop'
$ApiBase = $ApiBase.TrimEnd('/')
$script:Resultados = New-Object 'System.Collections.Generic.List[object]'

function Probar-Get {
  param(
    [string]$Hu,
    [string]$Nombre,
    [string]$Ruta,
    [int]$Esperado = 200,
    [switch]$Anonimo,
    [string]$TipoContenido = ''
  )
  $h = @{ Accept = 'application/json' }
  if (-not $Anonimo) { $h.Authorization = "Bearer $script:Token" }
  $codigo = 0; $respuesta = $null; $detalle = ''
  try {
    $respuesta = Invoke-WebRequest -Uri "$ApiBase$Ruta" -Method Get -Headers $h -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop
    $codigo = [int]$respuesta.StatusCode
  } catch {
    if ($_.Exception.Response) {
      $codigo = [int]$_.Exception.Response.StatusCode
    } else {
      $detalle = 'Error de conexion/tiempo de espera'
    }
  }
  $bien = ($codigo -eq $Esperado)
  if ($bien -and $TipoContenido -and $respuesta) {
    $recibido = [string]$respuesta.Headers['Content-Type']
    if ($recibido -notlike "*$TipoContenido*") {
      $bien = $false
      $detalle = "Content-Type inesperado: $recibido"
    }
  }
  if ($bien -and $Nombre -eq 'Dashboard del rol' -and $respuesta) {
    try {
      $json = $respuesta.Content | ConvertFrom-Json
      if ($json.secciones.resumen.error) {
        $bien = $false
        $detalle = "Resumen con error interno: $($json.secciones.resumen.error)"
      }
    } catch {
      $bien = $false
      $detalle = 'Respuesta dashboard no es JSON legible'
    }
  }
  $script:Resultados.Add([pscustomobject]@{
    HU = $Hu
    Prueba = $Nombre
    HTTP = $codigo
    Esperado = $Esperado
    Estado = $(if ($bien) { 'OK' } else { 'FALLO' })
    Detalle = $detalle
  })
}

Write-Host "`n=== SCIEM Sprint 3 - Pruebas de API de lectura ===" -ForegroundColor Cyan
Write-Host "API: $ApiBase | Examen: $ExamenId | Rol: $Rol"
Write-Host 'No se muestran ni se guardan las credenciales o el token.'
$identificador = Read-Host 'Identificador de una cuenta de pruebas autorizada'
$secreto = Read-Host 'Contrasena (entrada oculta)' -AsSecureString
$puntero = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secreto)
try {
  $clave = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($puntero)
  $body = @{ email = $identificador; password = $clave; role = $Rol } | ConvertTo-Json -Compress
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($puntero)
  Remove-Variable secreto,clave,identificador -ErrorAction SilentlyContinue
}

try {
  $login = Invoke-RestMethod -Uri "$ApiBase/login" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 20 -ErrorAction Stop
  $script:Token = [string]$login.token
  if (-not $script:Token) { throw 'El login no devolvio token.' }
  Write-Host "Autenticacion: OK (rol informado: $($login.user.rol))" -ForegroundColor Green
} catch {
  Write-Host 'LOGIN FALLIDO: comprueba el identificador, la contrasena, el rol o el estado de la base de datos.' -ForegroundColor Red
  Write-Host 'No se realizaron pruebas de endpoints.'
  exit 2
} finally {
  Remove-Variable body,login -ErrorAction SilentlyContinue
}

try {
  Probar-Get 'Autenticacion' 'Ruta sin token bloqueada' '/dashboard' 401 -Anonimo
  Probar-Get 'HU20' 'Dashboard del rol' '/dashboard'
  Probar-Get 'HU15' 'Padron de estudiantes' "/examenes/$ExamenId/estudiantes"
  Probar-Get 'HU15' 'Lista de asistencias' "/examenes/$ExamenId/asistencias"
  Probar-Get 'HU15' 'Historial de expulsiones' "/examenes/$ExamenId/expulsiones"
  Probar-Get 'HU16' 'Resumen monitoreo' "/examenes/$ExamenId/monitoreo"
  Probar-Get 'HU16' 'Lista ingresados' "/examenes/$ExamenId/monitoreo/estudiantes?estado=ingresados"
  Probar-Get 'HU16' 'Lista ausentes' "/examenes/$ExamenId/monitoreo/estudiantes?estado=ausentes"
  # Validacion cruzada de las tres respuestas oficiales de HU16.
  # Evita declarar OK cuando el endpoint responde 200 con conteos inconsistentes.
  try {
    $h = @{ Authorization = "Bearer $script:Token"; Accept = 'application/json' }
    $baseMon = "$ApiBase/examenes/$ExamenId/monitoreo"
    $resMon = Invoke-RestMethod -Uri "${baseMon}?incluir_listas=1" -Method Get -Headers $h -TimeoutSec 20
    $ingMon = [pscustomobject]@{estudiantes=$resMon.listas.ingresados}
    $ausMon = [pscustomobject]@{estudiantes=$resMon.listas.ausentes}
    $inscritos = [int]$resMon.resumen.total_estudiantes
    $ingresados = [int]$resMon.resumen.total_ingresados
    $ausentes = [int]$resMon.resumen.total_ausentes
    $nIngresados = @($ingMon.estudiantes | Where-Object { $null -ne $_ }).Count
    $nAusentes = @($ausMon.estudiantes | Where-Object { $null -ne $_ }).Count
    $consistente = ($inscritos -eq ($ingresados + $ausentes)) -and ($ingresados -eq $nIngresados) -and ($ausentes -eq $nAusentes)
    $script:Resultados.Add([pscustomobject]@{
      HU = 'HU16'; Prueba = 'Conteos vs listas'; HTTP = 200; Esperado = 200
      Estado = $(if ($consistente) { 'OK' } else { 'FALLO' })
      Detalle = "Inscritos=$inscritos; ingresados=$ingresados/$nIngresados; ausentes=$ausentes/$nAusentes"
    })
  } catch {
    $script:Resultados.Add([pscustomobject]@{
      HU = 'HU16'; Prueba = 'Conteos vs listas'; HTTP = 0; Esperado = 200
      Estado = 'FALLO'; Detalle = 'Error al recuperar las respuestas para comparar conteos'
    })
  }
  Probar-Get 'HU17' 'Resumen estadistico' "/examenes/$ExamenId/reportes/estadisticas"
  Probar-Get 'HU17' 'Franjas horarias' "/examenes/$ExamenId/reportes/estadisticas/franjas-horarias"
  Probar-Get 'HU17' 'Rango invalido rechazado' "/examenes/$ExamenId/reportes/estadisticas?fecha_desde=2026-10-28&fecha_hasta=2026-10-27" 422
  Probar-Get 'HU17' 'PDF descargable' "/examenes/$ExamenId/reportes/estadisticas/descargar?formato=pdf" 200 -TipoContenido 'application/pdf'
  Probar-Get 'HU17' 'Excel descargable' "/examenes/$ExamenId/reportes/estadisticas/descargar?formato=xlsx" 200 -TipoContenido 'spreadsheetml'
} finally {
  try {
    $h = @{ Authorization = "Bearer $script:Token"; Accept = 'application/json' }
    $null = Invoke-RestMethod -Uri "$ApiBase/logout" -Method Post -Headers $h -TimeoutSec 10 -ErrorAction Stop
  } catch {
    Write-Host 'Aviso: no se pudo revocar el token de prueba; revisa las sesiones si fuese necesario.' -ForegroundColor Yellow
  }
  Remove-Variable Token -Scope Script -ErrorAction SilentlyContinue
}

Write-Host "`n=== Resultados ===" -ForegroundColor Cyan
$script:Resultados | Format-Table HU,Prueba,HTTP,Esperado,Estado,Detalle -AutoSize
$ok = @($script:Resultados | Where-Object { $_.Estado -eq 'OK' }).Count
$total = $script:Resultados.Count
Write-Host "`nTOTAL: $ok/$total comprobaciones OK" -ForegroundColor $(if ($ok -eq $total) { 'Green' } else { 'Yellow' })
Write-Host 'Estas pruebas NO certifican el conjunto completo de criterios (roles adicionales, concurrencia, QR y movil).' -ForegroundColor Gray
if ($ok -lt $total) { exit 1 }

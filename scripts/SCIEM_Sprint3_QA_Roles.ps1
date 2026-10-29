# SCIEM Sprint 3 - QA roles y autorizacion (HU15, HU16, HU17, HU20)
# Solo usa GET para examenes/reportes. Login/logout usan POST y dejan trazas normales de sesion.
# USO:
# powershell -NoProfile -ExecutionPolicy Bypass -File .\SCIEM_Sprint3_QA_Roles.ps1 -Rol docente
# powershell -NoProfile -ExecutionPolicy Bypass -File .\SCIEM_Sprint3_QA_Roles.ps1 -Rol auxiliar
# powershell -NoProfile -ExecutionPolicy Bypass -File .\SCIEM_Sprint3_QA_Roles.ps1 -Rol estudiante
param(
  [ValidateSet('docente','auxiliar','estudiante')]
  [string]$Rol = 'docente',
  [string]$ApiBase = 'http://localhost:8200/api',
  [Parameter(Mandatory=$true)][string]$ExamenAjenoId,
  [string]$ExamenAsignadoId = ''
)

$ErrorActionPreference = 'Stop'
$ApiBase = $ApiBase.TrimEnd('/')
$script:Resultados = [System.Collections.Generic.List[object]]::new()
$script:Token = ''
$script:IdUsuario = ''

function Consultar {
  param([string]$Ruta,[switch]$Anonimo)
  $headers = @{ Accept = 'application/json' }
  if (-not $Anonimo) { $headers.Authorization = "Bearer $script:Token" }
  $codigo = 0; $datos = $null
  try {
    $res = Invoke-WebRequest -Method Get -Uri "$ApiBase$Ruta" -Headers $headers -UseBasicParsing -TimeoutSec 25 -ErrorAction Stop
    $codigo = [int]$res.StatusCode
    if ([string]$res.Headers['Content-Type'] -like '*json*') {
      try { $datos = $res.Content | ConvertFrom-Json } catch {}
    }
  } catch {
    if ($_.Exception.Response) {
      $codigo = [int]$_.Exception.Response.StatusCode
    }
  }
  return [pscustomobject]@{ Codigo = $codigo; Datos = $datos }
}

function Registrar {
  param([string]$Hu,[string]$Nombre,[int]$Codigo,[int]$Esperado,[bool]$Valido=$true,[string]$Detalle='')
  $ok = ($Codigo -eq $Esperado -and $Valido)
  $script:Resultados.Add([pscustomobject]@{
    HU=$Hu; Prueba=$Nombre; HTTP=$Codigo; Esperado=$Esperado
    Estado=$(if($ok){'OK'}else{'FALLO'}); Detalle=$Detalle
  })
}

function Comprobar {
  param([string]$Hu,[string]$Nombre,[string]$Ruta,[int]$Esperado)
  $r = Consultar $Ruta
  Registrar $Hu $Nombre $r.Codigo $Esperado
  return $r
}

Write-Host "`n=== SCIEM - QA por rol (solo lectura) ===" -ForegroundColor Cyan
Write-Host "Rol elegido: $Rol | API: $ApiBase"
Write-Host 'No compartas tu contrasena o token; la salida no los muestra.'

$id = Read-Host 'Identificador de una cuenta de pruebas autorizada'
$secret = Read-Host 'Contrasena (oculta)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $body = @{email=$id;password=$password;role=$Rol} | ConvertTo-Json -Compress
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  Remove-Variable secret,password,id -ErrorAction SilentlyContinue
}

try {
  $login = Invoke-RestMethod -Uri "$ApiBase/login" -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 25 -ErrorAction Stop
  $script:Token = [string]$login.token
  $script:IdUsuario = [string]$login.user.id
  $rolDevuelto = [string]$login.user.rol
  if (-not $script:Token -or -not $script:IdUsuario -or $rolDevuelto -ne $Rol) {
    throw 'El login no devolvio token, ID y rol coherentes.'
  }
  Write-Host "LOGIN: OK ($rolDevuelto)" -ForegroundColor Green
} catch {
  Write-Host 'LOGIN FALLIDO: no se emitieron pruebas. Verifica cuenta, rol y migraciones/seeders pendientes.' -ForegroundColor Red
  exit 2
} finally {
  Remove-Variable body,login -ErrorAction SilentlyContinue
}

try {
  $sinToken = Consultar '/dashboard' -Anonimo
  Registrar 'Seguridad' 'Dashboard sin token' $sinToken.Codigo 401

  $dash = Consultar '/dashboard'
  $dashValido = ($null -ne $dash.Datos -and
    $dash.Datos.success -eq $true -and
    [string]$dash.Datos.rol -eq $Rol -and
    $null -ne $dash.Datos.secciones.resumen -and
    -not $dash.Datos.secciones.resumen.error)
  Registrar 'HU20' 'Dashboard del rol correcto' $dash.Codigo 200 $dashValido $(if($dash.Datos){"rol_respuesta=$($dash.Datos.rol)"}else{'Sin JSON'})

  if ($Rol -eq 'docente') {
    $propios = Consultar '/mis-examenes?per_page=100'
    $lista = @()
    if ($propios.Datos -and $null -ne $propios.Datos.data) {
      $lista = @($propios.Datos.data | Where-Object { $null -ne $_ })
    }
    $filtrado = @($lista | Where-Object { [string]$_.id_docente -ne $script:IdUsuario })
    Registrar 'HU20' 'Asignaciones solo del docente' $propios.Codigo 200 ($lista.Count -gt 0 -and $filtrado.Count -eq 0) "examenes=$($lista.Count); ajenos=$($filtrado.Count)"

    if ($lista.Count -gt 0) {
      $examenPropio = [string]$lista[0].id
      Write-Host "Examen propio detectado: $($lista[0].nombre)" -ForegroundColor Gray

      $null = Comprobar 'HU15' 'Asistencias propias' "/examenes/$examenPropio/asistencias" 200
      $null = Comprobar 'HU15' 'Expulsiones propias' "/examenes/$examenPropio/expulsiones" 200
      $null = Comprobar 'HU16' 'Monitoreo propio' "/examenes/$examenPropio/monitoreo" 200
      $null = Comprobar 'HU16' 'Ingresados propios' "/examenes/$examenPropio/monitoreo/estudiantes?estado=ingresados" 200
      $null = Comprobar 'HU16' 'Ausentes propios' "/examenes/$examenPropio/monitoreo/estudiantes?estado=ausentes" 200
      $null = Comprobar 'HU17' 'Estadisticas propias' "/examenes/$examenPropio/reportes/estadisticas" 200
      $null = Comprobar 'HU17' 'Franjas propias' "/examenes/$examenPropio/reportes/estadisticas/franjas-horarias" 200
      $null = Comprobar 'HU17' 'PDF propio' "/examenes/$examenPropio/reportes/estadisticas/descargar?formato=pdf" 200
      $null = Comprobar 'HU17' 'Excel propio' "/examenes/$examenPropio/reportes/estadisticas/descargar?formato=xlsx" 200
    } else {
      throw 'Fixture incompleto: docente sin examen propio; no se permite omitir este escenario.'
    }

    $ajeno = $ExamenAjenoId
    if ($lista.Count -gt 0 -and @($lista | Where-Object { [string]$_.id -eq $ajeno }).Count -gt 0) {
      throw 'Fixture inválido: ExamenAjenoId pertenece al docente.'
    }
    if (-not $ajeno) { throw 'Se requiere examen ajeno.' }
    if ($ajeno) {
      $null = Comprobar 'HU15' 'Asistencias ajenas bloqueadas' "/examenes/$ajeno/asistencias" 403
      $null = Comprobar 'HU15' 'Expulsiones ajenas bloqueadas' "/examenes/$ajeno/expulsiones" 403
      $null = Comprobar 'HU16' 'Monitoreo ajeno bloqueado' "/examenes/$ajeno/monitoreo" 403
      $null = Comprobar 'HU16' 'Listas ajenas bloqueadas' "/examenes/$ajeno/monitoreo/estudiantes?estado=ingresados" 403
      $null = Comprobar 'HU17' 'Resumen ajeno bloqueado' "/examenes/$ajeno/reportes/estadisticas" 403
      $null = Comprobar 'HU17' 'Franjas ajenas bloqueadas' "/examenes/$ajeno/reportes/estadisticas/franjas-horarias" 403
      $null = Comprobar 'HU17' 'PDF ajeno bloqueado' "/examenes/$ajeno/reportes/estadisticas/descargar?formato=pdf" 403
    }
  } else {
    if ($Rol -eq 'auxiliar') {
      if (-not $ExamenAsignadoId) { throw 'Fixture incompleto: se requiere ExamenAsignadoId para auxiliar.' }
      $null = Comprobar 'HU15' 'Identificación auxiliar asignado' "/examenes/$ExamenAsignadoId/expulsiones/estudiantes" 200
      $null = Comprobar 'HU15' 'Historial auxiliar asignado' "/examenes/$ExamenAsignadoId/expulsiones" 200
      $null = Comprobar 'HU15' 'Historial auxiliar ajeno bloqueado' "/examenes/$ExamenAjenoId/expulsiones" 403
    }
    $idExamen = $ExamenAjenoId
    $null = Comprobar 'HU16' 'Monitoreo restringido' "/examenes/$idExamen/monitoreo" 403
    $null = Comprobar 'HU16' 'Listas restringidas' "/examenes/$idExamen/monitoreo/estudiantes?estado=ingresados" 403
    $null = Comprobar 'HU17' 'Resumen restringido' "/examenes/$idExamen/reportes/estadisticas" 403
    $null = Comprobar 'HU17' 'Franjas restringidas' "/examenes/$idExamen/reportes/estadisticas/franjas-horarias" 403
    $null = Comprobar 'HU17' 'Descarga restringida' "/examenes/$idExamen/reportes/estadisticas/descargar?formato=xlsx" 403
    if ($Rol -eq 'estudiante') {
      $null = Comprobar 'HU15' 'Expulsiones restringidas' "/examenes/$idExamen/expulsiones" 403
    }
  }
} finally {
  try {
    $headers = @{Authorization="Bearer $script:Token";Accept='application/json'}
    $null = Invoke-RestMethod -Uri "$ApiBase/logout" -Method Post -Headers $headers -TimeoutSec 10 -ErrorAction Stop
  } catch {
    Write-Host 'AVISO: no se pudo confirmar revocacion del token de prueba.' -ForegroundColor Yellow
  }
  $script:Token = ''
  $script:IdUsuario = ''
}

Write-Host "`n=== Resultados del rol $Rol ===" -ForegroundColor Cyan
$script:Resultados | Format-Table HU,Prueba,HTTP,Esperado,Estado,Detalle -AutoSize
$ok = @($script:Resultados | Where-Object { $_.Estado -eq 'OK' }).Count
$total = $script:Resultados.Count
Write-Host "`nTOTAL: $ok/$total OK" -ForegroundColor $(if($ok -eq $total){'Green'}else{'Yellow'})
Write-Host 'Verifica FALL0/FALLO; las pruebas son no destructivas y no sustituyen escenarios QR, concurrencia o UI.' -ForegroundColor DarkGray
if($ok -ne $total){exit 1}

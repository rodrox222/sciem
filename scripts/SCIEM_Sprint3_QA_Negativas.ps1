# SCIEM Sprint 3 - Pruebas negativas de validacion (solo admin/docente QA)
# Las solicitudes POST son inválidas; el motivo vacío se prueba con estudiante válido y examen en horario.
# No compartir contrasena ni token.
param(
 [ValidateSet('admin','docente')][string]$Rol='admin',
 [Parameter(Mandatory=$true)][string]$ExamenId,
 [Parameter(Mandatory=$true)][string]$EstudianteValidoId,
 [string]$ApiBase='http://localhost:8200/api'
)
$ErrorActionPreference='Stop'
$ApiBase=$ApiBase.TrimEnd('/')
$resultados = [System.Collections.Generic.List[object]]::new()

function HTTP {
 param([string]$Path,[string]$Token,[string]$Metodo='GET',[object]$Body=$null)
 $params=@{Uri="$ApiBase$Path";Method=$Metodo;Headers=@{Accept='application/json';Authorization="Bearer $Token"};UseBasicParsing=$true;TimeoutSec=25;ErrorAction='Stop'}
 if($null -ne $Body){$params.ContentType='application/json';$params.Body=($Body | ConvertTo-Json -Compress)}
 try {$r=Invoke-WebRequest @params; return [pscustomobject]@{status=[int]$r.StatusCode;body=$r.Content}}
 catch {
   $status=0
   if($_.Exception.Response){$status=[int]$_.Exception.Response.StatusCode}
   return [pscustomobject]@{status=$status;body=[string]$_.ErrorDetails.Message}
 }
}
function Check {
 param([string]$HU,[string]$Nombre,[string]$Path,[string]$Token,[int]$Esperado,[string]$Metodo='GET',[object]$Body=$null)
 $r=HTTP $Path $Token $Metodo $Body
 $resultados.Add([pscustomobject]@{ HU=$HU;Prueba=$Nombre;HTTP=$r.status;Esperado=$Esperado;Estado=$(if($r.status -eq $Esperado){'OK'}else{'FALLO'})})
 return $r
}

Write-Host "`n=== SCIEM: pruebas negativas sin crear registros ===" -ForegroundColor Cyan
$id=Read-Host 'Identificador de cuenta de pruebas autorizada'
$pw=Read-Host 'Contrasena (oculta)' -AsSecureString
$b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw)
try {
 $pass=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)
 $loginbody=@{email=$id;password=$pass;role=$Rol}|ConvertTo-Json -Compress
} finally {
 [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)
 Remove-Variable pw,pass,id -ErrorAction SilentlyContinue
}
$token=''
try {
  $auth=Invoke-RestMethod -Method POST -Uri "$ApiBase/login" -ContentType 'application/json' -Body $loginbody -ErrorAction Stop
  $token=[string]$auth.token
  if(!$token -or [string]$auth.user.rol -ne $Rol){throw 'Token o rol incorrectos'}
  Write-Host "Login: OK (rol=$Rol)" -ForegroundColor Green
} catch {
  Write-Host "Error al autenticar; se omitieron las pruebas." -ForegroundColor Red;exit 2
} finally {Remove-Variable loginbody,auth -ErrorAction SilentlyContinue}

try {
  $contexto=HTTP "/examenes/$ExamenId/expulsiones/estudiantes" $token
  if ($contexto.status -ne 200) { throw 'Fixture HU15 inaccesible.' }
  $datos=$contexto.body|ConvertFrom-Json
  if (-not $datos.puede_modificar -or @($datos.estudiantes|Where-Object id -EQ $EstudianteValidoId).Count -ne 1) { throw 'Se requiere estudiante inscrito válido y examen en horario.' }
  $before=HTTP "/examenes/$ExamenId/expulsiones?per_page=1" $token
  $antesTotal=$null
  if($before.status -eq 200){try{$antesTotal=[int](($before.body|ConvertFrom-Json).total)}catch{}}

  $null=Check 'HU15' 'Paginacion invalida' "/examenes/$ExamenId/expulsiones?per_page=0" $token 422
  $null=Check 'HU15' 'Expulsion UUID invalido' "/examenes/$ExamenId/expulsiones" $token 422 'POST' @{
    id_estudiante='no-es-un-uuid'; motivo='Prueba de validacion sin crear registros'
  }
  $vacio=Check 'HU15' 'Expulsion motivo vacio' "/examenes/$ExamenId/expulsiones" $token 422 'POST' @{
    id_estudiante=$EstudianteValidoId; motivo=''
  }
  $errorMotivo=$false
  try { $errorMotivo=($null -ne ($vacio.body|ConvertFrom-Json).errors.motivo) } catch {}
  $resultados.Add([pscustomobject]@{HU='HU15';Prueba='422 identifica motivo';HTTP=$vacio.status;Esperado=422;Estado=$(if($errorMotivo){'OK'}else{'FALLO'})})
  $null=Check 'HU16' 'Estado de lista invalido' "/examenes/$ExamenId/monitoreo/estudiantes?estado=invalido" $token 422
  $null=Check 'HU17' 'Descarga formato invalido' "/examenes/$ExamenId/reportes/estadisticas/descargar?formato=csv" $token 422
  $null=Check 'HU17' 'Rango de fechas invertido' "/examenes/$ExamenId/reportes/estadisticas?fecha_desde=2026-10-28&fecha_hasta=2026-10-27" $token 422

  $after=HTTP "/examenes/$ExamenId/expulsiones?per_page=1" $token
  $despuesTotal=$null
  if($after.status -eq 200){try{$despuesTotal=[int](($after.body|ConvertFrom-Json).total)}catch{}}
  $iguales=($null -ne $antesTotal -and $null -ne $despuesTotal -and $antesTotal -eq $despuesTotal)
  $resultados.Add([pscustomobject]@{HU='HU15';Prueba='Expulsiones sin cambios';HTTP=$after.status;Esperado=200;Estado=$(if($iguales){'OK'}else{'FALLO'})})
} finally {
  try{$null=Invoke-RestMethod -Method POST -Uri "$ApiBase/logout" -Headers @{Authorization="Bearer $token";Accept="application/json"} -TimeoutSec 10}catch{}
  $token=''
}
Write-Host "`n=== Resultados ===" -ForegroundColor Cyan
$resultados|Format-Table -AutoSize
$ok=@($resultados|Where-Object Estado -EQ 'OK').Count
Write-Host "`nTOTAL: $ok/$($resultados.Count) OK" -ForegroundColor $(if($ok -eq $resultados.Count){'Green'}else{'Yellow'})
Write-Host 'No valida concurrencia ni registros reales. Dos POST se disenan para ser rechazados.' -ForegroundColor DarkGray
if($ok -ne $resultados.Count){exit 1}

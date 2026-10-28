# Ejecución local o Windows PowerShell, exclusivamente contra contenedores QA aislados.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
$env:SCIEM_QA_DB_PASSWORD = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$random = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($random); $rng.Dispose()
$env:SCIEM_QA_APP_KEY = 'base64:' + [Convert]::ToBase64String($random)
$result = 1
try {
    & docker compose -p sciem-sprint3-qa -f docker-compose.sprint3-qa.yml up --build --abort-on-container-exit --exit-code-from api-qa
    $result = $LASTEXITCODE
    if ($result -ne 0) { throw "FAIL: QA PostgreSQL terminó con código $result. No publicar upstream." }
    & npm --prefix gui ci
    if ($LASTEXITCODE -ne 0) { throw 'FAIL: instalación frontend.' }
    & node --test gui/tests/sprint3.test.cjs
    if ($LASTEXITCODE -ne 0) { throw 'FAIL: contratos frontend.' }
    & npm --prefix gui run build
    if ($LASTEXITCODE -ne 0) { throw 'FAIL: build frontend.' }
    Write-Host 'PASS: suites automatizadas. Aún se requieren concurrencia multiproceso, carga 300 y verificación visual de fase 3.'
    $result = 0
} catch {
    Write-Error $_ -ErrorAction Continue
    $result = 1
} finally {
    # Solo elimina contenedores/red del proyecto QA; no usa -v ni servicios compartidos.
    & docker compose -p sciem-sprint3-qa -f docker-compose.sprint3-qa.yml down
    Remove-Item Env:SCIEM_QA_DB_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:SCIEM_QA_APP_KEY -ErrorAction SilentlyContinue
    Pop-Location
}
exit $result

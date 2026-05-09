$ErrorActionPreference = "Stop"

function Stop-Port3000 {
  $listeners = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

function Remove-NextCache {
  $workspace = (Resolve-Path ".").Path
  $nextPath = Join-Path $workspace ".next"
  if (Test-Path -LiteralPath $nextPath) {
    $resolved = (Resolve-Path -LiteralPath $nextPath).Path
    if (-not $resolved.StartsWith($workspace, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to remove outside workspace: $resolved"
    }
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
}

function Wait-Health {
  $deadline = (Get-Date).AddSeconds(45)
  do {
    try {
      $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -eq 200) {
        return
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  } while ((Get-Date) -lt $deadline)

  throw "Dev server did not become healthy on http://localhost:3000/api/health"
}

Write-Host "== SignalCred submit check =="

npm run check:docs
npm run typecheck

Stop-Port3000
Remove-NextCache

$workspace = (Resolve-Path ".").Path
$dev = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory $workspace -WindowStyle Hidden -PassThru

try {
  Wait-Health
  npm run test:demo
} finally {
  if ($dev -and -not $dev.HasExited) {
    Stop-Process -Id $dev.Id -Force -ErrorAction SilentlyContinue
  }
  Stop-Port3000
}

Remove-NextCache
npm run build

Write-Host "OK SignalCred submit check passed"

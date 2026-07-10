$secret = $env:CRON_SECRET
if (-not $secret) {
  $envFile = Join-Path $PSScriptRoot ".env.local"
  if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
      if ($_ -match '^\s*CRON_SECRET=(.+)$') { $secret = $matches[1].Trim() }
    }
  }
}
if (-not $secret) {
  Write-Error "CRON_SECRET is not set. Set it in .env.local or the environment."
  exit 1
}

foreach ($port in @(3000, 3001)) {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:$port/api/cron/reminder" -Headers @{
      Authorization = "Bearer $secret"
    } -UseBasicParsing -TimeoutSec 10
    Write-Host "port $port : $($response.Content)"
    exit 0
  } catch {
    Write-Host "port $port : failed - $($_.Exception.Message)"
  }
}
exit 1

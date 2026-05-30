$secret = "my-random-secret-12345"

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

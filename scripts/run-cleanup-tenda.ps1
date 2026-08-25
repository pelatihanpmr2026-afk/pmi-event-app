$envFile = "C:\laragon\www\pmi-event-app\.env"
$secretLine = Get-Content $envFile | Where-Object { $_ -match '^CRON_SECRET=' } | Select-Object -First 1

if (-not $secretLine) {
  throw "CRON_SECRET tidak ditemukan."
}

$secret = $secretLine.Substring("CRON_SECRET=".Length)

Invoke-RestMethod `
  -Method POST `
  -Uri "http://127.0.0.1:3000/api/cron/cleanup-tenda" `
  -Headers @{ Authorization = "Bearer $secret" }
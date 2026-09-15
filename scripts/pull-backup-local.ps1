<#
.SYNOPSIS
  Menarik backup terbaru dari VPS ke komputer lokal (Windows) via scp,
  lalu merotasi arsip lokal (hanya simpan $Keep terbaru).

.DESCRIPTION
  Dijalankan lewat Task Scheduler setiap hari setelah jadwal backup VPS.
  Butuh SSH key tanpa passphrase yang sudah didaftarkan ke VPS
  (ssh-keygen + ssh-copy-id) agar berjalan tanpa password.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File pull-backup-local.ps1 -VpsHost "192.0.2.10"
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$VpsHost,
  [string]$VpsUser = "deploy",
  [string]$RemoteDir = "/home/deploy/backups",
  [string]$LocalDir = "$env:USERPROFILE\backups\pmi-event",
  [int]$Keep = 14
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $LocalDir)) {
  New-Item -ItemType Directory -Path $LocalDir | Out-Null
}

$target = "$VpsUser@${VpsHost}:${RemoteDir}/"
Write-Host "Menarik backup dari $target ..."

# Pola file yang dihasilkan backup-vps.sh
& scp "$VpsUser@${VpsHost}:${RemoteDir}/db_*.sql.gz" "$LocalDir\"
if ($LASTEXITCODE -ne 0) { throw "scp database gagal (exit $LASTEXITCODE)" }

& scp "$VpsUser@${VpsHost}:${RemoteDir}/uploads_*.tar.gz" "$LocalDir\"
if ($LASTEXITCODE -ne 0) { throw "scp uploads gagal (exit $LASTEXITCODE)" }

# Rotasi lokal: hanya simpan $Keep terbaru per pola.
foreach ($pattern in @("db_*.sql.gz", "uploads_*.tar.gz")) {
  $old = Get-ChildItem -Path $LocalDir -Filter $pattern |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $Keep
  foreach ($file in $old) {
    Remove-Item -LiteralPath $file.FullName -Force
    Write-Host "Hapus arsip lama: $($file.Name)"
  }
}

Write-Host "Selesai. Isi $LocalDir :"
Get-ChildItem -Path $LocalDir | Sort-Object LastWriteTime -Descending | Format-Table Name, Length, LastWriteTime

param(
  [string]$WorkBuddyPath = '',
  [int]$Port = 9339
)

$ErrorActionPreference = 'Stop'
$themeRoot = Split-Path $PSScriptRoot -Parent
$stateRoot = Join-Path $themeRoot 'state'
$runtime = Join-Path $PSScriptRoot 'runtime.mjs'
$log = Join-Path $stateRoot 'apply.log'
$node = (Get-Command node -ErrorAction Stop).Source

New-Item -ItemType Directory -Force -Path $stateRoot | Out-Null
try {
  $arguments = @($runtime, 'apply', '--theme', $themeRoot, '--port', $Port, '--restart-confirmed')
  if (-not [string]::IsNullOrWhiteSpace($WorkBuddyPath)) { $arguments += @('--app', $WorkBuddyPath) }
  & $node @arguments 2>&1 | Tee-Object -FilePath $log
  if ($LASTEXITCODE -ne 0) { throw "Theme runtime exited with code $LASTEXITCODE" }
} catch {
  $_ | Out-String | Add-Content -LiteralPath $log
  throw
}

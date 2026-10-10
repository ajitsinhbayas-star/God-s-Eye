$vendorDir = Join-Path $PSScriptRoot "assets\vendor"
$dataDir = Join-Path $PSScriptRoot "assets\data"

if (-not (Test-Path $vendorDir)) { New-Item -ItemType Directory -Path $vendorDir -Force | Out-Null }
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }

Write-Host "Fetching Three.js (r128)..."
try {
    Invoke-WebRequest -Uri "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" -OutFile (Join-Path $vendorDir "three.min.js") -UseBasicParsing -TimeoutSec 15
    Write-Host "  >> three.min.js OK" -ForegroundColor Green
} catch {
    Write-Warning "Failed to download three.min.js: $_"
}

Write-Host "Fetching OrbitControls.js..."
try {
    Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js" -OutFile (Join-Path $vendorDir "OrbitControls.js") -UseBasicParsing -TimeoutSec 15
    Write-Host "  >> OrbitControls.js OK" -ForegroundColor Green
} catch {
    Write-Warning "Failed to download OrbitControls.js: $_"
}

Write-Host "Fetching satellite.min.js (v4.0.0)..."
try {
    Invoke-WebRequest -Uri "https://cdnjs.cloudflare.com/ajax/libs/satellite.js/4.0.0/satellite.min.js" -OutFile (Join-Path $vendorDir "satellite.min.js") -UseBasicParsing -TimeoutSec 15
    Write-Host "  >> satellite.min.js OK" -ForegroundColor Green
} catch {
    Write-Warning "Failed to download satellite.min.js: $_"
}

Get-ChildItem -Path $vendorDir | Select-Object Name, Length

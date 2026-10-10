$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) { $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe" }

Write-Host "Edge Path: $edgePath"

# Test 1: Load index.html?track=54754
Write-Host "Verifying index.html?track=54754 in headless Edge..."
$proc1 = Start-Process -FilePath $edgePath -ArgumentList @(
    "--headless=new",
    "--dump-dom",
    "--enable-logging=stderr",
    "--v=1",
    "--window-size=1920,1080",
    "http://localhost:8080/index.html?track=54754"
) -NoNewWindow -PassThru -RedirectStandardError "edge_index_test.log"

Start-Sleep -Seconds 5
if (-not $proc1.HasExited) { Stop-Process -Id $proc1.Id -Force }

# Test 2: Load catalog.html
Write-Host "Verifying catalog.html in headless Edge..."
$proc2 = Start-Process -FilePath $edgePath -ArgumentList @(
    "--headless=new",
    "--dump-dom",
    "--enable-logging=stderr",
    "--v=1",
    "--window-size=1920,1080",
    "http://localhost:8080/catalog.html"
) -NoNewWindow -PassThru -RedirectStandardError "edge_catalog_test.log"

Start-Sleep -Seconds 5
if (-not $proc2.HasExited) { Stop-Process -Id $proc2.Id -Force }

Write-Host "Validation runs completed."

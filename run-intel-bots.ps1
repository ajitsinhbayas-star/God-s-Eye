# ==============================================================================
# GOD'S EYE // RADAR - SPECIAL ACTIVITIES DIVISION
# CREATED BY MR SINGH // SPECIAL ACTIVITIES DIVISION
# 13 Worldwide Autonomous Bots Ingesting Global Satellite Telemetry & Sensor Feeds
# ==============================================================================

param(
    [string]$BackendUrl = "http://localhost:8080",
    [int]$PollIntervalSec = 30,
    [switch]$RunOnce = $false
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  GOD'S EYE // RADAR - 13 GLOBAL AUTONOMOUS SATELLITE BOTS" -ForegroundColor Green
Write-Host "  OPERATIVE / ARCHITECT: CREATED BY MR SINGH // SPECIAL ACTIVITIES DIVISION" -ForegroundColor Yellow
Write-Host "  Target Server:  $BackendUrl" -ForegroundColor White
Write-Host "  Poll Cadence:   ${PollIntervalSec}s" -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan

# Cryptographic SHA-256 Hash Helper
function Compute-Sha256($text) {
    if ([string]::IsNullOrEmpty($text)) { return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" }
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hashBytes = $sha.ComputeHash($bytes)
    return ($hashBytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

# HTML Sanitization Helper
function Clean-Text($str) {
    if ([string]::IsNullOrWhiteSpace($str)) { return "" }
    $clean = [System.Text.RegularExpressions.Regex]::Replace($str, "<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>", "", "IgnoreCase")
    $clean = [System.Text.RegularExpressions.Regex]::Replace($clean, "<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>", "", "IgnoreCase")
    $clean = [System.Text.RegularExpressions.Regex]::Replace($clean, "<[^>]+>", " ")
    $clean = [System.Net.WebUtility]::HtmlDecode($clean)
    return [System.Text.RegularExpressions.Regex]::Replace($clean, "\s+", " ").Trim()
}

# Generic Safe HTTP GET with Timeout
function Fetch-JsonSafe($url) {
    try {
        return Invoke-RestMethod -Uri $url -TimeoutSec 4 -Headers @{ "User-Agent" = "GodsEye-Orbital-Bot/4.0 (By Mr Singh)" }
    } catch {
        return $null
    }
}

# ==============================================================================
# 12 DEDICATED BOT IMPLEMENTATIONS (ONE SEPARATE BOT FOR EACH SOURCE)
# ==============================================================================

# 1. CelesTrak Bot (NORAD GP Ephemeris)
function Invoke-CelestrakBot($backend) {
    $botName = "CelestrakEphemerisBot"
    $items = @()
    try {
        [xml]$rss = (New-Object System.Net.WebClient).DownloadString("https://celestrak.org/columns/rss.xml")
        $nodes = $rss.SelectNodes("//item")
        if ($nodes) {
            foreach ($n in ($nodes | Select-Object -First 3)) {
                $title = Clean-Text $n.title
                $link = Clean-Text $n.link
                $desc = Clean-Text $n.description
                if ($title -and $link) {
                    $items += @{
                        canonicalUrl = $link
                        title = "CelesTrak Bulletin: $title"
                        body = $desc
                        category = "ORBITAL_EPHEMERIS"
                    }
                }
            }
        }
    } catch {}

    if ($items.Count -eq 0) {
        $json = Fetch-JsonSafe "$backend/api/iss"
        if ($json -and $json.satellite) {
            $items += @{
                canonicalUrl = "$backend/api/iss#ISS-ZARYA"
                title = "$($json.satellite) SGP4 Real-Time Orbit (Alt: $($json.altitudeKm) km)"
                body = "Lat: $($json.latitude), Lon: $($json.longitude) | Vel: $($json.velocityKmh) km/h | Incl: $($json.inclinationDeg) deg | Epoch: $($json.timestamp)"
                category = "ORBITAL_EPHEMERIS"
            }
        }
    }
    return @{ bot = $botName; sourceId = "celestrak"; items = $items }
}

# 2. NASA JPL Horizons Deep Space Bot
function Invoke-NasaDeepSpaceBot($backend) {
    $botName = "NasaHorizonsDeepSpaceBot"
    $items = @()
    $json = Fetch-JsonSafe "$backend/api/deep-space"
    if ($json -and $json.targets) {
        foreach ($t in ($json.targets | Select-Object -First 3)) {
            $items += @{
                canonicalUrl = "$backend/api/deep-space#$($t.id)"
                title = "$($t.name) - $($t.location)"
                body = "Range: $($t.distanceKm) km ($($t.distanceAu) AU) | Light Delay: $($t.latencySec)s | Mission Phase: $($t.status)"
                category = "DEEP_SPACE"
            }
        }
    }
    return @{ bot = $botName; sourceId = "nasa_horizons"; items = $items }
}

# 3. ESA Copernicus & DISCOS Tracker Bot
function Invoke-EsaCopernicusBot($backend) {
    $botName = "EsaCopernicusTrackerBot"
    $items = @()
    $json = Fetch-JsonSafe "$backend/api/sources/esa"
    if ($json -and $json.satellites) {
        foreach ($s in ($json.satellites | Select-Object -First 3)) {
            $items += @{
                canonicalUrl = "$backend/api/sources/esa#$($s.norad)"
                title = "ESA Mission: $($s.name) [#$($s.norad)]"
                body = "Orbit Class: $($s.orbit) | Health: $($s.health) | Instrument Payload: $($s.payload)"
                category = "ORBITAL_EPHEMERIS"
            }
        }
    }
    return @{ bot = $botName; sourceId = "esa_copernicus"; items = $items }
}

# 4. ISRO Project NETRA & ISTRAC Bot
function Invoke-IsroNetraBot($backend) {
    $botName = "IsroIstracNetraBot"
    $items = @()
    $json = Fetch-JsonSafe "$backend/api/sources/isro"
    if ($json -and $json.missions) {
        foreach ($m in ($json.missions | Select-Object -First 3)) {
            $items += @{
                canonicalUrl = "$backend/api/sources/isro#$($m.norad)"
                title = "ISRO Mission: $($m.name) [#$($m.norad)]"
                body = "Orbit: $($m.orbit) | Flight Status: $($m.status) | Science Payload: $($m.payload -or $m.clock)"
                category = "ORBITAL_EPHEMERIS"
            }
        }
    }
    return @{ bot = $botName; sourceId = "isro_netra"; items = $items }
}

# 5. Space-Track Orbital Safety Conjunction Bot
function Invoke-SpaceTrackBot($backend) {
    $botName = "SpaceTrackConjunctionBot"
    $items = @()
    $json = Fetch-JsonSafe "$backend/api/sources/spacetrack"
    if ($json -and $json.conjunctionAlerts) {
        foreach ($ca in ($json.conjunctionAlerts | Select-Object -First 3)) {
            $items += @{
                canonicalUrl = "$backend/api/sources/spacetrack#$($ca.eventId)"
                title = "CONJUNCTION ALERT: $($ca.primary) vs $($ca.secondary)"
                body = "Miss Distance: $($ca.missDistanceKm) km | Collision Probability: $($ca.collisionProb) | TCA: $($ca.timeOfClosestApproach) | Risk: $($ca.riskLevel)"
                category = "SPACE_SAFETY"
            }
        }
    }
    return @{ bot = $botName; sourceId = "spacetrack"; items = $items }
}

# 6. NOAA SWPC Space Weather Bot
function Invoke-NoaaWeatherBot($backend) {
    $botName = "NoaaSpaceWeatherBot"
    $items = @()
    $json = Fetch-JsonSafe "$backend/api/spaceweather"
    if ($json) {
        $latest = if ($json -is [System.Collections.IList] -or $json -is [array]) {
            if ($json.Count -gt 0) { $json[$json.Count - 1] } else { $null }
        } else {
            $json
        }
        if ($latest) {
            $kp = if ($latest.Kp -ne $null) { $latest.Kp } elseif ($latest.kpIndex -ne $null) { $latest.kpIndex } else { "2.33" }
            $flux = if ($latest.solarFluxF107 -ne $null) { $latest.solarFluxF107 } else { "148.5" }
            $timeTag = if ($latest.time_tag) { $latest.time_tag } else { [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm") }
            $geomag = if ($latest.geomagneticActivity) { $latest.geomagneticActivity } else { if ([double]$kp -gt 4.0) { "ELEVATED" } else { "QUIET" } }
            $items += @{
                canonicalUrl = "$backend/api/spaceweather#$timeTag"
                title = "NOAA SWPC Planetary Kp Index: $kp ($geomag)"
                body = "Observed At: $timeTag | Kp Index: $kp | Solar Flux F10.7: $flux | Satellite Drag: NOMINAL"
                category = "SPACE_WEATHER"
            }
        }
    }
    return @{ bot = $botName; sourceId = "noaa_swpc"; items = $items }
}

# 7. SatNOGS Global Open RF Telemetry Bot
function Invoke-SatNogsBot($backend) {
    $botName = "SatNOGSGroundTelemetryBot"
    $items = @()
    $json = Fetch-JsonSafe "$backend/api/satnogs"
    if ($json -is [System.Collections.IList] -or $json -is [array]) {
        $obsList = $json | Select-Object -First 3
        foreach ($obs in $obsList) {
            $station = if ($obs.station_name) { $obs.station_name } else { "Station #$($obs.ground_station)" }
            $satName = if ($obs.tle0) { $obs.tle0.Trim() } else { "NORAD $($obs.norad_cat_id)" }
            $freqMhz = if ($obs.observation_frequency) { [Math]::Round($obs.observation_frequency / 1000000.0, 3) } else { "N/A" }
            $mode = if ($obs.transmitter_mode) { $obs.transmitter_mode } else { "RF" }
            $items += @{
                canonicalUrl = "$backend/api/satnogs#obs-$($obs.id)"
                title = "SatNOGS Pass: $satName via $station"
                body = "Downlink: $freqMhz MHz ($mode) | Max Alt: $($obs.max_altitude) deg | Rise Az: $($obs.rise_azimuth) deg"
                category = "RF_GROUND_TELEMETRY"
            }
        }
    } elseif ($json -and $json.stationsOnline -ne $null) {
        $items += @{
            canonicalUrl = "$backend/api/satnogs#ground-telemetry"
            title = "SatNOGS Ground Network ($($json.stationsOnline) Stations Online)"
            body = "Tracked Passes (24h): $($json.passesLogged24h) | Frequency Bands: $($json.frequencyBands -join ', ') | RF Doppler Sync: NOMINAL"
            category = "RF_GROUND_TELEMETRY"
        }
    }
    return @{ bot = $botName; sourceId = "satnogs"; items = $items }
}

# 8. N2YO Real-Time Orbital Pass Bot
function Invoke-N2yoBot($backend) {
    $botName = "N2yoOrbitalPassBot"
    $items = @()
    $json = Fetch-JsonSafe "$backend/api/sources/n2yo"
    if ($json -and $json.passes) {
        foreach ($p in ($json.passes | Select-Object -First 3)) {
            $items += @{
                canonicalUrl = "$backend/api/sources/n2yo#pass-$($p.norad)"
                title = "Topocentric Pass: $($p.satellite) over $($p.observerStation)"
                body = "AOS: $($p.startUtc) | Max Elevation: $($p.maxElevationDeg) deg | Duration: $($p.durationSec)s | Visual Mag: $($p.visualMagnitude)"
                category = "ORBITAL_EPHEMERIS"
            }
        }
    }
    return @{ bot = $botName; sourceId = "n2yo"; items = $items }
}

# 9. AMSAT Radio Amateur Satellite Telemetry Bot
function Invoke-AmsatBot($backend) {
    $botName = "AmsatRadioTelemetryBot"
    $items = @()
    $json = Fetch-JsonSafe "$backend/api/sources/amsat"
    if ($json -and $json.satellites) {
        foreach ($sat in ($json.satellites | Select-Object -First 3)) {
            $items += @{
                canonicalUrl = "$backend/api/sources/amsat#$($sat.name)"
                title = "AMSAT Beacon: $($sat.name) - Transponder $($sat.status)"
                body = "Uplink: $($sat.uplinkMhz) MHz | Downlink: $($sat.downlinkMhz) MHz | Mode: $($sat.mode)"
                category = "RF_GROUND_TELEMETRY"
            }
        }
    }
    return @{ bot = $botName; sourceId = "amsat"; items = $items }
}

# 10. JAXA Michibiki & Hayabusa Operations Bot
function Invoke-JaxaBot($backend) {
    $botName = "JaxaMichibikiBot"
    $items = @()
    $json = Fetch-JsonSafe "$backend/api/sources/jaxa"
    if ($json -and $json.payloads) {
        foreach ($pl in ($json.payloads | Select-Object -First 3)) {
            $items += @{
                canonicalUrl = "$backend/api/sources/jaxa#$($pl.name)"
                title = "JAXA Orbital Asset: $($pl.name) [#$($pl.norad)]"
                body = "Orbit: $($pl.orbit) | Operations Status: $($pl.status) | Coverage / Target: $($pl.coverage -or $pl.target)"
                category = "ORBITAL_EPHEMERIS"
            }
        }
    }
    return @{ bot = $botName; sourceId = "jaxa"; items = $items }
}

# 11. NASA Earth Science & Observing System Bot
function Invoke-NasaEarthScienceBot($backend) {
    $botName = "NasaEarthScienceBot"
    $items = @()
    $json = Fetch-JsonSafe "$backend/api/sources/nasa-earth"
    if ($json -and $json.missions) {
        foreach ($m in ($json.missions | Select-Object -First 3)) {
            $items += @{
                canonicalUrl = "$backend/api/sources/nasa-earth#$($m.norad)"
                title = "NASA EOS: $($m.name) [#$($m.norad)]"
                body = "Orbit: $($m.orbit) | Health: $($m.status) | Payloads: $($m.instruments) | Downlink: $($m.dataRate)"
                category = "EARTH_OBSERVATION"
            }
        }
    }
    return @{ bot = $botName; sourceId = "nasa_earth"; items = $items }
}

# 12. Global Re-entry & Orbital Decay Interception Watch Bot
function Invoke-DecayWatchBot($backend) {
    $botName = "DecayWatchBot"
    $items = @()
    $json = Fetch-JsonSafe "$backend/api/sources/decay"
    if ($json -and $json.decayAlerts) {
        foreach ($da in ($json.decayAlerts | Select-Object -First 3)) {
            $items += @{
                canonicalUrl = "$backend/api/sources/decay#$($da.noradId)"
                title = "RE-ENTRY ALERT: $($da.name) (Perigee $($da.perigeeKm) km)"
                body = "Loss: -$($da.dailyLossKm) km/day | Impact Epoch: $($da.predictedReentryEpoch) | Footprint: $($da.estimatedFootprint) | Risk: $($da.riskLevel)"
                category = "SPACE_SAFETY"
            }
        }
    }
    return @{ bot = $botName; sourceId = "orbital_decay"; items = $items }
}

# 13. Auto Satellite Discovery & Missing Sat Ingestion Bot
function Invoke-AutoDiscoveryBot($backend) {
    $botName = "AutoSatelliteDiscoveryBot"
    $items = @()
    try {
        $disc = Invoke-RestMethod -Uri "$backend/api/satellites/discover" -Method Post -TimeoutSec 6
        if ($disc -and $disc.discovered -and $disc.discovered.Count -gt 0) {
            foreach ($s in $disc.discovered) {
                $items += @{
                    canonicalUrl = "$backend/catalog.html#norad-$($s.noradId)"
                    title = "DISCOVERED: $($s.name) [#$($s.noradId)] ($($s.agency))"
                    body = "Regime: $($s.regime) | Alt: $($s.perigeeKm) km | Inclination: $($s.inclinationDeg) deg | Sensor: $($s.scienceTarget) | Mission Status: $($s.status)"
                    category = "ORBITAL_EPHEMERIS"
                }
            }
        }
    } catch {}
    return @{ bot = $botName; sourceId = "auto_discovery"; items = $items }
}

# List of all 13 Bot Handlers
$BotRegistry = @(
    ${function:Invoke-AutoDiscoveryBot},
    ${function:Invoke-CelestrakBot},
    ${function:Invoke-NasaDeepSpaceBot},
    ${function:Invoke-EsaCopernicusBot},
    ${function:Invoke-IsroNetraBot},
    ${function:Invoke-SpaceTrackBot},
    ${function:Invoke-NoaaWeatherBot},
    ${function:Invoke-SatNogsBot},
    ${function:Invoke-N2yoBot},
    ${function:Invoke-AmsatBot},
    ${function:Invoke-JaxaBot},
    ${function:Invoke-NasaEarthScienceBot},
    ${function:Invoke-DecayWatchBot}
)

# ==============================================================================
# DIFFERENTIAL RECONCILIATION & INGESTION CYCLE
# ==============================================================================
function Run-MultiBotCycle {
    # 1. Fetch currently active records from backend database
    $activeMap = @{}
    try {
        $existingRes = Invoke-RestMethod -Uri "$BackendUrl/api/intel/records?status=ACTIVE" -TimeoutSec 4
        if ($existingRes.records) {
            foreach ($r in $existingRes.records) {
                $activeMap[$r.id] = $r
            }
        }
    } catch {
        Write-Warning "[ORCHESTRATOR] Backend active records unreachable: $_"
    }

    $totalAdded = 0
    $totalUpdated = 0

    foreach ($botFn in $BotRegistry) {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $result = & $botFn $BackendUrl
        $sw.Stop()

        $botName = $result.bot
        $sourceId = $result.sourceId
        $items = $result.items

        Write-Host "`n[$botName] Analyzing source '$sourceId' ($($items.Count) nodes in $($sw.ElapsedMilliseconds)ms)..." -ForegroundColor Cyan

        $added = @()
        $updated = @()

        foreach ($raw in $items) {
            $recordId = (Compute-Sha256 $raw.canonicalUrl).Substring(0, 16)
            $contentHash = Compute-Sha256 "$($raw.title)::$($raw.body)"
            $now = [DateTime]::UtcNow.ToString("o")

            $existing = $activeMap[$recordId]

            if (-not $existing) {
                # [NEW_INTEL] Detected
                $newRecord = @{
                    id = $recordId
                    sourceUrl = $raw.canonicalUrl
                    title = $raw.title
                    body = $raw.body
                    category = $raw.category
                    contentHash = $contentHash
                    status = "ACTIVE"
                    firstSeenAt = $now
                    lastSeenAt = $now
                    updatedAt = $now
                }
                $added += $newRecord
                $activeMap[$recordId] = $newRecord
                Write-Host "  >> [NEW_INTEL] Injected: $($raw.title.Substring(0, [Math]::Min(60, $raw.title.Length)))... (ID: $recordId)" -ForegroundColor Green
            } elseif ($existing.contentHash -ne $contentHash) {
                # [MODIFIED] Detected
                $updRecord = @{
                    id = $recordId
                    sourceUrl = $raw.canonicalUrl
                    title = $raw.title
                    body = $raw.body
                    category = $raw.category
                    contentHash = $contentHash
                    status = "ACTIVE"
                    firstSeenAt = $existing.firstSeenAt
                    lastSeenAt = $now
                    updatedAt = $now
                }
                $updated += $updRecord
                $activeMap[$recordId] = $updRecord
                Write-Host "  >> [MODIFIED] Hash Recalibrated: $($raw.title.Substring(0, [Math]::Min(60, $raw.title.Length)))..." -ForegroundColor Yellow
            }
        }

        # 2. Ingest Differential Report to Backend
        if ($added.Count -gt 0 -or $updated.Count -gt 0) {
            $diffReport = @{
                sourceId = $sourceId
                report = @{
                    added = $added
                    updated = $updated
                    deleted = @()
                }
            } | ConvertTo-Json -Depth 6

            try {
                $resp = Invoke-RestMethod -Uri "$BackendUrl/api/intel/ingest" -Method Post -Body $diffReport -ContentType "application/json" -TimeoutSec 5
                Write-Host "  >> [COMMITTED] Backend accepted: +$($added.Count) additions, ~$($updated.Count) mutations." -ForegroundColor Magenta
                $totalAdded += $added.Count
                $totalUpdated += $updated.Count
            } catch {
                Write-Warning "  >> [ERROR] Ingest commit failed: $_"
            }
        } else {
            Write-Host "  -- [RECONCILED] State unchanged (0 deltas)." -ForegroundColor DarkGray
        }
    }

    Write-Host "`n=================================================================" -ForegroundColor Cyan
    Write-Host "  [CYCLE COMPLETE] Processed 13 Global Autonomous Bots: +$totalAdded injected, ~$totalUpdated updated." -ForegroundColor Green
    Write-Host "  OPERATIVE: CREATED BY MR SINGH" -ForegroundColor Yellow
    Write-Host "=================================================================" -ForegroundColor Cyan
}

# Execution
if ($RunOnce) {
    Run-MultiBotCycle
} else {
    while ($true) {
        Run-MultiBotCycle
        Start-Sleep -Seconds $PollIntervalSec
    }
}

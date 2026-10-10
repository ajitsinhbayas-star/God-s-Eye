# ==============================================================================
# GOD'S EYE // RADAR - SPECIAL ACTIVITIES DIVISION
# CREATED BY MR SINGH // SPECIAL ACTIVITIES DIVISION
# Master Worldwide Satellite Fleet Compiler (360+ Satellites across All Types)
# ==============================================================================

param(
    [string]$OutputPath = "fleet-catalog.json"
)

function New-Tle($norad, $inc, $raan, $ecc, $argp, $ma, $mm) {
    $nStr = ("{0:D5}" -f [int]$norad)
    $l1 = ("1 {0}U 24001A   24095.50000000  .00001000  00000-0  10000-3 0  9991" -f $nStr)
    $incStr = ("{0,8:F4}" -f [double]$inc)
    $raanStr = ("{0,8:F4}" -f [double]$raan)
    $eccStr = ("{0:D7}" -f [int]([Math]::Min(9999999, [Math]::Max(0, [int]($ecc * 10000000)))))
    $argpStr = ("{0,8:F4}" -f [double]$argp)
    $maStr = ("{0,8:F4}" -f [double]$ma)
    $mmStr = ("{0,11:F8}" -f [double]$mm)
    $l2 = ("2 {0} {1} {2} {3} {4} {5} {6}00001" -f $nStr, $incStr, $raanStr, $eccStr, $argpStr, $maStr, $mmStr)
    return @{ line1 = $l1; line2 = $l2 }
}

$fleet = [System.Collections.ArrayList]::new()

function Add-Sat($norad, $name, $desig, $agency, $regime, $alt, $inc, $period, $vel, $status, $year, $swath, $covert, $target, $family, $raan = 0, $ecc = 0.0008, $argp = 90, $ma = 180, $isDeep = $false, $isLunar = $false) {
    $mm = 1440.0 / [Math]::Max(1.0, [double]$period)
    $tles = New-Tle $norad $inc $raan $ecc $argp $ma $mm

    $item = @{
        noradId = [int]$norad
        name = [string]$name
        intlDesignator = [string]$desig
        agency = [string]$agency
        regime = [string]$regime
        perigeeKm = [double]$alt
        apogeeKm = [double]$alt
        inclinationDeg = [double]$inc
        periodMin = [double]$period
        velocityKms = [double]$vel
        status = [string]$status
        launchYear = [int]$year
        sensorSwathKm = [double]$swath
        covertRating = [string]$covert
        scienceTarget = [string]$target
        family = [string]$family
        tleLine1 = $tles.line1
        tleLine2 = $tles.line2
        isDeepSpace = [bool]$isDeep
        isLunar = [bool]$isLunar
    }
    [void]$fleet.Add($item)
}

# ------------------------------------------------------------------------------
# 1. CREWED STATIONS & HUMAN SPACEFLIGHT (12)
# ------------------------------------------------------------------------------
Add-Sat 25544 "ISS (ZARYA)" "1998-067A" "NASA / MULTI" "LEO" 418.5 51.64 92.9 7.66 "OPERATIONAL" 1998 420 "PUBLIC // OPEN CIVILIAN" "Microgravity Science & International Earth Lab" "stations" 168.4 0.0006 112.5 247.8
Add-Sat 48274 "CSS (TIANGONG)" "2021-035A" "CNSA" "LEO" 389.0 41.47 92.4 7.68 "OPERATIONAL" 2021 380 "RESTRICTED // LEVEL 4" "Chinese Multi-Module Orbital Research Base" "stations" 215.1 0.0003 84.1 142.5
Add-Sat 52758 "CREW DRAGON (FREEDOM)" "2022-042A" "SpaceX" "LEO" 418.0 51.64 92.9 7.66 "OPERATIONAL" 2022 350 "COMMERCIAL // HIGH TRUST" "Human Spaceflight Ferry & Return Vehicle" "stations" 168.4 0.0005 110.2 245.1
Add-Sat 46920 "CREW DRAGON (RESILIENCE)" "2020-084A" "SpaceX" "LEO" 420.0 51.64 92.9 7.66 "OPERATIONAL" 2020 350 "COMMERCIAL // HIGH TRUST" "Commercial Astronautics & Free Flight Transport" "stations" 170.2 0.0006 115.0 240.0
Add-Sat 57520 "CREW DRAGON (ENDURANCE)" "2023-118A" "SpaceX" "LEO" 419.0 51.64 92.9 7.66 "OPERATIONAL" 2023 350 "COMMERCIAL // HIGH TRUST" "Expedition Crew Transport" "stations" 165.8 0.0005 108.0 250.0
Add-Sat 45623 "CREW DRAGON (ENDEAVOUR)" "2020-033A" "SpaceX" "LEO" 417.0 51.64 92.9 7.66 "OPERATIONAL" 2020 350 "COMMERCIAL // HIGH TRUST" "Commercial Crew Transportation System" "stations" 169.5 0.0005 111.0 244.0
Add-Sat 58140 "SHENZHOU-17" "2023-164A" "CNSA" "LEO" 388.0 41.47 92.4 7.68 "OPERATIONAL" 2023 300 "CLASSIFIED // CREWED" "Tiangong Crewed Expedition Ferry" "stations" 214.0 0.0004 82.0 145.0
Add-Sat 59560 "SHENZHOU-18" "2024-078A" "CNSA" "LEO" 390.0 41.47 92.4 7.68 "OPERATIONAL" 2024 300 "CLASSIFIED // CREWED" "Tiangong Flight Rotation & Extravehicular Missions" "stations" 216.5 0.0003 85.0 140.0
Add-Sat 59280 "SOYUZ MS-25" "2024-057A" "Roscosmos" "LEO" 416.0 51.64 92.9 7.66 "OPERATIONAL" 2024 250 "TACTICAL ALLIANCE" "Expedition 71 Crew Ferry" "stations" 167.0 0.0006 113.0 246.0
Add-Sat 59010 "PROGRESS MS-26" "2024-032A" "Roscosmos" "LEO" 415.0 51.64 92.9 7.66 "OPERATIONAL" 2024 200 "LOGISTICS // FREIGHT" "Autonomous ISS Re-supply & Orbit Reboost" "stations" 168.0 0.0007 114.0 245.0
Add-Sat 59265 "CARGO DRAGON (CRS-30)" "2024-055A" "SpaceX" "LEO" 417.5 51.64 92.9 7.66 "OPERATIONAL" 2024 280 "LOGISTICS // FREIGHT" "Uncrewed Cargo Delivery & Pressurized Science" "stations" 169.0 0.0005 110.0 246.0
Add-Sat 58900 "CYGNUS NG-20" "2024-021A" "NASA" "LEO" 419.0 51.64 92.9 7.66 "OPERATIONAL" 2024 250 "LOGISTICS // FREIGHT" "S.S. Patricia Robertson Cargo Carrier" "stations" 168.2 0.0006 112.0 247.0

# ------------------------------------------------------------------------------
# 2. SPACEX STARLINK MEGA-CONSTELLATION (60)
# ------------------------------------------------------------------------------
$starlinkPlanes = @(
    @{ inc = 53.0; alt = 550.0; vel = 7.58; period = 95.6; code = "S1" },
    @{ inc = 53.2; alt = 540.0; vel = 7.59; period = 95.4; code = "S2" },
    @{ inc = 70.0; alt = 560.0; vel = 7.57; period = 95.8; code = "S3" },
    @{ inc = 97.6; alt = 560.0; vel = 7.57; period = 95.8; code = "SP" }
)

$slBaseNorad = 51000
for ($i = 0; $i -lt 60; $i++) {
    $p = $starlinkPlanes[$i % 4]
    $nid = $slBaseNorad + $i
    $raan = ($i * 17.5) % 360
    $ma = ($i * 29.3) % 360
    $num = 2000 + $i * 15
    $isCell = ($i % 8 -eq 0)
    $alt = if ($isCell) { 360.0 } else { $p.alt }
    $period = if ($isCell) { 91.8 } else { $p.period }
    $vel = if ($isCell) { 7.70 } else { $p.vel }
    $desigName = if ($isCell) { "STARLINK-$num (DIRECT-TO-CELL)" } else { "STARLINK-$num ($($p.code))" }
    $covert = if ($isCell) { "COMMERCIAL LTE OVERLAY // CELL" } else { "COMMERCIAL PHASED ARRAY // MESH" }
    Add-Sat $nid $desigName "2023-0$([Math]::Max(10,$i))A" "SpaceX" "LEO" $alt $p.inc $period $vel "OPERATIONAL" 2023 450 $covert "Optical Space Laser Intersatellite Mesh" "starlink" $raan 0.0001 45.0 $ma
}

# ------------------------------------------------------------------------------
# 3. ONEWEB BROADBAND POLAR CONSTELLATION (24)
# ------------------------------------------------------------------------------
$owBaseNorad = 47000
for ($i = 0; $i -lt 24; $i++) {
    $nid = $owBaseNorad + $i
    $raan = ($i * 15.0) % 360
    $ma = ($i * 30.0) % 360
    $num = 100 + $i * 4
    Add-Sat $nid "ONEWEB-$num (POLAR)" "2022-0$([Math]::Max(10,$i))A" "OneWeb" "Polar" 1200.0 87.40 109.6 7.24 "OPERATIONAL" 2022 600 "GLOBAL POLAR BROADBAND" "Ku/Ka Band Global Satellite Telecom" "telecom" $raan 0.0012 120.0 $ma
}

# ------------------------------------------------------------------------------
# 4. GPS CONSTELLATION - USA GNSS / PNT (32)
# ------------------------------------------------------------------------------
$gpsPrns = @(
    @{ norad = 36585; prn = 25; blk = "BIIF-1"; year = 2010 },
    @{ norad = 37753; prn = 1; blk = "BIIF-2"; year = 2011 },
    @{ norad = 38833; prn = 24; blk = "BIIF-3"; year = 2012 },
    @{ norad = 39166; prn = 27; blk = "BIIF-4"; year = 2013 },
    @{ norad = 39533; prn = 30; blk = "BIIF-5"; year = 2014 },
    @{ norad = 39741; prn = 6; blk = "BIIF-6"; year = 2014 },
    @{ norad = 40105; prn = 9; blk = "BIIF-7"; year = 2014 },
    @{ norad = 40294; prn = 3; blk = "BIIF-8"; year = 2014 },
    @{ norad = 40534; prn = 26; blk = "BIIF-9"; year = 2015 },
    @{ norad = 40730; prn = 8; blk = "BIIF-10"; year = 2015 },
    @{ norad = 41019; prn = 10; blk = "BIIF-11"; year = 2015 },
    @{ norad = 41328; prn = 32; blk = "BIIF-12"; year = 2016 },
    @{ norad = 43873; prn = 4; blk = "III-01 (VESPUCCI)"; year = 2018 },
    @{ norad = 44506; prn = 18; blk = "III-02 (MAGELLAN)"; year = 2019 },
    @{ norad = 45854; prn = 23; blk = "III-03 (HENSON)"; year = 2020 },
    @{ norad = 46826; prn = 14; blk = "III-04 (SACAGAWEA)"; year = 2020 },
    @{ norad = 48859; prn = 11; blk = "III-05 (ARMSTRONG)"; year = 2021 },
    @{ norad = 55268; prn = 28; blk = "III-06 (EARHART)"; year = 2023 },
    @{ norad = 27663; prn = 2; blk = "IIR-10"; year = 2003 },
    @{ norad = 28129; prn = 13; blk = "IIR-11"; year = 2004 },
    @{ norad = 28474; prn = 19; blk = "IIR-12"; year = 2004 },
    @{ norad = 28874; prn = 17; blk = "IIR-13"; year = 2004 },
    @{ norad = 29486; prn = 31; blk = "IIR-M1"; year = 2006 },
    @{ norad = 29601; prn = 12; blk = "IIR-M2"; year = 2006 },
    @{ norad = 32260; prn = 15; blk = "IIR-M3"; year = 2007 },
    @{ norad = 32384; prn = 29; blk = "IIR-M4"; year = 2007 },
    @{ norad = 32711; prn = 7; blk = "IIR-M5"; year = 2008 },
    @{ norad = 35752; prn = 5; blk = "IIR-M6"; year = 2009 },
    @{ norad = 35948; prn = 20; blk = "IIR-M7"; year = 2009 },
    @{ norad = 36874; prn = 21; blk = "IIR-M8"; year = 2010 },
    @{ norad = 37211; prn = 16; blk = "BIIF-13"; year = 2011 },
    @{ norad = 37400; prn = 22; blk = "BIIF-14"; year = 2011 }
)

foreach ($g in $gpsPrns) {
    $raan = ($g.prn * 22.5) % 360
    $ma = ($g.prn * 45.0) % 360
    Add-Sat $g.norad "GPS $($g.blk) (PRN $($g.prn))" "$($g.year)-022A" "US Space Force" "MEO" 20180.0 55.00 717.9 3.87 "OPERATIONAL" $g.year 3000 "MILITARY ENCRYPTED M-CODE" "Global Precision Positioning, Navigation & Timing" "gnss" $raan 0.005 60.0 $ma
}

# ------------------------------------------------------------------------------
# 5. GLONASS CONSTELLATION - RUSSIA GNSS (24)
# ------------------------------------------------------------------------------
$gloBaseNorad = 39000
for ($i = 0; $i -lt 24; $i++) {
    $nid = $gloBaseNorad + $i * 12
    $num = 750 + $i
    $raan = ($i * 30.0) % 360
    $ma = ($i * 45.0) % 360
    Add-Sat $nid "COSMOS 2$($num) (GLONASS-M)" "2018-0$([Math]::Max(10,$i))A" "Roscosmos" "MEO" 19100.0 64.80 675.7 3.95 "OPERATIONAL" 2018 2800 "SOVEREIGN RUSSIAN PNT" "L1/L2 FDMA Dual-Use Radio Navigation" "gnss" $raan 0.001 75.0 $ma
}

# ------------------------------------------------------------------------------
# 6. GALILEO CONSTELLATION - ESA / EU GNSS (24)
# ------------------------------------------------------------------------------
$galBaseNorad = 41000
for ($i = 0; $i -lt 24; $i++) {
    $nid = $galBaseNorad + $i * 14
    $gsatNum = 201 + $i
    $raan = ($i * 25.0) % 360
    $ma = ($i * 35.0) % 360
    Add-Sat $nid "GALILEO $($i+1) (GSAT0$gsatNum)" "2019-0$([Math]::Max(10,$i))A" "ESA" "MEO" 23222.0 56.02 844.7 3.68 "OPERATIONAL" 2019 3200 "ENCRYPTED PRS // EU DEFENSE" "Sub-decimeter High Accuracy Service (HAS)" "gnss" $raan 0.0002 90.0 $ma
}

# ------------------------------------------------------------------------------
# 7. BEIDOU-3 CONSTELLATION - CHINA GNSS (26)
# ------------------------------------------------------------------------------
# MEO Satellites (16)
for ($i = 0; $i -lt 16; $i++) {
    $nid = 43000 + $i * 18
    $raan = ($i * 22.5) % 360
    $ma = ($i * 45.0) % 360
    Add-Sat $nid "BEIDOU-3 M$($i+1) (BDS-3)" "2020-0$([Math]::Max(10,$i))A" "CNSA" "MEO" 21528.0 55.00 773.0 3.78 "OPERATIONAL" 2020 3100 "SOVEREIGN B1C/B2a PNT" "Global Navigation & Short Message Communication" "gnss" $raan 0.0005 85.0 $ma
}
# IGSO & GEO Satellites (10)
for ($i = 0; $i -lt 6; $i++) {
    $nid = 44000 + $i * 25
    Add-Sat $nid "BEIDOU-3 IGSO-$($i+1)" "2019-0$([Math]::Max(10,$i))B" "CNSA" "HEO" 35786.0 55.00 1436.0 3.07 "OPERATIONAL" 2019 5000 "ASIA-PACIFIC STRATEGIC" "Inclined Geosynchronous Regional PNT Augmentation" "gnss" ($i*60) 0.0003 45.0 ($i*40)
}
for ($i = 0; $i -lt 4; $i++) {
    $nid = 44200 + $i * 30
    Add-Sat $nid "BEIDOU-3 G$($i+1) (GEO)" "2020-0$([Math]::Max(10,$i))C" "CNSA" "GEO" 35786.0 0.10 1436.0 3.07 "OPERATIONAL" 2020 8000 "SOVEREIGN SBAS // GEO" "Geostationary Regional Augmentation & PNT" "gnss" 0 0.0001 0 ($i*90)
}

# ------------------------------------------------------------------------------
# 8. ISRO NAVIC / IRNSS & QZSS MICHIBIKI (13)
# ------------------------------------------------------------------------------
$navicList = @(
    @{ norad = 39199; name = "NAVIC-1B (IRNSS-1B)"; reg = "GEO"; inc = 30.5; alt = 35786.0 },
    @{ norad = 40269; name = "NAVIC-1C (IRNSS-1C)"; reg = "GEO"; inc = 5.2; alt = 35786.0 },
    @{ norad = 40547; name = "NAVIC-1D (IRNSS-1D)"; reg = "GEO"; inc = 30.8; alt = 35786.0 },
    @{ norad = 41241; name = "NAVIC-1E (IRNSS-1E)"; reg = "GEO"; inc = 29.8; alt = 35786.0 },
    @{ norad = 41384; name = "NAVIC-1F (IRNSS-1F)"; reg = "GEO"; inc = 5.0; alt = 35786.0 },
    @{ norad = 43286; name = "NAVIC-1I (IRNSS-1I)"; reg = "GEO"; inc = 29.1; alt = 35786.0 },
    @{ norad = 56759; name = "NVS-01 (NAVIC GEN-2)"; reg = "GEO"; inc = 5.1; alt = 35786.0 },
    @{ norad = 49336; name = "QZS-1R (MICHIBIKI)"; reg = "HEO"; inc = 40.2; alt = 35786.0 },
    @{ norad = 42738; name = "QZS-2 (MICHIBIKI)"; reg = "HEO"; inc = 44.0; alt = 35786.0 },
    @{ norad = 42918; name = "QZS-3 (GEO)"; reg = "GEO"; inc = 0.1; alt = 35786.0 },
    @{ norad = 42965; name = "QZS-4 (MICHIBIKI)"; reg = "HEO"; inc = 40.0; alt = 35786.0 }
)
foreach ($n in $navicList) {
    $ag = if ($n.name -like "*NAVIC*" -or $n.name -like "*NVS*") { "ISRO" } else { "JAXA" }
    $fam = if ($ag -eq "ISRO") { "navic" } else { "jaxa" }
    Add-Sat $n.norad $n.name "2021-0$($n.norad % 90)A" $ag $n.reg $n.alt $n.inc 1436.0 3.07 "OPERATIONAL" 2021 3500 "SOVEREIGN REGIONAL PNT" "Regional Atomic Clock Precision Positioning" $fam 83.2 0.0004 30.0 120.0
}

# ------------------------------------------------------------------------------
# 9. NASA EARTH OBSERVATION & SCIENCE (28)
# ------------------------------------------------------------------------------
Add-Sat 54754 "SWOT (SURFACE WATER)" "2022-172A" "NASA" "LEO" 891.0 77.60 102.8 7.42 "OPERATIONAL" 2022 120 "SPECIAL ACTIVITIES // LEVEL 4" "KaRIn Interferometer Surface Water Survey" "nasa_earth" 135.2 0.0002 85.0 274.0
Add-Sat 25994 "TERRA (EOS AM-1)" "1999-068A" "NASA" "SSO" 705.0 98.20 98.8 7.51 "OPERATIONAL" 1999 2330 "EARTH OBSERVATION // GLOBAL" "MODIS & CERES Biosphere & Climate Monitoring" "nasa_earth" 190.1 0.0001 68.0 291.0
Add-Sat 27424 "AQUA (EOS PM-1)" "2002-022A" "NASA" "SSO" 705.0 98.20 98.8 7.51 "OPERATIONAL" 2002 2330 "EARTH OBSERVATION // HYDROLOGY" "MODIS & AIRS Global Hydrological Cycle" "nasa_earth" 195.0 0.0001 70.0 288.0
Add-Sat 28376 "AURA (EOS CH-1)" "2004-026A" "NASA" "SSO" 705.0 98.20 98.8 7.51 "OPERATIONAL" 2004 2000 "ATMOSPHERIC COMPOSITION" "MLS & OMI Global Ozone & Air Quality" "nasa_earth" 200.0 0.0001 72.0 285.0
Add-Sat 49260 "LANDSAT 9" "2021-088A" "NASA" "SSO" 705.0 98.20 98.8 7.51 "OPERATIONAL" 2021 185 "MULTISPECTRAL // 15M" "OLI-2 & TIRS-2 Land Surface Imagery" "nasa_earth" 205.0 0.0001 75.0 280.0
Add-Sat 39084 "LANDSAT 8" "2013-008A" "NASA" "SSO" 705.0 98.20 98.8 7.51 "OPERATIONAL" 2013 185 "MULTISPECTRAL // 15M" "Operational Land Imager Thermal Survey" "nasa_earth" 210.0 0.0001 76.0 278.0
Add-Sat 37849 "SUOMI NPP" "2011-061A" "NASA / NOAA" "SSO" 824.0 98.70 101.4 7.45 "OPERATIONAL" 2011 3000 "CLIMATE POLAR SOUNDER" "VIIRS & ATMS Numerical Weather Prediction" "nasa_earth" 180.0 0.0002 80.0 260.0
Add-Sat 43013 "NOAA 20 (JPSS-1)" "2017-073A" "NOAA / NASA" "SSO" 824.0 98.70 101.4 7.45 "OPERATIONAL" 2017 3000 "OPERATIONAL POLAR WEATHER" "Primary Polar Meteorological Sounding" "nasa_earth" 210.4 0.0002 75.0 285.0
Add-Sat 54234 "NOAA 21 (JPSS-2)" "2022-152A" "NOAA / NASA" "SSO" 824.0 98.70 101.4 7.45 "OPERATIONAL" 2022 3000 "NEXT-GEN SOUNDER" "VIIRS & OMPS Severe Storm Forecasting" "nasa_earth" 220.0 0.0002 78.0 282.0
Add-Sat 58928 "PACE (OCEAN & CLOUD)" "2024-027A" "NASA" "SSO" 676.5 98.00 98.3 7.52 "OPERATIONAL" 2024 2663 "HYPERSPECTRAL // OCEAN" "OCI Ocean Color & SPEXone Aerosol Polarimeter" "nasa_earth" 185.0 0.0001 82.0 270.0
Add-Sat 43613 "ICESAT-2" "2018-070A" "NASA" "Polar" 496.0 92.00 94.6 7.62 "OPERATIONAL" 2018 50 "PRECISION LASER ALTIMETRY" "ATLAS Micro-pulse Photon-counting Lidar Ice Mapping" "nasa_earth" 140.0 0.0013 95.0 240.0
Add-Sat 40376 "SMAP (SOIL MOISTURE)" "2015-003A" "NASA" "SSO" 685.0 98.10 98.5 7.52 "OPERATIONAL" 2015 1000 "L-BAND RADAR & RADIOMETER" "Global Hydrology & Agriculture Moisture Mapping" "nasa_earth" 192.0 0.0008 84.0 275.0
Add-Sat 40059 "OCO-2 (CARBON)" "2014-035A" "NASA" "SSO" 705.0 98.20 98.8 7.51 "OPERATIONAL" 2014 100 "ATMOSPHERIC CO2" "High-resolution Grating Spectrometer CO2 Profiling" "nasa_earth" 196.0 0.0001 71.0 286.0
Add-Sat 43468 "GRACE-FO 1" "2018-047A" "NASA / GFZ" "Polar" 490.0 89.00 94.4 7.62 "OPERATIONAL" 2018 200 "TWIN SATELLITE GRAVIMETRY" "Laser Ranging Interferometer Mass Distribution" "nasa_earth" 150.0 0.0015 90.0 230.0
Add-Sat 43469 "GRACE-FO 2" "2018-047B" "NASA / GFZ" "Polar" 490.0 89.00 94.4 7.62 "OPERATIONAL" 2018 200 "TWIN SATELLITE GRAVIMETRY" "K-Band Ranging Gravity Anomaly Detection" "nasa_earth" 150.1 0.0015 90.0 230.1
Add-Sat 41866 "CYGNSS 1" "2016-078A" "NASA" "LEO" 520.0 35.00 95.0 7.60 "OPERATIONAL" 2016 400 "HURRICANE BISTATIC RADAR" "GNSS Reflectometry Tropical Cyclone Wind Speed" "nasa_earth" 80.0 0.0010 60.0 210.0
Add-Sat 41867 "CYGNSS 2" "2016-078B" "NASA" "LEO" 520.0 35.00 95.0 7.60 "OPERATIONAL" 2016 400 "HURRICANE BISTATIC RADAR" "GNSS Reflectometry Tropical Cyclone Wind Speed" "nasa_earth" 95.0 0.0010 60.0 220.0
Add-Sat 41868 "CYGNSS 3" "2016-078C" "NASA" "LEO" 520.0 35.00 95.0 7.60 "OPERATIONAL" 2016 400 "HURRICANE BISTATIC RADAR" "GNSS Reflectometry Tropical Cyclone Wind Speed" "nasa_earth" 110.0 0.0010 60.0 230.0
Add-Sat 41869 "CYGNSS 4" "2016-078D" "NASA" "LEO" 520.0 35.00 95.0 7.60 "OPERATIONAL" 2016 400 "HURRICANE BISTATIC RADAR" "GNSS Reflectometry Tropical Cyclone Wind Speed" "nasa_earth" 125.0 0.0010 60.0 240.0
Add-Sat 41864 "GOES-16 (GOES-EAST)" "2016-071A" "NOAA / NASA" "GEO" 35786.0 0.05 1436.0 3.07 "OPERATIONAL" 2016 10000 "ADVANCED BASELINE IMAGER" "Eastern Hemisphere Continental Meteorological Radar" "weather" 0 0.0001 0 75.2
Add-Sat 51850 "GOES-18 (GOES-WEST)" "2022-022A" "NOAA / NASA" "GEO" 35786.0 0.05 1436.0 3.07 "OPERATIONAL" 2022 10000 "ADVANCED BASELINE IMAGER" "Pacific Basin & Western North America Real-Time ABI" "weather" 0 0.0001 0 137.0
Add-Sat 39070 "TDRS-11 (COMMS RELAY)" "2013-004A" "NASA" "GEO" 35786.0 2.50 1436.0 3.07 "OPERATIONAL" 2013 15000 "SPACE NETWORK HIGH-BANDWIDTH" "Spacecraft S/Ku/Ka Intersatellite Relay" "comms" 45.0 0.0005 10.0 171.0
Add-Sat 39504 "TDRS-12 (COMMS RELAY)" "2014-004A" "NASA" "GEO" 35786.0 2.20 1436.0 3.07 "OPERATIONAL" 2014 15000 "SPACE NETWORK HIGH-BANDWIDTH" "Spacecraft S/Ku/Ka Intersatellite Relay" "comms" 55.0 0.0005 15.0 41.0
Add-Sat 42915 "TDRS-13 (COMMS RELAY)" "2017-047A" "NASA" "GEO" 35786.0 1.80 1436.0 3.07 "OPERATIONAL" 2017 15000 "SPACE NETWORK HIGH-BANDWIDTH" "Spacecraft S/Ku/Ka Intersatellite Relay" "comms" 65.0 0.0005 20.0 150.0

# ------------------------------------------------------------------------------
# 10. ESA COPERNICUS & EUROPEAN EARTH OBSERVATION (20)
# ------------------------------------------------------------------------------
Add-Sat 39634 "SENTINEL-1A (C-BAND SAR)" "2014-016A" "ESA" "SSO" 693.0 98.18 98.6 7.51 "OPERATIONAL" 2014 400 "ALL-WEATHER RADAR IMAGING" "Dual-polarization C-Band SAR Synthetic Aperture" "esa" 145.0 0.0001 70.0 280.0
Add-Sat 41456 "SENTINEL-1B (C-BAND SAR)" "2016-025A" "ESA" "SSO" 693.0 98.18 98.6 7.51 "OPERATIONAL" 2016 400 "RADAR INTERFEROMETRY" "InSAR Ground Deformation & Maritime Surveillance" "esa" 325.0 0.0001 70.0 100.0
Add-Sat 40697 "SENTINEL-2A (MSI 10M)" "2015-028A" "ESA" "SSO" 786.0 98.62 100.6 7.46 "OPERATIONAL" 2015 290 "HIGH-RESOLUTION MULTISPECTRAL" "13-Band Optical Land & Coastal Bio-Monitoring" "esa" 160.0 0.0001 80.0 260.0
Add-Sat 42063 "SENTINEL-2B (MSI 10M)" "2017-013A" "ESA" "SSO" 786.0 98.62 100.6 7.46 "OPERATIONAL" 2017 290 "HIGH-RESOLUTION MULTISPECTRAL" "Twin Orbit 5-Day Revisit Vegetation Health" "esa" 340.0 0.0001 80.0 80.0
Add-Sat 41335 "SENTINEL-3A (OLCI/SLSTR)" "2016-011A" "ESA" "SSO" 815.0 98.65 101.2 7.44 "OPERATIONAL" 2016 1270 "OCEAN & LAND COLOR" "Thermal Infrared Surface Temp & Topography" "esa" 175.0 0.0001 85.0 250.0
Add-Sat 43437 "SENTINEL-3B (OLCI/SLSTR)" "2018-039A" "ESA" "SSO" 815.0 98.65 101.2 7.44 "OPERATIONAL" 2018 1270 "OCEAN TOPOGRAPHY RADAR" "SRAL Ku/C-band Radar Altimeter Bathymetry" "esa" 355.0 0.0001 85.0 70.0
Add-Sat 42969 "SENTINEL-5P (TROPOMI)" "2017-064A" "ESA" "SSO" 824.0 98.74 101.4 7.44 "OPERATIONAL" 2017 2600 "AIR QUALITY // TROPOSPHERE" "Trace Gas Pollutant Mapper (NO2, SO2, CH4, CO)" "esa" 190.0 0.0001 88.0 240.0
Add-Sat 46984 "SENTINEL-6A (MICHAEL FREILICH)" "2020-086A" "ESA" "LEO" 1336.0 66.04 112.4 7.18 "OPERATIONAL" 2020 300 "REFERENCE OCEAN ALTIMETRY" "Poseidon-4 Radar Global Sea Level Rise Precision" "esa" 185.2 0.0001 85.0 275.1
Add-Sat 36508 "CRYOSAT-2 (SAR INTERFEROMETER)" "2010-013A" "ESA" "Polar" 720.0 92.00 99.2 7.50 "OPERATIONAL" 2010 15 "POLAR ICE SHEET PROFILER" "SIRAL Radar Altimeter Cryosphere Monitoring" "esa" 120.0 0.0014 95.0 220.0
Add-Sat 35989 "SMOS (SOIL MOISTURE & SALINITY)" "2009-062A" "ESA" "SSO" 758.0 98.44 100.0 7.48 "OPERATIONAL" 2009 1050 "MIRAS L-BAND INTERFEROMETER" "Ocean Salinity & Continental Soil Hydrology" "esa" 170.0 0.0002 82.0 265.0
Add-Sat 39452 "SWARM-A (GEOMAGNETIC)" "2013-067B" "ESA" "Polar" 462.0 87.35 93.8 7.63 "OPERATIONAL" 2013 500 "MAGNETOSPHERE SHIELD MONITOR" "Vector Field Magnetometer Dynamic Core Field" "esa" 110.0 0.0016 90.0 215.0
Add-Sat 39451 "SWARM-B (GEOMAGNETIC)" "2013-067A" "ESA" "Polar" 511.0 87.75 94.8 7.60 "OPERATIONAL" 2013 500 "MAGNETOSPHERE SHIELD MONITOR" "Upper Pair Magnetic Induction Mapping" "esa" 112.0 0.0016 90.0 215.0
Add-Sat 39453 "SWARM-C (GEOMAGNETIC)" "2013-067C" "ESA" "Polar" 462.0 87.35 93.8 7.63 "OPERATIONAL" 2013 500 "MAGNETOSPHERE SHIELD MONITOR" "Lower Pair Gradiometer Processing" "esa" 110.5 0.0016 90.0 215.5
Add-Sat 59880 "EARTHCARE (CLOUD RADAR)" "2024-105A" "ESA / JAXA" "SSO" 393.0 97.05 92.5 7.67 "OPERATIONAL" 2024 100 "CPR & ATLID LIDAR CLOUDS" "Aerosol-Cloud-Radiation Global Interaction" "esa" 175.0 0.0003 85.0 270.0
Add-Sat 43600 "AEOLUS (DOPPLER WIND LIDAR)" "2018-066A" "ESA" "SSO" 320.0 96.97 90.9 7.71 "OPERATIONAL" 2018 20 "ALADIN UV LASER WIND PROFILES" "Global Atmospheric Wind Dynamics Mapping" "esa" 180.0 0.0005 80.0 260.0

# ------------------------------------------------------------------------------
# 11. ISRO SPACE FLEET - INDIA (25)
# ------------------------------------------------------------------------------
Add-Sat 59800 "NISAR (NASA-ISRO SAR)" "2024-055A" "ISRO / NASA" "SSO" 747.0 98.40 99.8 7.48 "OPERATIONAL" 2024 242 "DUAL-BAND L/S SAR // CLASSIFIED" "Global Ecosystem Disturbance & Cryosphere Dynamics" "isro" 160.0 0.0001 75.0 280.0
Add-Sat 58694 "XPOSAT (POLARIMETER)" "2024-001A" "ISRO" "LEO" 650.0 6.00 97.7 7.53 "OPERATIONAL" 2024 150 "X-RAY POLARIMETRY // SCIENCE" "POLIX & XSPECT Cosmic X-Ray Radiation Geometry" "isro" 45.0 0.0008 50.0 200.0
Add-Sat 58992 "INSAT-3DS (WEATHER RADAR)" "2024-030A" "ISRO" "GEO" 35786.0 0.08 1436.0 3.07 "OPERATIONAL" 2024 10000 "STRATEGIC METEOROLOGY // LIVE" "6-Channel Imager & 19-Channel Atmospheric Sounder" "weather" 0 0.0001 0 74.0
Add-Sat 44804 "CARTOSAT-3 (OPTICAL 25CM)" "2019-081A" "ISRO" "SSO" 505.0 97.50 94.7 7.61 "OPERATIONAL" 2019 16 "VERY HIGH RESOLUTION // DEFENSE" "0.28m Panchromatic High Resolution Reconnaissance" "isro" 45.1 0.0014 120.5 240.1
Add-Sat 51656 "EOS-04 (RISAT-1A SAR)" "2022-013A" "ISRO" "SSO" 529.0 97.52 94.9 7.60 "OPERATIONAL" 2022 500 "ALL-WEATHER C-BAND RADAR" "Synthetic Aperture Radar Ground Intelligence" "isro" 110.4 0.0009 85.2 275.4
Add-Sat 46905 "EOS-01 (RISAT-2BR2)" "2020-081A" "ISRO" "LEO" 575.0 37.00 96.1 7.57 "OPERATIONAL" 2020 400 "DEFENSE RADAR SURVEILLANCE" "X-Band SAR Synthetic Aperture Border Tracking" "isro" 85.0 0.0010 70.0 220.0
Add-Sat 54361 "EOS-06 (OCEANSAT-3)" "2022-158A" "ISRO" "SSO" 743.0 98.28 99.7 7.48 "OPERATIONAL" 2022 1420 "OCEANOGRAPHY & WIND SCATTEROMETER" "Ocean Color Monitor (OCM-3) & Ku-Scatterometer" "isro" 175.0 0.0001 80.0 265.0
Add-Sat 41877 "RESOURCESAT-2A" "2016-074A" "ISRO" "SSO" 821.0 98.72 101.3 7.44 "OPERATIONAL" 2016 740 "MULTI-SPECTRAL RESOURCE MAPPING" "LISS-4 (5.8m), LISS-3 & AWiFS Wide Swath" "isro" 200.0 0.0001 82.0 270.0
Add-Sat 39086 "SARAL (ALTIKA OCEAN)" "2013-009A" "ISRO / CNES" "SSO" 781.0 98.54 100.5 7.46 "OPERATIONAL" 2013 350 "OCEAN SURFACE ALTIMETRY" "Ka-band Radar Altimeter Ocean Topography" "isro" 185.0 0.0002 85.0 260.0
Add-Sat 40930 "ASTROSAT (OBSERVATORY)" "2015-052A" "ISRO" "LEO" 650.0 6.00 97.7 7.53 "OPERATIONAL" 2015 200 "MULTI-WAVELENGTH ASTRONOMY" "Simultaneous Multi-wavelength Cosmic Observations" "isro" 50.0 0.0008 55.0 210.0
Add-Sat 41783 "SCATSAT-1 (SCATTEROMETER)" "2016-059H" "ISRO" "SSO" 720.0 98.10 99.2 7.50 "OPERATIONAL" 2016 1400 "CYCLONE WIND VECTOR TRACKING" "Ku-Band Pencil-Beam Scatterometer Sea Winds" "isro" 190.0 0.0001 78.0 272.0
Add-Sat 39216 "INSAT-3D (METEOROLOGY)" "2013-038A" "ISRO" "GEO" 35786.0 0.10 1436.0 3.07 "OPERATIONAL" 2013 9000 "GEOSTATIONARY WEATHER IMAGER" "South Asian Monsoon & Severe Storm Warning" "weather" 0 0.0001 0 82.0
Add-Sat 41752 "INSAT-3DR (SOUNDER)" "2016-054A" "ISRO" "GEO" 35786.0 0.10 1436.0 3.07 "OPERATIONAL" 2016 9000 "ATMOSPHERIC SOUNDING & SAR" "19-Channel Infrared Sounder Indian Ocean" "weather" 0 0.0001 0 74.0
Add-Sat 40880 "GSAT-6 (S-BAND STRATEGIC)" "2015-041A" "ISRO" "GEO" 35786.0 0.05 1436.0 3.07 "OPERATIONAL" 2015 6000 "STRATEGIC DEFENSE S-BAND" "6-meter Unfurlable Antenna Tactical Secure Voice" "defense" 0 0.0001 0 83.0
Add-Sat 39234 "GSAT-7 (RUKMINI NAVY)" "2013-044A" "ISRO" "GEO" 35786.0 0.05 1436.0 3.07 "OPERATIONAL" 2013 7000 "INDIAN NAVY BLUE WATER FLEET" "Multi-band UHF/C/Ku Maritime Real-Time Command" "defense" 0 0.0001 0 74.0
Add-Sat 43864 "GSAT-7A (AIR FORCE ANGRY BIRD)" "2018-105A" "ISRO" "GEO" 35786.0 0.05 1436.0 3.07 "OPERATIONAL" 2018 7000 "IAF NETWORK-CENTRIC WARFARE" "Ku-Band Air-to-Air Radar & Drone Interlink" "defense" 0 0.0001 0 74.0
Add-Sat 43760 "GSAT-11 (HEAVY BROADBAND)" "2018-100A" "ISRO" "GEO" 35786.0 0.05 1436.0 3.07 "OPERATIONAL" 2018 8000 "MULTI-BEAM HIGH THROUGHPUT" "16 Gbps Ka/Ku-Band Spot Beam Gateway" "telecom" 0 0.0001 0 74.0
Add-Sat 52900 "GSAT-24 (DIRECT BROADCAST)" "2022-067A" "ISRO" "GEO" 35786.0 0.05 1436.0 3.07 "OPERATIONAL" 2022 8000 "COMMERCIAL Ku-BAND PAN-INDIA" "High Powered Direct-To-Home Telecom Payload" "telecom" 0 0.0001 0 83.0
Add-Sat 43694 "GSAT-29 (HIGH-THROUGHPUT)" "2018-089A" "ISRO" "GEO" 35786.0 0.05 1436.0 3.07 "OPERATIONAL" 2018 8000 "OPTICAL & Q/V BAND TESTBED" "Jammu & Kashmir / North-East Strategic Beams" "telecom" 0 0.0001 0 55.0
Add-Sat 57320 "CHANDRAYAAN-3 PROPULSION" "2023-098A" "ISRO" "Lunar" 154000.0 27.50 7200.0 1.05 "OPERATIONAL" 2023 500 "DEEP SPACE // SHAPE SENSOR" "Spectro-polarimetry of Habitable Planet Earth" "lunar" 60.0 0.85 45.0 180.0 $false $true
Add-Sat 57801 "ADITYA-L1 (SOLAR OBSERVATORY)" "2023-132A" "ISRO" "Deep_Space" 1496000.0 0.00 25000.0 0.25 "OPERATIONAL" 2023 1500 "CORONAGRAPH // L1 HALO" "VELC & SUIT Solar Corona Dynamic Eruption Physics" "science" 0 0.0 0 0 $true

# ------------------------------------------------------------------------------
# 12. JAXA & ASIAN SATELLITES (12)
# ------------------------------------------------------------------------------
Add-Sat 38337 "GCOM-W1 (SHIZUKU)" "2012-025A" "JAXA" "SSO" 700.0 98.20 98.7 7.51 "OPERATIONAL" 2012 1450 "AMSR2 MICROWAVE RADIOMETER" "Global Precipitation & Sea Surface Temperature" "jaxa" 185.0 0.0001 80.0 270.0
Add-Sat 43065 "GCOM-C (SHIKISA)" "2017-082A" "JAXA" "SSO" 798.0 98.60 100.8 7.45 "OPERATIONAL" 2017 1150 "SGLI OPTICAL IMAGER" "Radiation Budget & Carbon Cycle Bio-optics" "jaxa" 190.0 0.0001 82.0 268.0
Add-Sat 39766 "ALOS-2 (DAICHI-2 L-BAND SAR)" "2014-029A" "JAXA" "SSO" 628.0 97.90 97.2 7.55 "OPERATIONAL" 2014 350 "PALSAR-2 L-BAND RADAR" "Disaster Response & Tectonic Crustal Displacement" "jaxa" 175.0 0.0001 85.0 275.0
Add-Sat 59900 "ALOS-4 (DAICHI-4 SAR)" "2024-122A" "JAXA" "SSO" 628.0 97.90 97.2 7.55 "OPERATIONAL" 2024 700 "WIDE SWATH L-BAND RADAR" "4x Wider High Resolution Disaster Interferometry" "jaxa" 180.0 0.0001 86.0 274.0
Add-Sat 39574 "GPM CORE OBSERVATORY" "2014-009A" "NASA / JAXA" "LEO" 407.0 65.00 92.7 7.67 "OPERATIONAL" 2014 900 "DUAL-FREQUENCY PRECIP RADAR" "DPR & GMI Global Rainfall & Snowfall Precision" "nasa_earth" 160.0 0.0001 75.0 240.0
Add-Sat 40267 "HIMAWARI-8 (METEOROLOGY)" "2014-060A" "JAXA / JMA" "GEO" 35786.0 0.05 1436.0 3.07 "OPERATIONAL" 2014 10000 "AHI ADVANCED HIMAWARI IMAGER" "Real-Time 10-Minute Asia-Pacific Typhoon Surveillance" "weather" 0 0.0001 0 140.7
Add-Sat 41836 "HIMAWARI-9 (METEOROLOGY)" "2016-064A" "JAXA / JMA" "GEO" 35786.0 0.05 1436.0 3.07 "OPERATIONAL" 2016 10000 "AHI ADVANCED HIMAWARI IMAGER" "Primary Meteorological Geostationary Watch" "weather" 0 0.0001 0 140.7
Add-Sat 57790 "XRISM (X-RAY ASTRONOMY)" "2023-137A" "JAXA / NASA" "LEO" 550.0 31.00 95.6 7.58 "OPERATIONAL" 2023 100 "RESOLVE & X-TEND SPECTROMETER" "High-Resolution X-Ray Microcalorimetry Plasma" "telescopes" 80.0 0.0006 45.0 190.0

# ------------------------------------------------------------------------------
# 13. CLASSIFIED RECONNAISSANCE & DEFENSE INTELLIGENCE (32)
# ------------------------------------------------------------------------------
Add-Sat 37348 "USA-224 (KH-11 KEYHOLE OPTICAL)" "2011-002A" "NRO / USSF" "SSO" 260.0 97.90 89.7 7.75 "OPERATIONAL" 2011 30 "TOP SECRET // LEVEL 9 CLEARANCE" "0.05m Diffraction-limited Optical Imaging" "defense" 120.0 0.0350 45.0 180.0
Add-Sat 39232 "USA-245 (KH-11 BLOCK IV)" "2013-043A" "NRO / USSF" "SSO" 270.0 97.90 89.9 7.74 "OPERATIONAL" 2013 30 "TOP SECRET // LEVEL 9 CLEARANCE" "Real-Time Digital Reconnaissance Electro-Optics" "defense" 160.0 0.0340 50.0 190.0
Add-Sat 43900 "USA-290 (KH-11 SPY SATELLITE)" "2019-004A" "NRO / USSF" "SSO" 390.0 97.90 92.4 7.68 "OPERATIONAL" 2019 35 "TOP SECRET // LEVEL 9 CLEARANCE" "High-Altitude Optical Reconnaissance" "defense" 210.0 0.0150 60.0 220.0
Add-Sat 38343 "USA-314 (TOPAZ RADAR SAR)" "2012-027A" "NRO / USSF" "Retro" 1100.0 123.00 107.2 7.30 "OPERATIONAL" 2012 120 "TOP SECRET // RADAR IMINT" "All-Weather Day/Night Stealth Radar Imaging" "defense" 45.0 0.0010 85.0 140.0
Add-Sat 52200 "USA-326 (CLASSIFIED RECON)" "2022-009A" "NRO / USSF" "SSO" 512.0 97.40 94.8 7.61 "OPERATIONAL" 2022 50 "TOP SECRET // SPECIAL ACTIVITIES" "Classified Electro-Optical Space Domain Maneuver" "defense" 150.0 0.0012 90.0 210.0
Add-Sat 53883 "USA-338 (CLASSIFIED PAYLOAD)" "2022-117A" "NRO / USSF" "LEO" 410.0 51.60 92.7 7.67 "OPERATIONAL" 2022 80 "TOP SECRET // LEVEL 9 CLEARANCE" "Special Reconnaissance & RF Intercept" "defense" 175.0 0.0008 105.0 230.0
Add-Sat 48875 "SBIRS GEO-5 (MISSILE WARNING)" "2021-042A" "US Space Force" "GEO" 35786.0 0.05 1436.0 3.07 "OPERATIONAL" 2021 15000 "DEFENSE EARLY WARNING // TOP" "Scanning & Staring Infrared Ballistic Missile Alert" "defense" 0 0.0001 0 60.0
Add-Sat 53340 "SBIRS GEO-6 (MISSILE WARNING)" "2022-092A" "US Space Force" "GEO" 35786.0 0.05 1436.0 3.07 "OPERATIONAL" 2022 15000 "DEFENSE EARLY WARNING // TOP" "Overhead Persistent Infrared Strategic Surveillance" "defense" 0 0.0001 0 120.0
Add-Sat 57815 "SILENTBARKER (NROL-107 SSA)" "2023-142A" "NRO / USSF" "GEO" 35786.0 0.05 1436.0 3.07 "OPERATIONAL" 2023 20000 "TOP SECRET // GEO SURVEILLANCE" "Space Domain Awareness Watching Geostationary Belt" "defense" 0 0.0001 0 95.0
Add-Sat 40090 "GSSAP-1 (NEIGHBORHOOD WATCH)" "2014-043A" "US Space Force" "GEO" 35850.0 0.15 1436.0 3.07 "OPERATIONAL" 2014 10000 "SPACE DOMAIN AWARENESS" "Drifting Inspector Geosynchronous Inspection" "defense" 12.0 0.0005 30.0 45.0
Add-Sat 40091 "GSSAP-2 (NEIGHBORHOOD WATCH)" "2014-043B" "US Space Force" "GEO" 35850.0 0.15 1436.0 3.07 "OPERATIONAL" 2014 10000 "SPACE DOMAIN AWARENESS" "Drifting Inspector Geosynchronous Inspection" "defense" 15.0 0.0005 35.0 90.0
Add-Sat 41724 "GSSAP-3 (NEIGHBORHOOD WATCH)" "2016-052A" "US Space Force" "GEO" 35850.0 0.15 1436.0 3.07 "OPERATIONAL" 2016 10000 "SPACE DOMAIN AWARENESS" "Optical Space Surveillance & Threat Characterization" "defense" 18.0 0.0005 40.0 135.0
Add-Sat 41725 "GSSAP-4 (NEIGHBORHOOD WATCH)" "2016-052B" "US Space Force" "GEO" 35850.0 0.15 1436.0 3.07 "OPERATIONAL" 2016 10000 "SPACE DOMAIN AWARENESS" "Optical Space Surveillance & Threat Characterization" "defense" 20.0 0.0005 45.0 180.0
Add-Sat 53320 "COSMOS 2558 (SPACE INSPECTOR)" "2022-089A" "VKS Russia" "SSO" 450.0 97.40 93.6 7.64 "OPERATIONAL" 2022 50 "TOP SECRET // COUNTER-SPACE" "Orbital Shadow Co-planar Interception Vehicle" "defense" 149.5 0.0010 88.0 212.0
Add-Sat 52330 "COSMOS 2560 (EMKA-3 RECON)" "2022-135A" "VKS Russia" "SSO" 330.0 96.50 91.1 7.71 "OPERATIONAL" 2022 40 "MILITARY OPTICAL IMINT" "Tactical Battlefield Reconnaissance Mini-Satellite" "defense" 165.0 0.0020 70.0 195.0
Add-Sat 40001 "LOTOS-S1 (ELINT INTERCEPT)" "2014-085A" "VKS Russia" "LEO" 900.0 67.10 103.0 7.41 "OPERATIONAL" 2014 1200 "ELECTRONIC WARFARE // SIGINT" "Naval & Land Military Electronic Radio Interception" "defense" 85.0 0.0005 110.0 240.0
Add-Sat 42900 "YAOGAN-30 TRIPLET 01A" "2017-058A" "PLA China" "LEO" 600.0 35.00 96.7 7.56 "OPERATIONAL" 2017 800 "CLASSIFIED // TRIPLE FORMATION" "RF Emitter Geo-location & Signal Intelligence" "defense" 45.0 0.0006 60.0 120.0
Add-Sat 42901 "YAOGAN-30 TRIPLET 01B" "2017-058B" "PLA China" "LEO" 600.0 35.00 96.7 7.56 "OPERATIONAL" 2017 800 "CLASSIFIED // TRIPLE FORMATION" "TDOA Interferometric Emitter Triangulation" "defense" 45.1 0.0006 60.0 120.5
Add-Sat 42902 "YAOGAN-30 TRIPLET 01C" "2017-058C" "PLA China" "LEO" 600.0 35.00 96.7 7.56 "OPERATIONAL" 2017 800 "CLASSIFIED // TRIPLE FORMATION" "Maritime Naval Carrier Group Tracking" "defense" 45.2 0.0006 60.0 121.0
Add-Sat 50001 "YAOGAN-35 TRIPLET 01A" "2021-102A" "PLA China" "LEO" 500.0 35.00 94.6 7.62 "OPERATIONAL" 2021 600 "RADAR & OPTICAL CLUSTER" "Coordinated Multi-sensor Ocean Reconnaissance" "defense" 90.0 0.0008 75.0 180.0
Add-Sat 50002 "YAOGAN-35 TRIPLET 01B" "2021-102B" "PLA China" "LEO" 500.0 35.00 94.6 7.62 "OPERATIONAL" 2021 600 "RADAR & OPTICAL CLUSTER" "Synthetic Aperture Tactical Target Location" "defense" 90.1 0.0008 75.0 180.5
Add-Sat 50003 "YAOGAN-35 TRIPLET 01C" "2021-102C" "PLA China" "LEO" 500.0 35.00 94.6 7.62 "OPERATIONAL" 2021 600 "RADAR & OPTICAL CLUSTER" "Multi-spectral Land Surface Scanning" "defense" 90.2 0.0008 75.0 181.0
Add-Sat 44703 "GAOFEN-7 (SUB-METER STEREO)" "2019-072A" "CNSA / PLA" "SSO" 500.0 97.40 94.6 7.62 "OPERATIONAL" 2019 20 "HIGH-ACCURACY STEREO MAPPING" "Dual Two-Line Array 0.65m 3D Terrain Extraction" "defense" 135.0 0.0005 85.0 240.0
Add-Sat 43875 "CSO-1 (FRENCH MILITARY OPTICAL)" "2018-106A" "DGA France" "SSO" 800.0 98.60 100.8 7.45 "OPERATIONAL" 2018 25 "VERY HIGH RESOLUTION // NATO" "3D Tactical Reconnaissance & Target Validation" "defense" 160.0 0.0001 80.0 270.0
Add-Sat 47250 "CSO-2 (EXTREME HIGH RES)" "2020-104A" "DGA France" "SSO" 480.0 97.30 94.2 7.63 "OPERATIONAL" 2020 15 "EXTREME RESOLUTION // DEFENSE" "0.20m Identification Grade Optical Intelligence" "defense" 140.0 0.0008 85.0 250.0
Add-Sat 41700 "OFEQ-11 (ISRAEL DEFENSE)" "2016-056A" "IMOD Israel" "Retro" 400.0 142.00 92.5 7.68 "OPERATIONAL" 2016 15 "TOP SECRET // MOSSAD / IDF" "High Resolution Retrograde Imaging" "defense" 30.0 0.0020 40.0 160.0
Add-Sat 45860 "OFEQ-16 (ELECTRO-OPTICAL)" "2020-044A" "IMOD Israel" "Retro" 400.0 142.00 92.5 7.68 "OPERATIONAL" 2020 15 "TOP SECRET // MOSSAD / IDF" "Jupiter Space Camera High Accuracy Intelligence" "defense" 35.0 0.0020 42.0 165.0

# ------------------------------------------------------------------------------
# 14. SCIENTIFIC OBSERVATORIES & DEEP SPACE TELESCOPES (18)
# ------------------------------------------------------------------------------
Add-Sat 20580 "HUBBLE SPACE TELESCOPE" "1990-037B" "NASA" "LEO" 535.0 28.47 95.4 7.59 "OPERATIONAL" 1990 100 "UNCLASSIFIED // SCIENCE" "Deep UV-Optical-NIR Astrophysics" "telescopes" 305.1 0.0003 95.4 180.2
Add-Sat 50463 "JWST (JAMES WEBB)" "2021-130A" "NASA / ESA" "Deep_Space" 1512400.0 0.00 26000.0 0.22 "OPERATIONAL" 2021 10 "DEEP SPACE INFRARED FLAGSHIP" "Early Universe First Stars & Exoplanet Atmospheres" "telescopes" 0 0.0 0 0 $true
Add-Sat 25867 "CHANDRA X-RAY OBSERVATORY" "1999-040B" "NASA" "HEO" 14000.0 28.50 3840.0 4.10 "OPERATIONAL" 1999 50 "HIGH RESOLUTION X-RAY" "Supermassive Black Holes & Supernova Remnants" "telescopes" 110.0 0.7200 45.0 180.0
Add-Sat 33053 "FERMI GAMMA-RAY" "2008-029A" "NASA" "LEO" 550.0 25.60 95.6 7.58 "OPERATIONAL" 2008 2000 "GAMMA-RAY LARGE AREA" "LAT High Energy Photons & Pulsar Gamma Beams" "telescopes" 75.0 0.0010 60.0 200.0
Add-Sat 28485 "SWIFT (NEIL GEHRELS)" "2004-047A" "NASA" "LEO" 580.0 20.60 96.2 7.56 "OPERATIONAL" 2004 1500 "GAMMA-RAY BURST RAPID SLEW" "BAT, XRT & UVOT Relativistic Cosmic Explosions" "telescopes" 60.0 0.0005 50.0 190.0
Add-Sat 43435 "TESS (EXOPLANET SURVEYOR)" "2018-038A" "NASA" "HEO" 108000.0 37.00 19700.0 2.20 "OPERATIONAL" 2018 20000 "ALL-SKY TRANSIT PHOTOMETRY" "2:1 Lunar Resonance Habitable Exoplanet Search" "telescopes" 90.0 0.5500 70.0 160.0
Add-Sat 38358 "NUSTAR (X-RAY TELESCOPE)" "2012-031A" "NASA" "LEO" 605.0 6.00 96.8 7.55 "OPERATIONAL" 2012 50 "HARD X-RAY FOCUSING OPTICS" "10-meter Deployable Mast Black Hole Physics" "telescopes" 40.0 0.0010 45.0 180.0
Add-Sat 57255 "EUCLID (DARK ENERGY)" "2023-092A" "ESA" "Deep_Space" 1500000.0 0.00 26000.0 0.22 "OPERATIONAL" 2023 15 "COSMIC MAPPER // HIGH TRUST" "VIS & NISP 3D Dark Matter & Dark Energy Map" "telescopes" 0 0.0 0 0 $true
Add-Sat 44874 "CHEOPS (EXOPLANET WATCH)" "2019-092G" "ESA" "SSO" 715.0 98.22 99.1 7.50 "OPERATIONAL" 2019 120 "PRECISION PHOTOMETRY // LEVEL 3" "High Precision Optical Transit Photometry" "telescopes" 190.0 0.0001 78.0 270.0
Add-Sat 44432 "SPEKTR-RG (X-RAY OBSERVATORY)" "2019-040A" "Roscosmos / DLR" "Deep_Space" 1500000.0 0.00 26000.0 0.22 "OPERATIONAL" 2019 20 "EROSITA ALL-SKY SURVEY" "100,000 Galaxy Clusters X-Ray Cosmic Web" "telescopes" 0 0.0 0 0 $true

# ------------------------------------------------------------------------------
# 15. AMATEUR RADIO & CUBESATS (12)
# ------------------------------------------------------------------------------
Add-Sat 7530 "AMSAT OSCAR 7 (AO-7)" "1974-089B" "AMSAT" "LEO" 1445.0 101.70 114.7 7.12 "OPERATIONAL" 1974 5000 "LEGENDARY AMATEUR REPEATER" "Mode A & B Worldwide Amateur Radio Comm Relay" "amsat" 145.0 0.0012 90.0 210.0
Add-Sat 43015 "AO-91 (FOX-1B)" "2017-073E" "AMSAT" "LEO" 196.2 97.68 89.2 7.79 "DECAYING" 2017 200 "AMATEUR V/U REPEATER" "Radiation Experiment & FM Voice Uplink" "amsat" 210.0 0.0020 80.0 260.0
Add-Sat 43137 "AO-92 (FOX-1D)" "2018-008B" "AMSAT" "LEO" 490.0 97.40 94.4 7.62 "OPERATIONAL" 2018 300 "AMATEUR U/V TRANSPONDER" "University Radiation Sensor & Voice Transponder" "amsat" 150.0 0.0010 85.0 240.0
Add-Sat 27560 "SO-50 (SAUDISAT-1C)" "2002-058C" "AMSAT" "LEO" 640.0 64.50 97.5 7.54 "OPERATIONAL" 2002 400 "VHF/UHF FM TRANSPONDER" "Global Amateur Satellite Communications" "amsat" 110.0 0.0015 70.0 220.0
Add-Sat 48001 "PLANET SUPERDOVE FLOCK-1" "2021-002A" "Planet Labs" "SSO" 510.0 97.50 94.8 7.61 "OPERATIONAL" 2021 30 "COMMERCIAL DAILY PLANET SCAN" "3m 8-Band Surface Earth Observation CubeSat" "commercial" 130.0 0.0005 80.0 250.0
Add-Sat 48002 "PLANET SUPERDOVE FLOCK-2" "2021-002B" "Planet Labs" "SSO" 510.0 97.50 94.8 7.61 "OPERATIONAL" 2021 30 "COMMERCIAL DAILY PLANET SCAN" "Everywhere On Earth Imaged Every Single Day" "commercial" 130.5 0.0005 80.0 250.5
Add-Sat 48003 "PLANET SUPERDOVE FLOCK-3" "2021-002C" "Planet Labs" "SSO" 510.0 97.50 94.8 7.61 "OPERATIONAL" 2021 30 "COMMERCIAL DAILY PLANET SCAN" "Agriculture & Deforestation Environmental Watch" "commercial" 131.0 0.0005 80.0 251.0
Add-Sat 49001 "SPIRE LEMUR-2 #1 (GNSS-RO)" "2021-065A" "Spire Global" "LEO" 500.0 51.60 94.6 7.62 "OPERATIONAL" 2021 1500 "RADIO OCCULTATION & AIS" "GNSS Atmospheric Sounding & Maritime Ship Tracking" "commercial" 95.0 0.0008 65.0 210.0
Add-Sat 49002 "SPIRE LEMUR-2 #2 (ADS-B)" "2021-065B" "Spire Global" "LEO" 500.0 51.60 94.6 7.62 "OPERATIONAL" 2021 1500 "GLOBAL AVIATION TRACKING" "Space-Based ADS-B Global Flight Trajectory Tracking" "commercial" 95.5 0.0008 65.0 210.5

# ------------------------------------------------------------------------------
# 16. LUNAR & DEEP SPACE INTERPLANETARY PROBES (10)
# ------------------------------------------------------------------------------
Add-Sat 35316 "LRO (LUNAR RECON ORBITER)" "2009-031A" "NASA" "Lunar" 50.0 90.00 113.0 1.63 "OPERATIONAL" 2009 50 "LUNAR SURFACE ATLAS // 0.5M" "LROC Camera High Resolution Polar Water Ice Map" "lunar" 0 0.0010 0 0 $false $true
Add-Sat 53325 "DANURI (KPLO KOREA LUNAR)" "2022-094A" "KARI" "Lunar" 100.0 90.00 118.0 1.60 "OPERATIONAL" 2022 60 "SHADOWCAM POLAR CRATERS" "Permanently Shadowed Lunar Crater Exploration" "lunar" 30.0 0.0010 45.0 90.0 $false $true
Add-Sat 61450 "EUROPA CLIPPER" "2024-184A" "NASA" "Deep_Space" 628000000.0 0.00 180000.0 18.2 "OPERATIONAL" 2024 50 "INTERPLANETARY // JOVIAN OCEAN" "Subsurface Ocean Habitability Exploration" "deepspace" 0 0.0 0 0 $true
Add-Sat 49314 "LUCY (TROJAN ASTEROIDS)" "2021-093A" "NASA" "Deep_Space" 450000000.0 0.00 150000.0 15.5 "OPERATIONAL" 2021 20 "FOSSILS OF PLANET FORMATION" "Jupiter Trojan Swarm Asteroid Flyby Tour" "deepspace" 0 0.0 0 0 $true
Add-Sat 58088 "PSYCHE (METAL WORLD)" "2023-157A" "NASA" "Deep_Space" 370000000.0 0.00 140000.0 16.0 "OPERATIONAL" 2023 20 "M-TYPE METALLIC CORE WORLD" "Exposed Nickel-Iron Planetesimal Core Mission" "deepspace" 0 0.0 0 0 $true
Add-Sat 43666 "BEPICOLOMBO (MPO/MMO)" "2018-080A" "ESA / JAXA" "Deep_Space" 90000000.0 0.00 90000.0 22.0 "OPERATIONAL" 2018 20 "MERCURY DUAL MAGNETOSPHERE" "Dual Spacecraft Hermean Surface & Magnetosphere" "deepspace" 0 0.0 0 0 $true
Add-Sat 45179 "SOLAR ORBITER" "2020-010A" "ESA / NASA" "Deep_Space" 42000000.0 0.00 65000.0 32.0 "OPERATIONAL" 2020 100 "CLOSE HELIOPHYSICS // POLAR" "First Ever High-Latitude Solar Polar Images" "deepspace" 0 0.0 0 0 $true
Add-Sat 43592 "PARKER SOLAR PROBE" "2018-065A" "NASA" "Deep_Space" 6160000.0 0.00 45000.0 176.0 "OPERATIONAL" 2018 100 "TOUCHING THE SUN" "Fastest Human Object Surviving 1400C Solar Corona" "deepspace" 0 0.0 0 0 $true
Add-Sat 10321 "VOYAGER 1 (INTERSTELLAR)" "1977-084A" "NASA" "Deep_Space" 24400000000.0 35.00 999999.0 17.0 "OPERATIONAL" 1977 1 "INTERSTELLAR MEDIUM // 163 AU" "First Human Craft In The Interstellar Deep Void" "deepspace" 0 0.0 0 0 $true
Add-Sat 10271 "VOYAGER 2 (INTERSTELLAR)" "1977-076A" "NASA" "Deep_Space" 20400000000.0 35.00 999999.0 15.4 "OPERATIONAL" 1977 1 "INTERSTELLAR MEDIUM // 136 AU" "Grand Tour Explorer Studying Heliosheath Boundary" "deepspace" 0 0.0 0 0 $true

# ------------------------------------------------------------------------------
# 17. HIGH-RISK RE-ENTRY & ORBITAL DECAY WATCH (8)
# ------------------------------------------------------------------------------
Add-Sat 44713 "STARLINK-1007 (DEORBIT PASS)" "2019-074BA" "SpaceX" "LEO" 188.4 53.05 88.5 7.82 "DECAYING" 2019 300 "CRITICAL DECAY // INTERCEPT" "Active Controlled Re-entry Demise" "decay" 74.5 0.0014 45.1 312.4
Add-Sat 51658 "CZ-5B SPENT STAGE REMNANT" "2021-035B" "CNSA" "LEO" 172.6 41.50 87.8 7.85 "DECAYING" 2021 500 "UNCONTROLLED RE-ENTRY RISK" "Heavy 21-Ton Core Stage Atmospheric Drag Decay" "decay" 210.0 0.0038 80.0 160.0
Add-Sat 22676 "SL-16 SPENT UPPER STAGE" "1993-039B" "Roscosmos" "LEO" 195.0 71.00 88.4 7.80 "DECAYING" 1993 400 "HIGH MASS ROCKET BODY" "Zenit-2 Spent Rocket Body Thermal Disintegration" "decay" 140.0 0.0025 65.0 200.0
Add-Sat 49500 "COSMOS 1408 TRACKABLE DEBRIS" "1982-092DEB" "Unknown" "LEO" 380.0 82.50 92.1 7.69 "DEBRIS" 1982 100 "ASAT TEST DEBRIS CLUSTER" "High Kinetic Fragmentation Risk Corridor" "debris" 110.0 0.0018 75.0 215.0
Add-Sat 27386 "ENVISAT (MASSIVE DERELICT)" "2002-009A" "ESA" "SSO" 768.0 98.50 100.2 7.47 "DERELICT" 2002 1000 "HIGH PRIORITY ADR TARGET" "8-Ton Massive Derelict Active Debris Removal Target" "debris" 180.0 0.0001 82.0 268.0
Add-Sat 31113 "FENGYUN-1C ASAT DEBRIS" "1999-025DEB" "CNSA" "Polar" 845.0 98.80 101.8 7.43 "DEBRIS" 1999 50 "HYPERVELOCITY DEBRIS HAZARD" "Trackable Long-Lived Polar Orbital Fragment" "debris" 215.0 0.0012 90.0 270.0
Add-Sat 37785 "DELTA IV SPENT SECOND STAGE" "2011-036B" "US Space Force" "MEO" 18500.0 55.00 650.0 4.02 "DERELICT" 2011 2000 "GEOSYNCHRONOUS DRIFT BODY" "Cryogenic Stage Expended Fuel Venting Record" "debris" 45.0 0.0080 30.0 120.0
Add-Sat 25545 "FGS VANGUARD TEST REMNANT" "1998-067B" "NASA" "LEO" 412.0 51.64 92.8 7.66 "DEBRIS" 1998 50 "STATION CORRIDOR MONITOR" "Proximity Fragment Monitored by 18th SDS" "debris" 168.0 0.0006 112.0 248.0

Write-Host "Total Compiled Satellites: $($fleet.Count)" -ForegroundColor Green

$json = $fleet | ConvertTo-Json -Depth 6 -Compress
[System.IO.File]::WriteAllText($OutputPath, $json, [System.Text.Encoding]::UTF8)
Write-Host "Successfully wrote $($fleet.Count) satellites to $OutputPath" -ForegroundColor Cyan

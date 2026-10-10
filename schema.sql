-- ==============================================================================
-- GOD'S EYE // ORBITAL - DATABASE SCHEMA DEFINITION & MIGRATION SCRIPT
-- CREATED BY MR SINGH
-- Target Dialects: PostgreSQL 14+ / SQLite 3.35+
-- Component: Autonomous Infiltration, Entity Hash Tracking, Master Catalog & Differential Audit
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. INTEL SOURCES REGISTRY TABLE (12 Dedicated Autonomous Ingestion Feeds)
-- Tracks configured scraping targets, cadences, failure backoff, and circuit states
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS intel_sources (
    source_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    target_url TEXT NOT NULL,
    crawler_type VARCHAR(32) NOT NULL DEFAULT 'REST_API', -- 'RSS', 'HTML', 'REST_API'
    category VARCHAR(64) NOT NULL DEFAULT 'ORBITAL',      -- 'ORBITAL_EPHEMERIS', 'SPACE_SAFETY', 'DEEP_SPACE', 'RF_GROUND_TELEMETRY', 'SPACE_WEATHER', 'EARTH_OBSERVATION'
    poll_interval_sec INTEGER NOT NULL DEFAULT 300,
    rate_limit_ms INTEGER NOT NULL DEFAULT 500,
    circuit_state VARCHAR(16) NOT NULL DEFAULT 'CLOSED', -- 'CLOSED', 'OPEN', 'HALF_OPEN'
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_success_at TIMESTAMP,
    last_failure_at TIMESTAMP,
    last_error_message TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. CANONICAL INTEL RECORDS TABLE
-- Maintains entity hashes (SHA-256), content bodies, and lifecycle states
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS intel_records (
    id VARCHAR(64) PRIMARY KEY,                           -- SHA-256 of canonical_url (shortened)
    source_id VARCHAR(64) REFERENCES intel_sources(source_id) ON DELETE SET NULL,
    source_url TEXT NOT NULL,
    title VARCHAR(512) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'OPERATION',
    content_hash VARCHAR(64) NOT NULL,                    -- SHA-256 of (title + '::' + body)
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',        -- 'ACTIVE', 'PURGED'
    author VARCHAR(255),
    tags TEXT,                                            -- JSON or comma-delimited strings
    media_urls TEXT,                                      -- JSON array of asset links
    first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    purged_at TIMESTAMP
);

-- Performance Indexes for Differential Lookups
CREATE INDEX IF NOT EXISTS idx_intel_records_status_hash 
    ON intel_records (status, content_hash);

CREATE INDEX IF NOT EXISTS idx_intel_records_source_status 
    ON intel_records (source_id, status);

CREATE INDEX IF NOT EXISTS idx_intel_records_last_seen 
    ON intel_records (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_intel_records_category 
    ON intel_records (category);

-- ------------------------------------------------------------------------------
-- 3. MASTER SATELLITE FLEET CATALOG TABLE
-- Comprehensive orbital registry for full-screen exploration & tracking
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS satellite_catalog (
    norad_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    intl_designator VARCHAR(64),
    agency VARCHAR(64) NOT NULL,
    family VARCHAR(64) DEFAULT 'satellites',
    regime VARCHAR(32) NOT NULL DEFAULT 'LEO',            -- 'LEO', 'MEO', 'GEO', 'HEO', 'POLAR', 'SSO', 'LUNAR', 'DEEP_SPACE'
    perigee_km REAL,
    apogee_km REAL,
    altitude_km REAL,
    inclination_deg REAL,
    period_min REAL,
    velocity_kms REAL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPERATIONAL',   -- 'OPERATIONAL', 'DECAYING', 'STANDBY', 'DECOMMISSIONED'
    launch_year INTEGER,
    tle_line1 TEXT,
    tle_line2 TEXT,
    sensor_swath_km REAL DEFAULT 350.0,
    covert_rating VARCHAR(32) DEFAULT 'CLASSIFIED // CONFIDENTIAL',
    science_target TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_satcat_agency_regime 
    ON satellite_catalog (agency, regime);

CREATE INDEX IF NOT EXISTS idx_satcat_status 
    ON satellite_catalog (status);

-- ------------------------------------------------------------------------------
-- 4. ORBITAL DECAY & RE-ENTRY ALERTS TABLE
-- Dedicated interception metrics for decaying payloads (<200km perigee)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orbital_decay_alerts (
    alert_id VARCHAR(64) PRIMARY KEY,
    norad_id INTEGER REFERENCES satellite_catalog(norad_id) ON DELETE CASCADE,
    satellite_name VARCHAR(255) NOT NULL,
    predicted_reentry_epoch TIMESTAMP NOT NULL,
    decay_altitude_km REAL NOT NULL,
    daily_altitude_loss_km REAL DEFAULT 12.4,
    risk_level VARCHAR(32) NOT NULL DEFAULT 'ELEVATED',   -- 'LOW', 'ELEVATED', 'CRITICAL'
    impact_zone_prediction TEXT,
    is_mitigated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orbital_decay_risk 
    ON orbital_decay_alerts (risk_level, predicted_reentry_epoch);

-- ------------------------------------------------------------------------------
-- 5. CONJUNCTION & SPACE SAFETY WARNINGS TABLE
-- Space-Track / 18th SDS close-approach collision monitoring
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conjunction_warnings (
    warning_id VARCHAR(64) PRIMARY KEY,
    primary_norad_id INTEGER,
    primary_name VARCHAR(255) NOT NULL,
    secondary_norad_id INTEGER,
    secondary_name VARCHAR(255) NOT NULL,
    miss_distance_km REAL NOT NULL,
    collision_probability REAL,
    tca_epoch TIMESTAMP NOT NULL,                         -- Time of Closest Approach
    severity VARCHAR(32) NOT NULL DEFAULT 'LOW',          -- 'LOW', 'MEDIUM', 'CRITICAL'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conjunction_tca 
    ON conjunction_warnings (tca_epoch);

-- ------------------------------------------------------------------------------
-- 6. DIFFERENTIAL RECONCILIATION AUDIT REPORTS TABLE
-- Stores run-level metrics for each scheduled ETL infiltration cycle
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS intel_diff_reports (
    report_id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) REFERENCES intel_sources(source_id) ON DELETE CASCADE,
    items_scraped INTEGER NOT NULL DEFAULT 0,
    items_added INTEGER NOT NULL DEFAULT 0,
    items_updated INTEGER NOT NULL DEFAULT 0,
    items_purged INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'SUCCESS',        -- 'SUCCESS', 'PARTIAL', 'FAILED'
    error_summary TEXT,
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_intel_diff_reports_source_time 
    ON intel_diff_reports (source_id, executed_at DESC);

-- ------------------------------------------------------------------------------
-- 7. REAL-TIME AUDIT EVENT STREAM (#hack-terminal sync)
-- Stores chronological event notifications dispatched to WebSockets and HUD terminals
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS intel_audit_events (
    event_id VARCHAR(64) PRIMARY KEY,
    event_type VARCHAR(32) NOT NULL,                      -- 'INTEL_INJECTED', 'INTEL_UPDATED', 'INTEL_PURGED', 'INTEL_HEARTBEAT'
    record_id VARCHAR(64) REFERENCES intel_records(id) ON DELETE SET NULL,
    source_id VARCHAR(64),
    severity VARCHAR(16) NOT NULL DEFAULT 'INFO',         -- 'INFO', 'WARN', 'CRITICAL'
    message TEXT NOT NULL,
    content_hash VARCHAR(64),
    payload_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_intel_audit_events_created 
    ON intel_audit_events (created_at DESC);

-- ------------------------------------------------------------------------------
-- 8. INITIAL SEED DATA (12 Dedicated Autonomous Intelligence Sources)
-- ------------------------------------------------------------------------------
INSERT INTO intel_sources (source_id, name, target_url, crawler_type, category, poll_interval_sec, rate_limit_ms)
VALUES 
    ('celestrak', 'CelesTrak (NORAD GP Ephemeris)', 'https://celestrak.org/columns/rss.xml', 'RSS', 'ORBITAL_EPHEMERIS', 300, 500),
    ('nasa_horizons', 'NASA / JPL Horizons (Deep Space)', 'https://ssd.jpl.nasa.gov', 'REST_API', 'DEEP_SPACE', 300, 500),
    ('esa_copernicus', 'ESA Copernicus & DISCOS Telemetry', 'https://esoc.esa.int', 'REST_API', 'ORBITAL_EPHEMERIS', 300, 500),
    ('isro_netra', 'ISRO Project NETRA & ISTRAC', 'https://www.isro.gov.in', 'REST_API', 'ORBITAL_EPHEMERIS', 300, 500),
    ('spacetrack', 'Space-Track / 18th SDS Safety', 'https://www.space-track.org', 'REST_API', 'SPACE_SAFETY', 300, 500),
    ('noaa_swpc', 'NOAA SWPC Space Weather (Kp/F10.7)', 'https://services.swpc.noaa.gov', 'REST_API', 'SPACE_WEATHER', 300, 500),
    ('satnogs', 'SatNOGS Global Open RF Passes', 'https://network.satnogs.org', 'REST_API', 'RF_GROUND_TELEMETRY', 300, 500),
    ('n2yo', 'N2YO Real-Time Orbital Tracking', 'https://www.n2yo.com', 'REST_API', 'ORBITAL_EPHEMERIS', 300, 500),
    ('amsat', 'AMSAT Radio Amateur Satellite Feed', 'https://www.amsat.org', 'REST_API', 'RF_GROUND_TELEMETRY', 300, 500),
    ('jaxa', 'JAXA Michibiki (QZSS) & Hayabusa', 'https://global.jaxa.jp', 'REST_API', 'ORBITAL_EPHEMERIS', 300, 500),
    ('nasa_earth', 'NASA Earth Observing System (EOS)', 'https://earthdata.nasa.gov', 'REST_API', 'EARTH_OBSERVATION', 300, 500),
    ('orbital_decay', 'Global Re-entry & Orbital Decay Watch', 'http://localhost:8080/api/sources/decay', 'REST_API', 'SPACE_SAFETY', 180, 500)
ON CONFLICT (source_id) DO NOTHING;

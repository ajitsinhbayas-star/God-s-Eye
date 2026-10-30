/**
 * GOD'S EYE ?" VERIFIED SPACE MISSIONS KNOWLEDGEBASE
 * Curated registry of historic, operational, and exploration missions across space agencies.
 * Includes provenance, objectives, target body, launch details, and catalog mappings.
 */

export const VERIFIED_MISSIONS_CATALOG = [
  {
    id: 'mission_iss',
    name: 'International Space Station (ISS) Expedition Program',
    code: 'ISS-EXP',
    agency: 'NASA / Roscosmos / ESA / JAXA / CSA',
    agencyCat: 'multi_agency',
    missionType: 'crewed_station',
    targetBody: 'Earth',
    orbitRegime: 'LEO',
    operationalStatus: 'active',
    launchYear: 1998,
    launchDate: '20 Nov 1998 (Zarya Launch)',
    overview: 'Continuously inhabited orbital microgravity and space environment research laboratory. Assembled across 40+ module launches, operating at ~418 km altitude with 51.6° inclination.',
    scientificGoals: [
      'Human long-duration spaceflight physiology and biology',
      'Microgravity materials science, crystal growth, and fluid physics',
      'Earth observation, atmospheric monitoring, and astrophysics (AMS-02)',
      'Autonomous rendezvous, docking, and robotic extravehicular operations'
    ],
    primaryPayloads: ['Destiny Laboratory', 'Columbus Module', 'Kibo Module', 'Alpha Magnetic Spectrometer (AMS-02)'],
    relatedCatalogObjects: ['iss'],
    provenance: 'NASA / Roscosmos State Corporation / ESA Human Spaceflight'
  },
  {
    id: 'mission_tiangong',
    name: 'Tiangong Space Station (CSS) Construction & Research Program',
    code: 'TSS-CMSA',
    agency: 'CNSA / CMSA',
    agencyCat: 'cnsa',
    missionType: 'crewed_station',
    targetBody: 'Earth',
    orbitRegime: 'LEO',
    operationalStatus: 'active',
    launchYear: 2021,
    launchDate: '29 Apr 2021 (Tianhe Core Module)',
    overview: 'Third-generation modular space station assembled in low Earth orbit between 340 and 450 km at 41.5° inclination, supporting permanent crews of three taikonauts.',
    scientificGoals: [
      'Microgravity combustion, fluid physics, and space life sciences',
      'Cold atomic clock ensembles and quantum physics experiments',
      'Orbital maintenance of co-orbiting Xuntian optical telescope (CSST)',
      'Solar energy conversion and regenerative environmental control'
    ],
    primaryPayloads: ['Tianhe Core Module', 'Wentian Laboratory Module', 'Mengtian Laboratory Module'],
    relatedCatalogObjects: ['tiangong'],
    provenance: 'China Manned Space Agency (CMSA) / CNSA'
  },
  {
    id: 'mission_cartosat3',
    name: 'Cartosat-3 High-Resolution Optical Earth Observation Mission',
    code: 'ISRO-CARTOSAT',
    agency: 'ISRO',
    agencyCat: 'isro',
    missionType: 'earth_observation',
    targetBody: 'Earth',
    orbitRegime: 'LEO',
    operationalStatus: 'active',
    launchYear: 2019,
    launchDate: '27 Nov 2019 (PSLV-C47)',
    overview: 'Ninth satellite in ISRO Cartosat series, delivering 0.28m ground sampling distance panchromatic and 1.12m multispectral imaging from a 509 km Sun-synchronous orbit.',
    scientificGoals: [
      'Large-scale urban planning, cadastre mapping, and infrastructure tracking',
      'Rural resource mapping and land-use change detection',
      'Coastal zone management and disaster assessment',
      'Precision geographical information system (GIS) layers'
    ],
    primaryPayloads: ['Panchromatic & Multispectral High-Resolution Imager (0.28m GSD)'],
    relatedCatalogObjects: ['cartosat3', 'cartosat2f'],
    provenance: 'Indian Space Research Organisation (ISRO) National Remote Sensing Centre'
  },
  {
    id: 'mission_isro_eos',
    name: 'Earth Observation Satellite (EOS) Constellation',
    code: 'ISRO-EOS',
    agency: 'ISRO',
    agencyCat: 'isro',
    missionType: 'earth_observation',
    targetBody: 'Earth',
    orbitRegime: 'LEO',
    operationalStatus: 'active',
    launchYear: 2022,
    launchDate: '14 Feb 2022 (PSLV-C52)',
    overview: 'Synergistic radar and oceanographic satellite fleet. EOS-04 (RISAT-1A) carries C-band Synthetic Aperture Radar for day/night all-weather imagery, while EOS-06 monitors global sea surface temperatures and chlorophyll.',
    scientificGoals: [
      'All-weather day/night radar imaging through monsoon clouds',
      'Agricultural crop yield estimation and soil moisture profiling',
      'Ocean surface vector winds and sea state forecasting',
      'Forestry canopy monitoring and flood inundation extent mapping'
    ],
    primaryPayloads: ['C-band Polarimetric Synthetic Aperture Radar (EOS-04)', 'Ocean Color Monitor (OCM-3, EOS-06)'],
    relatedCatalogObjects: ['eos04', 'eos06'],
    provenance: 'ISRO / Space Applications Centre (SAC), Ahmedabad'
  },
  {
    id: 'mission_aditya_l1',
    name: 'Aditya-L1 Solar Coronagraphy & Heliophysics Observatory',
    code: 'ISRO-ADITYA',
    agency: 'ISRO',
    agencyCat: 'isro',
    missionType: 'solar_physics',
    targetBody: 'Sun-Earth L1',
    orbitRegime: 'L1_HALO',
    operationalStatus: 'active',
    launchYear: 2023,
    launchDate: '2 Sep 2023 (PSLV-C57)',
    overview: 'India\'s premier dedicated solar observatory positioned in a halo orbit around the Sun-Earth Lagrangian point L1 (~1.5 million km from Earth), offering uninterrupted observation of the Sun without eclipses.',
    scientificGoals: [
      'Study coronal heating mechanisms and flare plasma dynamics',
      'Observe initiation and trajectory of Coronal Mass Ejections (CMEs)',
      'Measure in-situ solar wind particle velocity, flux, and magnetic field',
      'Track space weather drivers affecting terrestrial telecommunications and power grids'
    ],
    primaryPayloads: [
      'Visible Emission Line Coronagraph (VELC)',
      'Solar Ultraviolet Imaging Telescope (SUIT)',
      'Aditya Solar wind Particle Experiment (ASPEX)',
      'Plasma Analyser Package for Aditya (PAPA)'
    ],
    relatedCatalogObjects: ['aditya_l1'],
    provenance: 'ISRO / Indian Institute of Astrophysics (IIA)'
  },
  {
    id: 'mission_chandrayaan3',
    name: 'Chandrayaan-3 Lunar South Pole Exploration Mission',
    code: 'ISRO-CHANDRAYAAN',
    agency: 'ISRO',
    agencyCat: 'isro',
    missionType: 'lunar_exploration',
    targetBody: 'Moon',
    orbitRegime: 'LUNAR',
    operationalStatus: 'completed',
    launchYear: 2023,
    launchDate: '14 Jul 2023 (LVM3-M4)',
    overview: 'Historic lunar landing mission that accomplished the world\'s first successful soft landing in the Moon\'s south polar region (Shiv Shakti Point at 69.37° S, 32.35° E) on 23 August 2023.',
    scientificGoals: [
      'Demonstrate safe soft-landing and roving on the lunar south polar terrain',
      'In-situ thermophysical measurements of lunar regolith to 10 cm depth (ChaSTE)',
      'Seismological monitoring of moonquakes and micrometeorite impacts (ILSA)',
      'Elemental composition analysis of lunar soil via laser spectroscopy (LIBS & APXS)'
    ],
    primaryPayloads: ['Vikram Lander', 'Pragyan Rover', 'ChaSTE Thermal Probe', 'ILSA Seismometer', 'LIBS Spectrometer'],
    relatedCatalogObjects: ['chandrayaan3'],
    provenance: 'ISRO / Vikram Sarabhai Space Centre (VSSC) & URSC'
  },
  {
    id: 'mission_jwst',
    name: 'James Webb Space Telescope (JWST) Deep Space Observatory',
    code: 'NASA-ESA-JWST',
    agency: 'NASA / ESA / CSA',
    agencyCat: 'multi_agency',
    missionType: 'deep_space',
    targetBody: 'Sun-Earth L2',
    orbitRegime: 'L2_HALO',
    operationalStatus: 'active',
    launchYear: 2021,
    launchDate: '25 Dec 2021 (Ariane 5 VA256)',
    overview: 'Premier space science observatory featuring a 6.5-meter beryllium primary mirror and five-layer sunshield orbiting the Sun-Earth L2 Lagrange point ~1.5 million km outward from Earth.',
    scientificGoals: [
      'First light and reionization: observe early galaxies formed after the Big Bang',
      'Assembly of galaxies across cosmic cosmic time epochs',
      'Birth of stars and protoplanetary systems obscured by dust',
      'Planetary systems, exoplanet atmospheric transmission spectroscopy, and biosignature searching'
    ],
    primaryPayloads: ['Near-Infrared Camera (NIRCam)', 'Near-Infrared Spectrograph (NIRSpec)', 'Mid-Infrared Instrument (MIRI)'],
    relatedCatalogObjects: ['jwst'],
    provenance: 'NASA Goddard Space Flight Center / Space Telescope Science Institute (STScI)'
  },
  {
    id: 'mission_hubble',
    name: 'Hubble Space Telescope (HST) Astronomical Observatory',
    code: 'NASA-ESA-HST',
    agency: 'NASA / ESA',
    agencyCat: 'nasa',
    missionType: 'space_observatory',
    targetBody: 'Deep Space',
    orbitRegime: 'LEO',
    operationalStatus: 'active',
    launchYear: 1990,
    launchDate: '24 Apr 1990 (STS-31 Discovery)',
    overview: 'Groundbreaking 2.4-meter Ritchey-Chrétien optical/UV space telescope in low Earth orbit (~535 km), continuously serviced through five Space Shuttle missions and active for 34+ years.',
    scientificGoals: [
      'Measure Hubble Constant expansion rate and discover Dark Energy acceleration',
      'Deep Field surveys imaging thousands of distant galaxies in tiny angular fields',
      'Characterize atmospheres of gas giant exoplanets and protoplanetary disks',
      'Monitor outer solar system planetary atmospheres (Jupiter, Saturn, Neptune)'
    ],
    primaryPayloads: ['Wide Field Camera 3 (WFC3)', 'Cosmic Origins Spectrograph (COS)', 'Advanced Camera for Surveys (ACS)'],
    relatedCatalogObjects: ['hubble'],
    provenance: 'NASA GSFC / STScI / ESA Science Data Centre'
  },
  {
    id: 'mission_copernicus_sentinel',
    name: 'Copernicus Sentinel-2 High-Resolution Multi-Spectral Mission',
    code: 'ESA-SENTINEL2',
    agency: 'ESA',
    agencyCat: 'esa',
    missionType: 'earth_observation',
    targetBody: 'Earth',
    orbitRegime: 'LEO',
    operationalStatus: 'active',
    launchYear: 2015,
    launchDate: '23 Jun 2015 (Vega VV05)',
    overview: 'Twin polar-orbiting constellation (Sentinel-2A & 2B) providing 13-band multispectral coverage with 5-day global revisit for European Copernicus Earth observation services.',
    scientificGoals: [
      'Agricultural monitoring, crop chlorophyll, and nitrogen management',
      'Forest canopy health, deforestation monitoring, and wildfire burn scars',
      'Inland water bodies, chlorophyll concentrations, and coastal bathymetry',
      'Glacier retreat, polar ice sheet velocity, and snow cover extent'
    ],
    primaryPayloads: ['MultiSpectral Instrument (MSI) with 13 spectral bands (10m, 20m, 60m resolution)'],
    relatedCatalogObjects: ['sentinel2a'],
    provenance: 'European Space Agency (ESA) Copernicus Open Access Hub'
  },
  {
    id: 'mission_navic',
    name: 'Navigation with Indian Constellation (NavIC / IRNSS)',
    code: 'ISRO-NAVIC',
    agency: 'ISRO',
    agencyCat: 'isro',
    missionType: 'navigation_pnt',
    targetBody: 'Earth',
    orbitRegime: 'GEO',
    operationalStatus: 'active',
    launchYear: 2018,
    launchDate: '12 Apr 2018 (PSLV-C41)',
    overview: 'Independent regional satellite navigation system designed to provide accurate position, velocity, and timing (PVT) over the Indian subcontinent and up to 1,500 km beyond its boundaries.',
    scientificGoals: [
      'Standard Positioning Service (SPS) for civilian positioning (< 10m accuracy)',
      'Restricted Service (RS) encrypted signals for authorized defense applications',
      'Disaster warning dissemination and emergency distress beacon localization',
      'Geodetic crustal deformation monitoring and ionospheric delay modeling'
    ],
    primaryPayloads: ['Atomic Rubidium Clock Standards', 'L5 and S-band Navigation Transmitters', 'C-band Ranging Transponder'],
    relatedCatalogObjects: ['irnss1i'],
    provenance: 'ISRO / Space Applications Centre / ISTRAC Navigation Centre'
  },
  {
    id: 'mission_vanguard',
    name: 'Project Vanguard & Early Geodetic Satellite Survey',
    code: 'USN-VANGUARD',
    agency: 'US Navy / NASA',
    agencyCat: 'nasa',
    missionType: 'space_observatory',
    targetBody: 'Earth',
    orbitRegime: 'MEO',
    operationalStatus: 'inactive',
    launchYear: 1958,
    launchDate: '17 Mar 1958 (Vanguard TV-4)',
    overview: 'The oldest artificial object still orbiting Earth. 1.47 kg aluminum sphere launched during the International Geophysical Year (IGY) that established Earth\'s pear-shaped oblateness.',
    scientificGoals: [
      'Demonstrate solar cells as an orbital power source',
      'Determine Earth\'s oblateness ($J_2$, $J_3$ geopotential harmonics)',
      'Measure upper atmospheric thermospheric density by orbital decay rate'
    ],
    primaryPayloads: ['108 MHz Minitrack radio beacon', 'Thermistor temperature sensors', 'Mercury batteries & solar cells'],
    relatedCatalogObjects: ['vanguard1'],
    provenance: 'US Naval Research Laboratory / NASA Historical Office / Space-Track'
  },
  {
    id: 'mission_debris_cosmos',
    name: 'COSMOS-1408 Fragment Tracked Orbital Debris Cluster',
    code: 'SSA-COSMOS1408',
    agency: 'CIS / 18th SDS Tracking',
    agencyCat: 'commercial',
    missionType: 'space_debris',
    targetBody: 'Earth',
    orbitRegime: 'LEO',
    operationalStatus: 'decayed',
    launchYear: 1982,
    launchDate: '16 Sep 1982 (Tselina-D ELINT Satellite)',
    overview: 'Debris cloud created on 15 November 2021 when the defunct Tselina-D electronic intelligence satellite was destroyed in an anti-satellite (ASAT) missile test at ~480 km altitude.',
    scientificGoals: [
      'Space Situational Awareness (SSA) radar cross section (RCS) tracking',
      'Conjunction screening against International Space Station and commercial constellations',
      'Atmospheric drag deceleration and ballistic coefficient modeling during decay'
    ],
    primaryPayloads: ['Hypervelocity Fragmentation Shrapnel (Tracked by 18th Space Defense Squadron)'],
    relatedCatalogObjects: ['debris_1'],
    provenance: 'US Space Command 18th SDS / CelesTrak SATCAT'
  }
];

import { BaseSourceAdapter, ADAPTER_STATUS } from './base-adapter.js';

export class EsaDiscosAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'esa_discos',
      name: 'ESA Database and Information System Characterising Objects in Space (DISCOS)',
      agency: 'European Space Agency (ESA) Space Debris Office',
      category: 'DEBRIS',
      attribution: 'ESA DISCOS data requires institutional registration and individual API token from ESA Space Debris Office.',
      homepage: 'https://discosweb.esoc.esa.int',
      ttlMs: 24 * 60 * 60 * 1000,
      requiresAuth: true,
      isCommercial: false
    });
    this.status = process.env.ESA_DISCOS_TOKEN ? ADAPTER_STATUS.ACTIVE : ADAPTER_STATUS.NEEDS_CREDENTIALS;
  }
}

export class EuSstAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'eu_sst',
      name: 'EU Space Surveillance and Tracking (EU SST)',
      agency: 'European Union Space Programme Agency (EUSPA)',
      category: 'ORBITAL_ELEMENTS',
      attribution: 'EU SST collision avoidance, fragmentation, and re-entry services require authorized EU user accreditation.',
      homepage: 'https://www.eusst.eu',
      ttlMs: 12 * 60 * 60 * 1000,
      requiresAuth: true,
      isCommercial: false
    });
    this.status = process.env.EU_SST_CREDENTIALS ? ADAPTER_STATUS.ACTIVE : ADAPTER_STATUS.NEEDS_AUTHORIZATION;
  }
}

export class LeoLabsAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'leolabs',
      name: 'LeoLabs Commercial Radar LEO Tracking Service',
      agency: 'LeoLabs Inc. Global Space Radar Network',
      category: 'DEBRIS',
      attribution: 'LeoLabs commercial tracking products require enterprise commercial API subscription.',
      homepage: 'https://www.leolabs.space',
      ttlMs: 15 * 60 * 1000,
      requiresAuth: true,
      isCommercial: true
    });
    this.status = process.env.LEOLABS_API_KEY ? ADAPTER_STATUS.ACTIVE : ADAPTER_STATUS.NOT_CONFIGURED;
  }
}

export class SlingshotAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'slingshot',
      name: 'Slingshot Aerospace Global Sensor Network (Slingshot Beacon)',
      agency: 'Slingshot Aerospace',
      category: 'ORBITAL_ELEMENTS',
      attribution: 'Slingshot Beacon and optical observations require commercial partner agreement.',
      homepage: 'https://slingshotaerospace.com',
      ttlMs: 15 * 60 * 1000,
      requiresAuth: true,
      isCommercial: true
    });
    this.status = process.env.SLINGSHOT_API_KEY ? ADAPTER_STATUS.ACTIVE : ADAPTER_STATUS.NOT_CONFIGURED;
  }
}

export class ComspocAdapter extends BaseSourceAdapter {
  constructor() {
    super({
      id: 'comspoc',
      name: 'COMSPOC Space Operations Center',
      agency: 'COMSPOC Corp.',
      category: 'ORBITAL_ELEMENTS',
      attribution: 'COMSPOC safety of flight and high-accuracy ephemerides require enterprise licensing.',
      homepage: 'https://comspoc.com',
      ttlMs: 15 * 60 * 1000,
      requiresAuth: true,
      isCommercial: true
    });
    this.status = process.env.COMSPOC_API_KEY ? ADAPTER_STATUS.ACTIVE : ADAPTER_STATUS.NOT_CONFIGURED;
  }
}

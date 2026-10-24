import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '../../');
export const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
export const DATA_DIR = path.join(ROOT_DIR, 'data');

export const SPACE_DB_FILE = path.join(DATA_DIR, 'space-db.json');
export const DIAGNOSTICS_FILE = path.join(DATA_DIR, 'diagnostics-db.json');
export const SQLITE_DB_FILE = path.join(DATA_DIR, 'sentinel_command.db');

export const EARTH_CONSTANTS = {
  RADIUS_KM: 6378.137,
  MU_KM3_S2: 398600.4418,
  J2: 1.08263e-3
};

export const PORT = process.env.PORT || 3000;
export const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';

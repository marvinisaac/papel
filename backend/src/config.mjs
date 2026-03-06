import path from 'path';

export const PORT = process.env.PORT || 3000;

// Unified storage directory resolution for Phase 3.
// Prefer PAPEL_DATA_DIR (Phase 3), then legacy DATA_DIR, then default /data.
export const STORAGE_DIR =
  process.env.PAPEL_DATA_DIR || process.env.DATA_DIR || '/data';

export const API_TOKEN = process.env.API_TOKEN || 'dev-token';
export const SALT_FILE = path.join(STORAGE_DIR, 'salt.json');

// Git-related configuration (Phase 3).
export const GIT_REMOTE = process.env.PAPEL_GIT_REMOTE || null;
export const GIT_BRANCH = process.env.PAPEL_GIT_BRANCH || 'main';
export const GIT_AUTO_PUSH =
  (process.env.PAPEL_GIT_AUTO_PUSH || 'false').toLowerCase() === 'true';
export const GIT_PAT = process.env.PAPEL_GIT_PAT || null;

// Snapshot configuration (Option 3).
const SNAPSHOT_MINUTES_RAW =
  process.env.PAPEL_GIT_SNAPSHOT_INTERVAL_MINUTES || '60';
const SNAPSHOT_MINUTES = Number.parseInt(SNAPSHOT_MINUTES_RAW, 10);
export const GIT_SNAPSHOT_INTERVAL_MS =
  Number.isFinite(SNAPSHOT_MINUTES) && SNAPSHOT_MINUTES > 0
    ? SNAPSHOT_MINUTES * 60 * 1000
    : 60 * 60 * 1000;


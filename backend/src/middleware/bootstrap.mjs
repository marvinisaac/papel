import fs from 'fs/promises';

import { DATA_DIR } from '../config.mjs';
import { ensureSalt } from '../services/saltService.mjs';

export async function bootstrap(req, res, next) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await ensureSalt();
    next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to ensure data directory', err);
    res.status(500).json({ error: 'Storage not available' });
  }
}


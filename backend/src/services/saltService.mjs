import fs from 'fs/promises';
import crypto from 'crypto';

import { SALT_FILE } from '../config.mjs';

let backendSaltBase64 = '';

async function loadOrCreateSalt() {
  try {
    const raw = await fs.readFile(SALT_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.salt === 'string') {
      return parsed.salt;
    }
  } catch {
    // fall through to create
  }

  const buf = crypto.randomBytes(16);
  const salt = buf.toString('base64');
  await fs.writeFile(SALT_FILE, JSON.stringify({ salt }), 'utf8');
  return salt;
}

export async function ensureSalt() {
  backendSaltBase64 = await loadOrCreateSalt();
}

export function getSalt() {
  return backendSaltBase64;
}


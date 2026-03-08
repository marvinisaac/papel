/**
 * Standalone script to decrypt encrypted note blobs.
 * Run from the backup repo (cwd = directory containing salt.json and note *.json files).
 * Writes decrypted notes as JSON files into the "decrypted" directory.
 * Uses only Node built-ins: crypto, fs, path.
 *
 * Usage:
 *   PAPEL_PASSPHRASE=secret node decrypt-notes.mjs
 *   node decrypt-notes.mjs --passphrase=secret
 *   node decrypt-notes.mjs --data-dir=/path/to/repo
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const BLOB_VERSION = 1;
const DECRYPTED_DIR = 'decrypted';
const PBKDF2_ITERATIONS = 100_000;
const SALT_FILE = 'salt.json';

function getDataDir() {
  const envDir = process.env.PAPEL_DATA_DIR || process.env.DATA_DIR;
  if (envDir) return path.resolve(envDir);
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg.startsWith('--data-dir=')) {
      return path.resolve(arg.slice('--data-dir='.length));
    }
  }
  return process.cwd();
}

function getPassphrase() {
  const env = process.env.PAPEL_PASSPHRASE;
  if (env) return env;
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg.startsWith('--passphrase=')) {
      return arg.slice('--passphrase='.length);
    }
    if (!arg.startsWith('--')) {
      return arg;
    }
  }
  return null;
}

function parseArgs() {
  const dataDir = getDataDir();
  const passphrase = getPassphrase();
  return { dataDir, passphrase };
}

function fromBase64(encoded) {
  return Buffer.from(encoded, 'base64');
}

function loadSalt(dataDir) {
  const saltPath = path.join(dataDir, SALT_FILE);
  return fs.readFile(saltPath, 'utf8').then((raw) => {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.salt !== 'string') {
      throw new Error(`${SALT_FILE}: invalid format (expected { "salt": "<base64>" })`);
    }
    return fromBase64(parsed.salt);
  });
}

function deriveDataKey(passphrase, salt) {
  const key = crypto.pbkdf2Sync(
    passphrase,
    salt,
    PBKDF2_ITERATIONS,
    64,
    'sha256',
  );
  return key.subarray(32, 64);
}

function decryptBlob(dataKey, blob) {
  if (blob.version !== BLOB_VERSION) {
    throw new Error(`Unsupported blob version: ${blob.version}`);
  }
  const iv = fromBase64(blob.iv);
  const raw = fromBase64(blob.ciphertext);
  const tagLength = 16;
  if (raw.length < tagLength) {
    throw new Error('Ciphertext too short');
  }
  const tag = raw.subarray(-tagLength);
  const ciphertext = raw.subarray(0, -tagLength);
  const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

function isNoteRecord(parsed) {
  return (
    parsed &&
    typeof parsed.blob === 'object' &&
    parsed.blob &&
    typeof parsed.blob.version === 'number' &&
    typeof parsed.blob.iv === 'string' &&
    typeof parsed.blob.ciphertext === 'string'
  );
}

async function listNoteFiles(dataDir) {
  const entries = await fs.readdir(dataDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    if (entry.name === SALT_FILE) continue;
    files.push(path.join(dataDir, entry.name));
  }
  return files;
}

function slugFromTitle(title) {
  const s = String(title ?? '').trim();
  if (s === '') return '';
  return s
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || '';
}

function safeFilenameFromNote(note) {
  const slug = slugFromTitle(note.title);
  const base = slug !== '' ? slug : String(note.id).replace(/[^a-zA-Z0-9-_]/g, '_') || 'note';
  return base;
}

function noteToMarkdown(note) {
  const title = note.title != null && note.title !== '' ? String(note.title) : 'Untitled';
  const content = note.content != null ? String(note.content) : '';
  return `# ${title}\n\n${content}`;
}

async function writeDecryptedNotes(dataDir, notes) {
  const outDir = path.join(dataDir, DECRYPTED_DIR);
  await fs.mkdir(outDir, { recursive: true });
  const countByBase = new Map();
  for (const note of notes) {
    const base = safeFilenameFromNote(note);
    const n = (countByBase.get(base) ?? 0) + 1;
    countByBase.set(base, n);
    const name = n === 1 ? `${base}.md` : `${base}-${n}.md`;
    const filePath = path.join(outDir, name);
    await fs.writeFile(filePath, noteToMarkdown(note), 'utf8');
  }
}

async function decryptAll(dataDir, passphrase) {
  const salt = await loadSalt(dataDir);
  const dataKey = deriveDataKey(passphrase, salt);
  const noteFiles = await listNoteFiles(dataDir);
  const results = [];
  for (const filePath of noteFiles) {
    const raw = await fs.readFile(filePath, 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // eslint-disable-next-line no-console
      console.error(`[skip] ${path.basename(filePath)}: invalid JSON`);
      continue;
    }
    if (!isNoteRecord(parsed)) {
      // eslint-disable-next-line no-console
      console.error(`[skip] ${path.basename(filePath)}: not a note record`);
      continue;
    }
    try {
      const note = decryptBlob(dataKey, parsed.blob);
      results.push(note);
    } catch (err) {
      // Decrypt failure (e.g. wrong passphrase / auth tag) → fatal
      throw err;
    }
  }
  return results;
}

async function main() {
  const { dataDir, passphrase } = parseArgs();
  if (!passphrase) {
    process.stderr.write('Error: passphrase required. Use PAPEL_PASSPHRASE or --passphrase=...\n');
    process.exit(1);
  }
  try {
    const notes = await decryptAll(dataDir, passphrase);
    await writeDecryptedNotes(dataDir, notes);
    process.stdout.write(`Decrypted ${notes.length} note${notes.length === 1 ? '' : 's'} to ${DECRYPTED_DIR}/\n`);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (msg.includes('ENOENT') && msg.includes(SALT_FILE)) {
      process.stderr.write(`Error: ${SALT_FILE} not found in ${dataDir}\n`);
    } else if (msg.includes('Invalid') || msg.includes('Unsupported') || msg.includes('auth')) {
      process.stderr.write('Error: Invalid passphrase or corrupted data.\n');
    } else {
      process.stderr.write(`Error: ${msg}\n`);
    }
    process.exit(1);
  }
}

main();

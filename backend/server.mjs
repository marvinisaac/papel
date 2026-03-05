import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '/data';
const API_TOKEN = process.env.API_TOKEN || 'dev-token';

const SALT_FILE = path.join(DATA_DIR, 'salt.json');
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

async function ensureSalt() {
  if (!backendSaltBase64) {
    backendSaltBase64 = await loadOrCreateSalt();
  }
}

// Basic CORS for browser frontend
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );
  res.header(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,DELETE,OPTIONS',
  );
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function authenticate(req, res, next) {
  const header = req.header('authorization') || '';
  const [, token] = header.split(' ');

  if (!token || token !== API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

app.use(async (req, res, next) => {
  try {
    await ensureDataDir();
    await ensureSalt();
    next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to ensure data directory', err);
    res.status(500).json({ error: 'Storage not available' });
  }
});

app.use(authenticate);

app.get('/api/salt', (req, res) => {
  res.json({ salt: backendSaltBase64 });
});

function noteFilePath(noteId) {
  const safeId = String(noteId).replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(DATA_DIR, `${safeId}.json`);
}

app.get('/api/notes', async (req, res) => {
  try {
    const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const fullPath = path.join(DATA_DIR, entry.name);
      try {
        const raw = await fs.readFile(fullPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.noteId) {
          results.push({
            noteId: parsed.noteId,
            updatedAt: parsed.updatedAt,
          });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to read note file', fullPath, err);
      }
    }

    res.json(results);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to list notes', err);
    res.status(500).json({ error: 'Failed to list notes' });
  }
});

app.get('/api/notes/:noteId', async (req, res) => {
  const { noteId } = req.params;
  const filePath = noteFilePath(noteId);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.blob) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(parsed.blob);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return res.status(404).json({ error: 'Not found' });
    }
    // eslint-disable-next-line no-console
    console.error('Failed to read note', noteId, err);
    return res.status(500).json({ error: 'Failed to read note' });
  }
});

app.put('/api/notes/:noteId', async (req, res) => {
  const { noteId } = req.params;
  const blob = req.body;

  if (!blob || !blob.noteId || blob.noteId !== noteId) {
    return res.status(400).json({ error: 'Invalid blob payload' });
  }

  const record = {
    noteId: blob.noteId,
    updatedAt: new Date().toISOString(),
    blob,
  };

  const filePath = noteFilePath(noteId);

  try {
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf8');
    return res.status(204).end();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to write note', noteId, err);
    return res.status(500).json({ error: 'Failed to write note' });
  }
});

app.delete('/api/notes/:noteId', async (req, res) => {
  const { noteId } = req.params;
  const filePath = noteFilePath(noteId);

  try {
    await fs.unlink(filePath);
    return res.status(204).end();
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return res.status(204).end();
    }
    // eslint-disable-next-line no-console
    console.error('Failed to delete note', noteId, err);
    return res.status(500).json({ error: 'Failed to delete note' });
  }
});

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${PORT}, data dir: ${DATA_DIR}`);
});


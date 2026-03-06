import fs from 'fs/promises';
import path from 'path';

import { STORAGE_DIR } from '../config.mjs';

export const NoteErrors = {
  NOT_FOUND: 'NOT_FOUND',
};

function noteFilePath(noteId) {
  const safeId = String(noteId).replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(STORAGE_DIR, `${safeId}.json`);
}

export async function listNotes() {
  const entries = await fs.readdir(STORAGE_DIR, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const fullPath = path.join(STORAGE_DIR, entry.name);
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

  return results;
}

export async function readNote(noteId) {
  const filePath = noteFilePath(noteId);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.blob) {
      return { error: NoteErrors.NOT_FOUND };
    }
    return { blob: parsed.blob };
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return { error: NoteErrors.NOT_FOUND };
    }
    throw err;
  }
}

export async function writeNote(blob) {
  const record = {
    noteId: blob.noteId,
    updatedAt: new Date().toISOString(),
    blob,
  };

  const filePath = noteFilePath(blob.noteId);
  await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf8');
}

export async function deleteNote(noteId) {
  const filePath = noteFilePath(noteId);

  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return;
    }
    throw err;
  }
}


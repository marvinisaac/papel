import fs from 'fs/promises';
import path from 'path';

import { STORAGE_DIR } from '../config.mjs';
import {
  ensureRepoInitialized,
  stageNoteChange,
  stageNoteDeletion,
  commitNoteChange,
  pushIfConfigured,
} from './gitService.mjs';

export const NoteErrors = {
  NOT_FOUND: 'NOT_FOUND',
};

function noteFilePath(noteId) {
  const safeId = String(noteId).replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(STORAGE_DIR, `${safeId}.json`);
}

function noteFileRelativePath(noteId) {
  const safeId = String(noteId).replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${safeId}.json`;
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
  await ensureRepoInitialized();

  const record = {
    noteId: blob.noteId,
    updatedAt: new Date().toISOString(),
    blob,
  };

  const filePath = noteFilePath(blob.noteId);

  let existedBefore = false;
  try {
    await fs.access(filePath);
    existedBefore = true;
  } catch {
    existedBefore = false;
  }

  await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf8');

  const relPath = noteFileRelativePath(blob.noteId);
  // Fire-and-forget Git operations; storage success does not depend on them.
  (async () => {
    try {
      await stageNoteChange(relPath, existedBefore);
      const action = existedBefore ? 'updated' : 'created';
      await commitNoteChange(`note ${blob.noteId} ${action}`);
      await pushIfConfigured();
    } catch {
      // Errors are logged inside gitService; do not rethrow.
    }
  })();
}

export async function deleteNote(noteId) {
  await ensureRepoInitialized();

  const filePath = noteFilePath(noteId);
  const relPath = noteFileRelativePath(noteId);

  let existedBefore = true;

  try {
    await fs.unlink(filePath);
    existedBefore = true;
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      existedBefore = false;
      return;
    }
    throw err;
  }

  if (!existedBefore) return;

  (async () => {
    try {
      await stageNoteDeletion(relPath);
      await commitNoteChange(`note ${noteId} deleted`);
      await pushIfConfigured();
    } catch {
      // Errors are logged inside gitService; do not rethrow.
    }
  })();
}


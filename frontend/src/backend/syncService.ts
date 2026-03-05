import type { Note } from '../types/note';
import type { DerivedKeyMaterial } from '../crypto/keys';
import { encryptNote, decryptNote } from '../crypto/encryption';
import {
  fetchEncryptedNotesIndex,
  fetchEncryptedNote,
  putEncryptedNote,
  deleteEncryptedNote,
  BackendNotConfiguredError,
} from './client';
import type { EncryptedNoteMetadata } from './client';
import type { EncryptedNoteBlob } from '../crypto/encryption';
import { isBackendConfigured } from './config';
import { idbClient } from '../storage/indexedDbClient';
import { getNote } from '../storage/noteStore';

type PendingOperation =
  | { kind: 'upsert'; noteId: string }
  | { kind: 'delete'; noteId: string };

const pending: PendingOperation[] = [];

function enqueue(op: PendingOperation) {
  pending.push(op);
}

export function isSyncEnabled(): boolean {
  return isBackendConfigured();
}

export interface InitialSyncResult {
  hadRemoteNotes: boolean;
  decryptedCount: number;
  errorCount: number;
}

export async function initialSync(
  keys: DerivedKeyMaterial,
): Promise<InitialSyncResult> {
  if (!isSyncEnabled()) {
    return { hadRemoteNotes: false, decryptedCount: 0, errorCount: 0 };
  }

  let decryptedCount = 0;
  let errorCount = 0;
  let hadRemoteNotes = false;

  try {
    await flushPending(keys);
  } catch (err) {
    console.error('Failed to flush pending sync operations', err);
  }

  try {
    const index = await fetchEncryptedNotesIndex();
    hadRemoteNotes = index.length > 0;

    for (const meta of index) {
      try {
        const blob = await fetchEncryptedNote(meta.noteId);
        if (!blob) {
          continue;
        }
        const note = await decryptNote(keys, blob);
        await idbClient.put<Note>(note);
        decryptedCount += 1;
      } catch (err) {
        errorCount += 1;
        console.error('Failed to sync note from backend', meta.noteId, err);
      }
    }
  } catch (err) {
    if (err instanceof BackendNotConfiguredError) {
      return { hadRemoteNotes: false, decryptedCount: 0, errorCount: 0 };
    }
    console.error('Initial sync failed', err);
  }

  return { hadRemoteNotes, decryptedCount, errorCount };
}

export async function validatePassphraseForBackend(
  backendUrl: string,
  apiToken: string,
  keys: DerivedKeyMaterial,
): Promise<InitialSyncResult> {
  let decryptedCount = 0;
  let errorCount = 0;
  let hadRemoteNotes = false;

  try {
    const indexUrl = new URL('/api/notes', backendUrl).toString();
    const indexResponse = await fetch(indexUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!indexResponse.ok) {
      throw new Error(
        `Failed to fetch notes index: ${indexResponse.status} ${indexResponse.statusText}`,
      );
    }

    const index = (await indexResponse.json()) as EncryptedNoteMetadata[];
    hadRemoteNotes = index.length > 0;

    for (const meta of index) {
      try {
        const noteUrl = new URL(
          `/api/notes/${encodeURIComponent(meta.noteId)}`,
          backendUrl,
        ).toString();
        const noteResponse = await fetch(noteUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!noteResponse.ok) {
          errorCount += 1;
          continue;
        }

        const blob = (await noteResponse.json()) as EncryptedNoteBlob;
        await decryptNote(keys, blob);
        decryptedCount += 1;
      } catch (err) {
        errorCount += 1;
        console.error('Failed to validate note from backend', meta.noteId, err);
      }
    }
  } catch (err) {
    console.error('Passphrase validation failed', err);
  }

  return { hadRemoteNotes, decryptedCount, errorCount };
}

export async function pushNote(
  noteId: string,
  keys: DerivedKeyMaterial,
): Promise<void> {
  if (!isSyncEnabled()) return;

  try {
    const note = await getNote(noteId);
    if (!note) return;
    const blob = await encryptNote(keys, note);
    await putEncryptedNote(blob);
  } catch (err) {
    if (err instanceof BackendNotConfiguredError) return;
    console.error('Failed to push note to backend, queuing', noteId, err);
    enqueue({ kind: 'upsert', noteId });
  }
}

export async function deleteNoteRemote(noteId: string): Promise<void> {
  if (!isSyncEnabled()) return;

  try {
    await deleteEncryptedNote(noteId);
  } catch (err) {
    if (err instanceof BackendNotConfiguredError) return;
    console.error('Failed to delete note on backend, queuing', noteId, err);
    enqueue({ kind: 'delete', noteId });
  }
}

export async function flushPending(
  keys: DerivedKeyMaterial,
): Promise<void> {
  if (!isSyncEnabled() || pending.length === 0) return;

  const ops = pending.splice(0, pending.length);

  for (const op of ops) {
    if (op.kind === 'upsert') {
      await pushNote(op.noteId, keys).catch((err) => {
        console.error('Retry push failed, re-queueing', op.noteId, err);
        enqueue(op);
      });
    } else if (op.kind === 'delete') {
      await deleteNoteRemote(op.noteId).catch((err) => {
        console.error('Retry delete failed, re-queueing', op.noteId, err);
        enqueue(op);
      });
    }
  }
}


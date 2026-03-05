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

export async function initialSync(keys: DerivedKeyMaterial): Promise<void> {
  if (!isSyncEnabled()) return;

  try {
    await flushPending(keys);
  } catch (err) {
    console.error('Failed to flush pending sync operations', err);
  }

  try {
    const index = await fetchEncryptedNotesIndex();
    for (const meta of index) {
      try {
        const blob = await fetchEncryptedNote(meta.noteId);
        if (!blob) continue;
        const note = await decryptNote(keys, blob);
        await idbClient.put<Note>(note);
      } catch (err) {
        console.error('Failed to sync note from backend', meta.noteId, err);
      }
    }
  } catch (err) {
    if (err instanceof BackendNotConfiguredError) return;
    console.error('Initial sync failed', err);
  }
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


import { idbClient } from './indexedDbClient';
import type { Note } from '../types/note';

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function listNotes(): Promise<Note[]> {
  const notes = await idbClient.getAll<Note>();
  return notes.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getNote(id: string): Promise<Note | undefined> {
  return idbClient.get<Note>(id);
}

export async function createNote(
  partial: Pick<Note, 'title' | 'content'>,
): Promise<Note> {
  const timestamp = nowIso();
  const note: Note = {
    id: createId(),
    title: partial.title,
    content: partial.content,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await idbClient.put(note);
  return note;
}

export async function updateNote(
  id: string,
  patch: Partial<Pick<Note, 'title' | 'content'>>,
): Promise<Note | undefined> {
  const existing = await getNote(id);
  if (!existing) return undefined;

  const updated: Note = {
    ...existing,
    ...patch,
    updatedAt: nowIso(),
  };

  await idbClient.put(updated);
  return updated;
}

export async function deleteNote(id: string): Promise<void> {
  await idbClient.delete(id);
}

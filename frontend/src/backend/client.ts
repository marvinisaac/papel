import type { EncryptedNoteBlob } from '../crypto/encryption';
import { loadBackendConfig } from './config';

export interface EncryptedNoteMetadata {
  noteId: string;
  updatedAt?: string;
}

class BackendNotConfiguredError extends Error {
  constructor() {
    super('Backend is not configured');
  }
}

async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const config = loadBackendConfig();
  if (!config) {
    throw new BackendNotConfiguredError();
  }

  const url = new URL(path, config.baseUrl).toString();

  const headers = new Headers(init?.headers ?? {});
  headers.set('Authorization', `Bearer ${config.apiToken}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Backend request failed (${response.status} ${response.statusText}): ${text}`,
    );
  }

  return response;
}

export async function fetchEncryptedNotesIndex(): Promise<EncryptedNoteMetadata[]> {
  const response = await apiFetch('/api/notes', { method: 'GET' });
  const json = await response.json();
  return json as EncryptedNoteMetadata[];
}

export async function fetchEncryptedNote(
  noteId: string,
): Promise<EncryptedNoteBlob | null> {
  try {
    const response = await apiFetch(`/api/notes/${encodeURIComponent(noteId)}`, {
      method: 'GET',
    });
    const json = await response.json();
    return json as EncryptedNoteBlob;
  } catch (err) {
    if (err instanceof BackendNotConfiguredError) {
      throw err;
    }
    return null;
  }
}

export async function putEncryptedNote(
  blob: EncryptedNoteBlob,
): Promise<void> {
  await apiFetch(`/api/notes/${encodeURIComponent(blob.noteId)}`, {
    method: 'PUT',
    body: JSON.stringify(blob),
  });
}

export async function deleteEncryptedNote(
  noteId: string,
): Promise<void> {
  await apiFetch(`/api/notes/${encodeURIComponent(noteId)}`, {
    method: 'DELETE',
  });
}

export { BackendNotConfiguredError };


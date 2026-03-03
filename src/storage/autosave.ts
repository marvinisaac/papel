import type { Note } from '../types/note';
import { updateNote } from './noteStore';

const pending = new Map<
  string,
  {
    timer: number | null;
    lastPayload: { title: string; content: string };
  }
>();

const DEBOUNCE_MS = 800;

export function queueAutosave(id: string, payload: { title: string; content: string }) {
  const existing = pending.get(id);
  if (existing?.timer != null) {
    clearTimeout(existing.timer);
  }

  const timer = (setTimeout(async () => {
    try {
      await updateNote(id, payload);
    } catch (err) {
      console.error('Autosave failed', err);
    } finally {
      const current = pending.get(id);
      if (current && current.timer === timer) {
        pending.delete(id);
      }
    }
  }, DEBOUNCE_MS) as unknown) as number;

  pending.set(id, { timer, lastPayload: payload });
}

export async function flushAutosave(id: string) {
  const entry = pending.get(id);
  if (!entry) return;
  if (entry.timer != null) {
    clearTimeout(entry.timer);
  }

  pending.delete(id);
  try {
    await updateNote(id, entry.lastPayload);
  } catch (err) {
    console.error('Autosave flush failed', err);
  }
}

import { Router } from 'express';

import {
  listNotes,
  readNote,
  writeNote,
  deleteNote,
  NoteErrors,
} from '../services/notesService.mjs';

const router = Router();

router.get('/notes', async (req, res) => {
  try {
    const notes = await listNotes();
    res.json(notes);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to list notes', err);
    res.status(500).json({ error: 'Failed to list notes' });
  }
});

router.get('/notes/:noteId', async (req, res) => {
  const { noteId } = req.params;

  try {
    const result = await readNote(noteId);
    if (result && result.error === NoteErrors.NOT_FOUND) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.json(result.blob);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to read note', noteId, err);
    return res.status(500).json({ error: 'Failed to read note' });
  }
});

router.put('/notes/:noteId', async (req, res) => {
  const { noteId } = req.params;
  const blob = req.body;

  if (!blob || !blob.noteId || blob.noteId !== noteId) {
    return res.status(400).json({ error: 'Invalid blob payload' });
  }

  try {
    await writeNote(blob);
    return res.status(204).end();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to write note', noteId, err);
    return res.status(500).json({ error: 'Failed to write note' });
  }
});

router.delete('/notes/:noteId', async (req, res) => {
  const { noteId } = req.params;

  try {
    await deleteNote(noteId);
    return res.status(204).end();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete note', noteId, err);
    return res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;


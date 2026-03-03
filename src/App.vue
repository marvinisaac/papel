<template>
  <div class="app-shell">
    <header class="app-header">
      <h1>Papel Offline MVP</h1>
    </header>
    <main class="app-main">
      <div class="layout">
        <NoteList
          :notes="notes"
          :selected-id="selectedId"
          @create="handleCreate"
          @select="handleSelect"
          @delete="handleDelete"
        />
        <NoteEditor
          :note-id="selectedId"
          :title="currentNote?.title ?? ''"
          :content="currentNote?.content ?? ''"
          @update-local="handleUpdateLocal"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import NoteList from './components/NoteList.vue';
import NoteEditor from './components/NoteEditor.vue';
import type { Note } from './types/note';
import { listNotes, createNote, deleteNote } from './storage/noteStore';

const notes = ref<Note[]>([]);
const selectedId = ref<string | null>(null);

const currentNote = computed(() =>
  notes.value.find((n) => n.id === selectedId.value) ?? null,
);

async function loadNotes() {
  notes.value = await listNotes();
  if (!selectedId.value && notes.value.length) {
    selectedId.value = notes.value[0].id;
  }
}

onMounted(() => {
  loadNotes().catch((err) => {
    console.error('Failed to load notes', err);
  });
});

async function handleCreate() {
  try {
    const note = await createNote({ title: 'Untitled note', content: '' });
    notes.value = [note, ...notes.value];
    selectedId.value = note.id;
  } catch (err) {
    console.error('Failed to create note', err);
  }
}

function handleSelect(id: string) {
  selectedId.value = id;
}

async function handleDelete(id: string) {
  if (!confirm('Delete this note?')) return;
  try {
    await deleteNote(id);
    notes.value = notes.value.filter((n) => n.id !== id);
    if (selectedId.value === id) {
      selectedId.value = notes.value[0]?.id ?? null;
    }
  } catch (err) {
    console.error('Failed to delete note', err);
  }
}

function handleUpdateLocal(payload: { id: string; title: string; content: string }) {
  const idx = notes.value.findIndex((n) => n.id === payload.id);
  if (idx === -1) return;
  const existing = notes.value[idx];
  const updated: Note = {
    ...existing,
    title: payload.title,
    content: payload.content,
  };
  notes.value.splice(idx, 1, updated);
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
    sans-serif;
}

.app-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.app-main {
  flex: 1;
  padding: 0;
}

.layout {
  display: flex;
  height: calc(100vh - 64px);
}
</style>

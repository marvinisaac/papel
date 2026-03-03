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
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NoteList from './components/NoteList.vue';
import NoteEditor from './components/NoteEditor.vue';
import type { Note } from './types/note';
import { listNotes, createNote, deleteNote } from './storage/noteStore';

const notes = ref<Note[]>([]);
const selectedId = ref<string | null>(null);

const route = useRoute();
const router = useRouter();

const currentNote = computed(() =>
  notes.value.find((n) => n.id === selectedId.value) ?? null,
);

async function loadNotes() {
  notes.value = await listNotes();
  const routeId = route.params.id as string | undefined;
  if (routeId && notes.value.some((n) => n.id === routeId)) {
    selectedId.value = routeId;
  } else if (notes.value.length) {
    selectedId.value = notes.value[0].id;
    await router.replace({ name: 'note', params: { id: selectedId.value } });
  } else {
    selectedId.value = null;
  }
}

onMounted(() => {
  loadNotes().catch((err) => {
    console.error('Failed to load notes', err);
  });
});

watch(
  () => route.params.id as string | undefined,
  (id) => {
    if (!id) return;
    if (notes.value.some((n) => n.id === id)) {
      selectedId.value = id;
    }
  },
);

async function handleCreate() {
  try {
    const note = await createNote({ title: 'Untitled note', content: '' });
    notes.value = [note, ...notes.value];
    selectedId.value = note.id;
    await router.push({ name: 'note', params: { id: note.id } });
  } catch (err) {
    console.error('Failed to create note', err);
  }
}

function handleSelect(id: string) {
  selectedId.value = id;
  void router.push({ name: 'note', params: { id } });
}

async function handleDelete(id: string) {
  if (!confirm('Delete this note?')) return;
  try {
    await deleteNote(id);
    notes.value = notes.value.filter((n) => n.id !== id);
    if (selectedId.value === id) {
      const next = notes.value[0];
      selectedId.value = next?.id ?? null;
      if (next) {
        await router.push({ name: 'note', params: { id: next.id } });
      } else {
        await router.push({ name: 'home' });
      }
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

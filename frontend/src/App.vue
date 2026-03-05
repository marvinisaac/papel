<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-header__title">
        <h1>Papel Offline MVP</h1>
        <div class="sync-indicator">
          <span
            :class="['sync-indicator__dot', { 'sync-indicator__dot--active': syncConfigured }]"
          ></span>
          <span class="sync-indicator__text">
            {{ syncConfigured ? 'Sync configured' : 'Sync off' }}
          </span>
        </div>
      </div>
      <div class="app-header__actions">
        <ImportExportBar @import-files="handleImport" @export-all="handleExportAll" />
        <button type="button" class="sync-button" @click="showSyncSettings = true">
          Sync settings
        </button>
      </div>
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
    <SyncSettings
      v-if="showSyncSettings"
      :status-message="syncStatusMessage"
      @close="showSyncSettings = false"
      @save="handleSaveSyncSettings"
      @disable="handleDisableSync"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import NoteList from './components/NoteList.vue';
import NoteEditor from './components/NoteEditor.vue';
import ImportExportBar from './components/ImportExportBar.vue';
import SyncSettings from './components/SyncSettings.vue';
import type { Note } from './types/note';
import { listNotes, createNote, deleteNote } from './storage/noteStore';
import { flushAutosave } from './storage/autosave';
import { registerGlobalShortcuts } from './shortcuts';
import { loadBackendConfig, saveBackendConfig, clearBackendConfig } from './backend/config';

const notes = ref<Note[]>([]);
const selectedId = ref<string | null>(null);
const showSyncSettings = ref(false);
const syncStatusMessage = ref<string | null>(null);

const route = useRoute();
const router = useRouter();

const currentNote = computed(() =>
  notes.value.find((n) => n.id === selectedId.value) ?? null,
);

const syncConfigured = computed(() => !!loadBackendConfig());

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

  const unregister = registerGlobalShortcuts({
    newNote: () => {
      void handleCreate();
    },
    saveNote: () => {
      if (selectedId.value) {
        void flushAutosave(selectedId.value);
      }
    },
  });

  onBeforeUnmount(() => {
    unregister();
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

async function handleImport(files: FileList) {
  const imported: Note[] = [];
  for (const file of Array.from(files)) {
    if (!file.name.endsWith('.md')) continue;
    const content = await file.text();
    const title = file.name.replace(/\.md$/i, '');
    const note = await createNote({ title, content });
    imported.push(note);
  }
  if (imported.length) {
    notes.value = [...imported, ...notes.value];
    selectedId.value = imported[0].id;
    await router.push({ name: 'note', params: { id: imported[0].id } });
  }
}

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'note'
  );
}

async function handleExportAll() {
  if (!notes.value.length) return;
  const zip = new JSZip();
  notes.value.forEach((note) => {
    const base = slugify(note.title || 'untitled-note');
    const filename = `${base}-${note.id.slice(0, 8)}.md`;
    zip.file(filename, note.content || '');
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'papel-notes.zip');
}

function handleSaveSyncSettings(payload: {
  backendUrl: string;
  apiToken: string;
  passphrase: string;
}) {
  if (!payload.backendUrl || !payload.apiToken) {
    syncStatusMessage.value = 'Backend URL and API token are required.';
    return;
  }

  saveBackendConfig({
    baseUrl: payload.backendUrl,
    apiToken: payload.apiToken,
  });
  syncStatusMessage.value = 'Sync settings saved. Enter your passphrase again next session to enable encryption.';
  showSyncSettings.value = false;
}

function handleDisableSync() {
  clearBackendConfig();
  syncStatusMessage.value = 'Sync disabled. Existing encrypted data on the backend is untouched.';
  showSyncSettings.value = false;
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
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-header__title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.app-header__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sync-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: #6b7280;
}

.sync-indicator__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: #9ca3af;
}

.sync-indicator__dot--active {
  background: #22c55e;
}

.sync-indicator__text {
  white-space: nowrap;
}

.sync-button {
  padding: 0.35rem 0.7rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  background: white;
  font-size: 0.8rem;
  cursor: pointer;
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

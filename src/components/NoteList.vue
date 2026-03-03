<template>
  <aside class="note-list">
    <header class="note-list__header">
      <button class="primary" type="button" @click="$emit('create')">
        New note
      </button>
    </header>
    <ul class="note-list__items">
      <li
        v-for="note in notes"
        :key="note.id"
        :class="['note-list__item', { 'note-list__item--active': note.id === selectedId }]"
        @click="$emit('select', note.id)"
      >
        <div class="note-list__title">{{ note.title || 'Untitled note' }}</div>
        <div class="note-list__meta">{{ formatDate(note.updatedAt) }}</div>
        <button
          class="note-list__delete"
          type="button"
          @click.stop="$emit('delete', note.id)"
        >
          Delete
        </button>
      </li>
      <li v-if="!notes.length" class="note-list__empty">No notes yet.</li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import type { Note } from '../types/note';

defineProps<{
  notes: Note[];
  selectedId: string | null;
}>();

defineEmits<{
  (e: 'create'): void;
  (e: 'select', id: string): void;
  (e: 'delete', id: string): void;
}>();

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}
</script>

<style scoped>
.note-list {
  width: 260px;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.note-list__header {
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.primary {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border-radius: 0.4rem;
  border: none;
  background: #2563eb;
  color: white;
  font-size: 0.875rem;
  cursor: pointer;
}

.note-list__items {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.note-list__item {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.note-list__item--active {
  background: #e5f0ff;
}

.note-list__title {
  font-size: 0.9rem;
  font-weight: 500;
}

.note-list__meta {
  font-size: 0.75rem;
  color: #6b7280;
}

.note-list__delete {
  align-self: flex-start;
  margin-top: 0.2rem;
  padding: 0.2rem 0.4rem;
  font-size: 0.7rem;
}

.note-list__empty {
  padding: 0.75rem;
  font-size: 0.85rem;
  color: #6b7280;
}
</style>

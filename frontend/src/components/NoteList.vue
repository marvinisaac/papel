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
    (e: 'open-settings'): void;
  }>();
</script>

<template>
  <aside class="note-list">
    <header class="note-list__header">
      <button type="button" class="note-list__icon-btn" @click="$emit('open-settings')" title="Settings">
        ⚙️
      </button>
      <span class="note-list__icon-placeholder" title="Search">🔍</span>
      <button type="button" class="note-list__new-btn" @click="$emit('create')">
        ➕ New
      </button>
    </header>
    <ul class="note-list__items">
      <li
        v-for="note in notes"
        :key="note.id"
        :class="['note-list__item', { 'note-list__item--active': note.id === selectedId }]"
        @click="$emit('select', note.id)"
      >
        <span class="note-list__title">{{ note.title || 'Untitled note' }}</span>
        <button
          type="button"
          class="note-list__delete"
          aria-label="Delete note"
          @click.stop="$emit('delete', note.id)"
        >
          🗑️
        </button>
      </li>
      <li v-if="!notes.length" class="note-list__empty">No notes yet.</li>
    </ul>
  </aside>
</template>

<style scoped>
  .note-list {
    width: 260px;
    border-right: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    background: var(--bg-sidebar);
  }

  .note-list__header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .note-list__icon-btn {
    padding: 0.35rem;
    border: none;
    border-radius: 0.35rem;
    background: transparent;
    font-size: 0.9rem;
    cursor: pointer;
    line-height: 1;
    color: var(--text-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.8rem;
    height: 1.8rem;
  }

  .note-list__icon-btn:hover {
    background: var(--bg-active);
    color: var(--text-accent);
  }

  .note-list__icon-placeholder {
    font-size: 0.9rem;
    opacity: 0.8;
    line-height: 1;
    color: var(--text-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.8rem;
    height: 1.8rem;
  }

  .note-list__new-btn {
    margin-left: auto;
    padding: 0.4rem 0.8rem;
    border-radius: 0.4rem;
    border: 1px solid var(--border-subtle);
    background: var(--accent-primary);
    color: var(--text-accent);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .note-list__new-btn:hover {
    background: var(--accent-primary-soft);
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
    border-bottom: 1px solid var(--border-subtle);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .note-list__item--active {
    background: var(--bg-active);
  }

  .note-list__title {
    flex: 1;
    font-size: 0.9rem;
    font-weight: 500;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-normal);
  }

  .note-list__delete {
    flex-shrink: 0;
    padding: 0.2rem;
    border: none;
    border-radius: 0.25rem;
    background: transparent;
    font-size: 0.9rem;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s;
    color: var(--text-muted);
  }

  .note-list__item:hover .note-list__delete {
    opacity: 1;
  }

  .note-list__delete:hover {
    background: var(--danger-bg);
  }

  .note-list__empty {
    padding: 0.75rem;
    font-size: 0.85rem;
    color: var(--text-muted);
  }
</style>

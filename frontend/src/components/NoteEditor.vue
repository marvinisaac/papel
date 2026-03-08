<script setup lang="ts">
  import { watch, ref, computed, onBeforeUnmount } from 'vue';
  import { marked } from 'marked';
  import { queueAutosave, flushAutosave } from '../storage/autosave';

  const props = defineProps<{
    noteId: string | null;
    title: string;
    content: string;
    syncConfigured?: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'update-local', payload: { id: string; title: string; content: string }): void;
  }>();

  const draftTitle = ref<string>(props.title);
  const draftContent = ref<string>(props.content);
  const activeTab = ref<'write' | 'preview'>('write');
  const isEditingTitle = ref(false);

  watch(
    () => [props.title, props.content, props.noteId],
    ([title, content]) => {
      draftTitle.value = title ?? '';
      draftContent.value = content ?? '';
    },
  );

  watch(
    () => [draftTitle.value, draftContent.value, props.noteId],
    ([title, content, id]) => {
      if (!id) return;
      emit('update-local', { id, title: title ?? '', content: content ?? '' });
      queueAutosave(id, { title: title ?? '', content: content ?? '' });
    },
  );

  onBeforeUnmount(() => {
    if (props.noteId) {
      void flushAutosave(props.noteId);
    }
  });

  const renderedMarkdown = computed(() => {
    return marked.parse(draftContent.value || '');
  });
</script>

<template>
  <section class="note-editor" v-if="noteId">
    <header class="note-editor__header">
      <div
        class="note-editor__title-group"
        :class="{ 'note-editor__title-group--editing': isEditingTitle }"
      >
        <button
          type="button"
          class="note-editor__title-edit"
          @click="isEditingTitle = !isEditingTitle"
        >
          {{ isEditingTitle ? '✔︎' : '✏️' }}
        </button>
        <template v-if="isEditingTitle">
          <input
            v-model="draftTitle"
            type="text"
            class="note-editor__title"
            placeholder="Untitled note"
          />
        </template>
        <template v-else>
          <span class="note-editor__title-text">
            {{ draftTitle || 'Untitled note' }}
          </span>
          <span
            class="note-editor__sync-dot"
            :class="{ 'note-editor__sync-dot--configured': syncConfigured }"
            :title="syncConfigured ? 'Sync configured' : 'Sync off'"
          />
        </template>
      </div>
      <button
        type="button"
        class="note-editor__preview-toggle"
        :class="{ 'note-editor__preview-toggle--active': activeTab === 'preview' }"
        @click="activeTab = activeTab === 'preview' ? 'write' : 'preview'"
      >
        <span v-if="activeTab !== 'preview'" class="note-editor__preview-emoji">🙈</span>
        <span>Preview</span>
      </button>
    </header>
    <div class="note-editor__content">
      <textarea
        v-model="draftContent"
        class="note-editor__body"
        :class="{ 'note-editor__body--single': activeTab === 'write' }"
        placeholder="Start writing in Markdown..."
      />
      <div
        v-if="activeTab === 'preview'"
        class="note-editor__preview markdown-body"
        v-html="renderedMarkdown"
      />
    </div>
  </section>
  <section v-else class="note-editor note-editor--empty">
    <p>Select a note or create a new one to get started.</p>
  </section>
</template>

<style scoped>
  .note-editor {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .note-editor__content {
    flex: 1;
    display: flex;
    min-height: 0;
  }

  .note-editor__header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--bg-elevated);
  }

  .note-editor__title-group {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
  }

  .note-editor__title {
    font-size: 1.2rem;
    font-weight: 500;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text-accent);
    text-align: center;
    min-width: 0;
  }

  .note-editor__title-text {
    font-size: 1.1rem;
    font-weight: 500;
    color: var(--text-accent);
    white-space: nowrap;
  }

  .note-editor__title-edit {
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0.1rem 0.3rem;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.8rem;
    height: 1.8rem;
  }

  .note-editor__title-group--editing {
    justify-content: center;
  }

  .note-editor__sync-dot {
    flex-shrink: 0;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 999px;
    background: var(--sync-off);
    margin-left: 0.15rem;
  }

  .note-editor__sync-dot--configured {
    background: var(--sync-on);
  }

  .note-editor__preview-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border-radius: 999px;
    border: 1px solid var(--border-subtle);
    padding: 0.4rem 0.8rem;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.8rem;
    cursor: pointer;
    line-height: 1;
  }

  .note-editor__preview-toggle--active {
    background: #16a34a;
    color: var(--text-accent);
    box-shadow: 0 0 0 1px var(--accent-primary-soft);
  }

  .note-editor__preview-emoji {
    font-size: 0.9rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.1rem;
    height: 1.1rem;
  }

  .note-editor__body {
    flex: 1;
    border: none;
    resize: none;
    padding: 1rem;
    font-family: var(--font-mono);
    font-size: 0.95rem;
    line-height: 1.5;
    outline: none;
    background: var(--bg-editor);
    color: var(--text-normal);
    padding-bottom: 50vh;
  }

  .note-editor__body--single {
    max-width: 720px;
    margin: 0 auto;
  }

  .note-editor__preview {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    background: var(--bg-editor);
    border-left: 1px solid var(--border-subtle);
    padding-bottom: 50vh;
  }

  .note-editor--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }
</style>

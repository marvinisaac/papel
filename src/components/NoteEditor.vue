<template>
  <section class="note-editor" v-if="noteId">
    <header class="note-editor__header">
      <input
        v-model="draftTitle"
        type="text"
        class="note-editor__title"
        placeholder="Untitled note"
      />
      <nav class="note-editor__tabs">
        <button
          type="button"
          :class="['tab', { 'tab--active': activeTab === 'write' }]"
          @click="activeTab = 'write'"
        >
          Write
        </button>
        <button
          type="button"
          :class="['tab', { 'tab--active': activeTab === 'preview' }]"
          @click="activeTab = 'preview'"
        >
          Preview
        </button>
      </nav>
    </header>
    <textarea
      v-if="activeTab === 'write'"
      v-model="draftContent"
      class="note-editor__body"
      placeholder="Start writing in Markdown..."
    />
    <div v-else class="note-editor__preview" v-html="renderedMarkdown" />
  </section>
  <section v-else class="note-editor note-editor--empty">
    <p>Select a note or create a new one to get started.</p>
  </section>
</template>

<script setup lang="ts">
import { watch, ref, computed } from 'vue';
import { marked } from 'marked';

const props = defineProps<{
  noteId: string | null;
  title: string;
  content: string;
}>();

const emit = defineEmits<{
  (e: 'update', payload: { id: string; title: string; content: string }): void;
}>();

const draftTitle = ref(props.title);
const draftContent = ref(props.content);
const activeTab = ref<'write' | 'preview'>('write');

watch(
  () => [props.title, props.content],
  ([title, content]) => {
    draftTitle.value = title;
    draftContent.value = content;
  },
);

watch(
  () => [draftTitle.value, draftContent.value, props.noteId],
  ([title, content, id]) => {
    if (!id) return;
    emit('update', { id, title, content });
  },
);

const renderedMarkdown = computed(() => {
  return marked.parse(draftContent.value || '');
});
</script>

<style scoped>
.note-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.note-editor__header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.note-editor__title {
  flex: 1;
  font-size: 1.2rem;
  font-weight: 500;
  border: none;
  outline: none;
  background: transparent;
}

.note-editor__tabs {
  display: inline-flex;
  gap: 0.25rem;
  background: #f3f4f6;
  border-radius: 999px;
  padding: 0.1rem;
}

.tab {
  border: none;
  background: transparent;
  padding: 0.2rem 0.8rem;
  border-radius: 999px;
  font-size: 0.8rem;
  cursor: pointer;
}

.tab--active {
  background: white;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.note-editor__body {
  flex: 1;
  border: none;
  resize: none;
  padding: 1rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
  font-size: 0.95rem;
  line-height: 1.5;
  outline: none;
  background: white;
}

.note-editor__preview {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  background: white;
}

.note-editor--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}
</style>

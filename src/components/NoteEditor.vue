<template>
  <section class="note-editor" v-if="noteId">
    <header class="note-editor__header">
      <input
        v-model="draftTitle"
        type="text"
        class="note-editor__title"
        placeholder="Untitled note"
      />
    </header>
    <textarea
      v-model="draftContent"
      class="note-editor__body"
      placeholder="Start writing in Markdown..."
    />
  </section>
  <section v-else class="note-editor note-editor--empty">
    <p>Select a note or create a new one to get started.</p>
  </section>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue';

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
}

.note-editor__title {
  width: 100%;
  font-size: 1.2rem;
  font-weight: 500;
  border: none;
  outline: none;
  background: transparent;
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

.note-editor--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}
</style>

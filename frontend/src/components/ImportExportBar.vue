<template>
  <div class="bar">
    <label class="import-button">
      Import Markdown
      <input
        ref="fileInput"
        type="file"
        accept=".md,text/markdown"
        multiple
        @change="onFilesSelected"
      />
    </label>
    <button type="button" class="secondary" @click="$emit('export-all')">
      Export all notes
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'import-files', files: FileList): void;
  (e: 'export-all'): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);

function onFilesSelected(event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (target?.files && target.files.length) {
    emit('import-files', target.files);
  }
  if (target) {
    target.value = '';
  }
}
</script>

<style scoped>
.bar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.import-button {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.8rem;
  border-radius: 0.4rem;
  background: var(--bg-active);
  color: var(--text-accent);
  font-size: 0.8rem;
  cursor: pointer;
}

.import-button input[type='file'] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.secondary {
  padding: 0.4rem 0.8rem;
  border-radius: 0.4rem;
  border: 1px solid var(--border-subtle);
  background: transparent;
  font-size: 0.8rem;
  cursor: pointer;
  color: var(--text-normal);
}
</style>

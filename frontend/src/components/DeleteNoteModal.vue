<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

  const props = defineProps<{
    note: { id: string; title: string } | null;
  }>();

  const emit = defineEmits<{
    (e: 'cancel'): void;
    (e: 'confirm'): void;
  }>();

  const step = ref(1);

  const displayTitle = computed(() => {
    const t = props.note?.title?.trim();
    return t ? `"${t}"` : 'this note';
  });

  watch(
    () => props.note,
    (n) => {
      if (n) step.value = 1;
    },
  );

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && props.note) emit('cancel');
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown);
  });
</script>

<template>
  <div v-if="note" class="delete-modal-overlay" @click.self="$emit('cancel')">
    <div class="delete-modal" role="dialog" aria-labelledby="delete-modal-title" aria-modal="true">
      <p :id="step === 1 ? 'delete-modal-title' : undefined" class="delete-modal__message">
        <template v-if="step === 1">
          Delete {{ displayTitle }}?
        </template>
        <template v-else>
          Are you sure? Unless it has been backed up via git, this note will be lost forever.
        </template>
      </p>
      <div class="delete-modal__actions">
        <button
          type="button"
          class="delete-modal__btn delete-modal__btn--secondary"
          @click="$emit('cancel')"
        >
          Cancel
        </button>
        <button
          v-if="step === 1"
          type="button"
          class="delete-modal__btn delete-modal__btn--danger"
          @click="step = 2"
        >
          Delete
        </button>
        <button
          v-else
          type="button"
          class="delete-modal__btn delete-modal__btn--danger"
          @click="$emit('confirm')"
        >
          Delete forever
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .delete-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 40;
  }

  .delete-modal {
    width: 380px;
    max-width: calc(100% - 2rem);
    background: var(--bg-elevated);
    border-radius: 0.75rem;
    box-shadow: var(--shadow-elevated, 0 8px 24px rgba(0, 0, 0, 0.4));
    padding: 1.25rem 1.5rem;
    border: 1px solid var(--border-subtle);
  }

  .delete-modal__message {
    margin: 0 0 1.25rem;
    font-size: 0.95rem;
    color: var(--text-normal);
    line-height: 1.45;
  }

  .delete-modal__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .delete-modal__btn {
    padding: 0.4rem 0.9rem;
    border-radius: 0.4rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
  }

  .delete-modal__btn--secondary {
    background: var(--bg-active);
    color: var(--text-accent);
    border-color: var(--border-subtle);
  }

  .delete-modal__btn--secondary:hover {
    background: var(--bg-app);
  }

  .delete-modal__btn--danger {
    background: var(--danger-bg);
    color: var(--danger-border);
    border-color: var(--danger-border);
  }

  .delete-modal__btn--danger:hover {
    background: rgba(220, 38, 38, 0.3);
  }
</style>

<template>
  <div class="overlay">
    <div class="panel">
      <header class="panel__header">
        <h2>Encrypted sync settings</h2>
        <button type="button" class="icon-button" @click="$emit('close')">
          ✕
        </button>
      </header>
      <p class="panel__description">
        Configure an optional backend for encrypted backups and sync.
        The backend only ever sees encrypted blobs, never your plaintext notes
        or passphrase.
      </p>
      <form class="form" @submit.prevent="onSave">
        <label class="field">
          <span class="field__label">Backend URL</span>
          <input v-model="backendUrl" type="url" class="field__input" placeholder="https://papel-backend.example.com" />
        </label>
        <label class="field">
          <span class="field__label">API token</span>
          <input v-model="apiToken" type="text" class="field__input" placeholder="Copy from backend configuration" />
        </label>
        <label class="field">
          <span class="field__label">Passphrase</span>
          <input
            v-model="passphrase"
            type="password"
            class="field__input"
            :disabled="passphraseLocked"
            :placeholder="passphraseLocked ? 'Passphrase is locked; disable sync to change' : 'Create a strong passphrase'"
          />
        </label>
        <p class="hint">
          The passphrase never leaves your browser. Losing it means the
          encrypted data on the backend cannot be recovered.
        </p>
        <p v-if="passphraseLocked" class="hint">
          To change the passphrase, first disable sync. Existing encrypted data will remain
          tied to the old passphrase.
        </p>
        <div class="panel__footer">
          <div class="status" v-if="statusMessage">
            {{ statusMessage }}
          </div>
          <div class="panel__actions">
            <button type="button" class="secondary" @click="$emit('disable')">
              Disable sync
            </button>
            <button type="submit" class="primary">
              Save settings
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { loadBackendConfig } from '../backend/config';

const props = defineProps<{
  statusMessage: string | null;
  passphraseLocked: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', payload: { backendUrl: string; apiToken: string; passphrase: string }): void;
  (e: 'disable'): void;
}>();

const backendUrl = ref('');
const apiToken = ref('');
const passphrase = ref('');

onMounted(() => {
  const existing = loadBackendConfig();
  if (existing) {
    backendUrl.value = existing.baseUrl;
    apiToken.value = existing.apiToken;
  }
});

function onSave() {
  emit('save', {
    backendUrl: backendUrl.value.trim(),
    apiToken: apiToken.value.trim(),
    passphrase: passphrase.value,
  });
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
}

.panel {
  width: 420px;
  max-width: 100%;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
  padding: 1.25rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.panel__header h2 {
  font-size: 1.05rem;
  margin: 0;
}

.icon-button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
}

.panel__description {
  font-size: 0.85rem;
  color: #4b5563;
  margin: 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field__label {
  font-size: 0.8rem;
  font-weight: 500;
}

.field__input {
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
}

.hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}

.panel__footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.status {
  font-size: 0.8rem;
  color: #2563eb;
}

.panel__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.primary {
  padding: 0.4rem 0.8rem;
  border-radius: 0.5rem;
  border: none;
  background: #2563eb;
  color: white;
  font-size: 0.85rem;
  cursor: pointer;
}

.secondary {
  padding: 0.4rem 0.8rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  background: white;
  font-size: 0.85rem;
  cursor: pointer;
}
</style>


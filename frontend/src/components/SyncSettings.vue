<template>
  <div class="overlay">
    <div class="panel">
      <header class="panel__header">
        <h2>Settings</h2>
        <button type="button" class="icon-button" @click="$emit('close')">
          ✕
        </button>
      </header>
      <nav class="panel__tabs">
        <button
          type="button"
          :class="['panel__tab', { 'panel__tab--active': activeTab === 'sync' }]"
          @click="activeTab = 'sync'"
        >
          Sync
        </button>
        <button
          type="button"
          :class="['panel__tab', { 'panel__tab--active': activeTab === 'import-export' }]"
          @click="activeTab = 'import-export'"
        >
          Import & export
        </button>
      </nav>
      <template v-if="activeTab === 'sync'">
      <p class="panel__description">
        Configure an optional backend for encrypted backups and sync.
        The backend only ever sees encrypted blobs, never your plaintext notes
        or passphrase.
      </p>
      <form class="form" @submit.prevent="onSave">
        <template v-if="!hasExistingConfig">
          <label class="field">
            <span class="field__label">Backend URL</span>
            <input
              v-model="backendUrl"
              type="url"
              class="field__input"
              placeholder="https://papel-backend.example.com"
            />
          </label>
          <label class="field">
            <span class="field__label">API token</span>
            <input
              v-model="apiToken"
              type="text"
              class="field__input"
              placeholder="Copy from backend configuration"
            />
          </label>
        </template>
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
        <label v-if="!passphraseLocked" class="field">
          <span class="field__label">Confirm passphrase</span>
          <input
            v-model="passphraseConfirm"
            type="password"
            class="field__input"
            placeholder="Re-enter passphrase"
          />
        </label>
        <p v-if="passphraseMismatch" class="hint hint--error">
          Passphrases do not match.
        </p>
        <p class="hint">
          The passphrase never leaves your browser. Losing it means the
          encrypted data on the backend cannot be recovered.
        </p>
        <p v-if="passphraseLocked" class="hint">
          To change the passphrase, first disable sync. Existing encrypted data will remain
          tied to the old passphrase.
        </p>
        <div v-if="hasExistingConfig" class="danger">
          <button
            type="button"
            class="danger__toggle"
            @click="showAdvancedBackend = !showAdvancedBackend"
          >
            {{ showAdvancedBackend ? 'Hide backend configuration' : 'Change backend URL and API token' }}
          </button>
          <div v-if="showAdvancedBackend" class="danger__body">
            <p class="hint">
              Changing the backend URL or API token can break existing encrypted sync.
              Only proceed if you know what you are doing.
            </p>
            <label class="field">
              <span class="field__label">Backend URL</span>
              <input
                v-model="backendUrl"
                type="url"
                class="field__input"
                placeholder="https://papel-backend.example.com"
              />
            </label>
            <label class="field">
              <span class="field__label">API token</span>
              <input
                v-model="apiToken"
                type="text"
                class="field__input"
                placeholder="Copy from backend configuration"
              />
            </label>
          </div>
        </div>
        <div class="panel__footer">
          <div class="status" v-if="statusMessage">
            {{ statusMessage }}
          </div>
          <div class="panel__actions">
            <button type="button" class="secondary" @click="$emit('disable')">
              Disable sync
            </button>
            <button
              type="submit"
              class="primary"
              :disabled="!passphraseLocked && (passphraseMismatch || !passphraseConfirm)"
            >
              Save settings
            </button>
          </div>
        </div>
      </form>
      </template>
      <template v-else>
        <div class="import-export">
          <label class="import-export__label">
            Import Markdown
            <input
              ref="fileInput"
              type="file"
              accept=".md,text/markdown"
              multiple
              class="import-export__file"
              @change="onFilesSelected"
            />
          </label>
          <button type="button" class="secondary" @click="$emit('export-all')">
            Export all notes
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { loadBackendConfig } from '../backend/config';

const props = defineProps<{
  statusMessage: string | null;
  passphraseLocked: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', payload: { backendUrl: string; apiToken: string; passphrase: string }): void;
  (e: 'disable'): void;
  (e: 'import-files', files: FileList): void;
  (e: 'export-all'): void;
}>();

const activeTab = ref<'sync' | 'import-export'>('sync');
const fileInput = ref<HTMLInputElement | null>(null);

const backendUrl = ref('');
const apiToken = ref('');
const passphrase = ref('');
const passphraseConfirm = ref('');
const hasExistingConfig = ref(false);
const showAdvancedBackend = ref(false);

const passphraseMismatch = computed(() => {
  if (props.passphraseLocked) return false;
  if (!passphraseConfirm.value) return false;
  return passphrase.value !== passphraseConfirm.value;
});

function onFilesSelected(event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (target?.files && target.files.length) {
    emit('import-files', target.files);
  }
  if (target) {
    target.value = '';
  }
}

onMounted(() => {
  const existing = loadBackendConfig();
  if (existing) {
    backendUrl.value = existing.baseUrl;
    apiToken.value = existing.apiToken;
    hasExistingConfig.value = true;
  }
});

function onSave() {
  if (!props.passphraseLocked && passphraseMismatch.value) {
    return;
  }
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
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
}

.panel {
  width: 420px;
  max-width: 100%;
  background: var(--bg-elevated);
  border-radius: 0.75rem;
  box-shadow: var(--shadow-elevated);
  padding: 1.25rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--border-subtle);
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
  color: var(--text-accent);
}

.panel__tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--border-subtle);
  margin: -0.25rem 0 0;
}

.panel__tab {
  padding: 0.5rem 0.75rem;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: transparent;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--text-muted);
}

.panel__tab:hover {
  color: var(--text-accent);
}

.panel__tab--active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
  font-weight: 500;
}

.import-export {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.import-export__label {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.8rem;
  border-radius: 0.4rem;
  background: var(--bg-active);
  color: var(--text-accent);
  font-size: 0.85rem;
  cursor: pointer;
  width: fit-content;
}

.import-export__file {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  overflow: hidden;
}

.icon-button {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-muted);
}

.panel__description {
  font-size: 0.85rem;
  color: var(--text-muted);
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
  color: var(--text-muted);
}

.field__input {
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
  background: var(--bg-app);
  color: var(--text-normal);
}

.hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0;
}

.hint--error {
  color: var(--danger-border, #c53030);
}

.panel__footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.status {
  font-size: 0.8rem;
  color: var(--accent-primary);
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
  background: var(--accent-primary);
  color: var(--text-accent);
  font-size: 0.85rem;
  cursor: pointer;
}

.secondary {
  padding: 0.4rem 0.8rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-subtle);
  background: transparent;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--text-normal);
}

.danger {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.danger__toggle {
  align-self: flex-start;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--danger-border);
  background: transparent;
  font-size: 0.75rem;
  color: var(--danger-border);
  cursor: pointer;
}

.danger__body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>


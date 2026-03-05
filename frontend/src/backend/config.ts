export interface BackendConfig {
  baseUrl: string;
  apiToken: string;
}

const STORAGE_KEY = 'papel-backend-config-v1';

export function loadBackendConfig(): BackendConfig | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as BackendConfig;
    if (!parsed.baseUrl || !parsed.apiToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveBackendConfig(config: BackendConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearBackendConfig(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function isBackendConfigured(): boolean {
  return loadBackendConfig() !== null;
}


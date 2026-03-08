const STORAGE_KEY = 'papel-session-keys-v1';
const KEY_MATERIAL_BYTES = 64;

export function clearSessionKeys(): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function loadSessionKeys(): Uint8Array | null {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null;
  }
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    if (bytes.length !== KEY_MATERIAL_BYTES) {
      return null;
    }
    return bytes;
  } catch {
    return null;
  }
}

export function saveSessionKeys(rawKeyMaterial: Uint8Array): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }
  if (rawKeyMaterial.length !== KEY_MATERIAL_BYTES) {
    return;
  }
  let binary = '';
  for (let i = 0; i < rawKeyMaterial.length; i += 1) {
    binary += String.fromCharCode(rawKeyMaterial[i]);
  }
  window.sessionStorage.setItem(STORAGE_KEY, btoa(binary));
}

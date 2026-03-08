export interface DerivedKeyMaterial {
  masterKey: CryptoKey;
  dataKey: CryptoKey;
}

export interface KeyDerivationParams {
  iterations: number;
  salt: Uint8Array;
}

const DEFAULT_ITERATIONS = 100_000;
const SALT_BYTES = 16;

async function importPassphrase(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passphraseBytes = enc.encode(passphrase);
  return crypto.subtle.importKey(
    'raw',
    passphraseBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits'],
  );
}

export function randomSalt(): Uint8Array {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  return salt;
}

export async function deriveKeysFromPassphrase(
  passphrase: string,
  params?: Partial<KeyDerivationParams>,
): Promise<DerivedKeyMaterial> {
  if (!crypto.subtle) {
    throw new Error('WebCrypto not available in this environment');
  }

  const salt = params?.salt ?? randomSalt();
  const iterations = params?.iterations ?? DEFAULT_ITERATIONS;

  const baseKey = await importPassphrase(passphrase);

  // Derive 512 bits from PBKDF2 and split into two 256-bit AES-GCM keys.
  const saltBuffer = new Uint8Array(salt);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBuffer,
      iterations,
    },
    baseKey,
    512,
  );

  const bytes = new Uint8Array(bits);
  const masterBytes = bytes.slice(0, 32);
  const dataBytes = bytes.slice(32, 64);

  const masterKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(masterBytes),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  const dataKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(dataBytes),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  return { masterKey, dataKey };
}

export async function deriveKeysFromPassphraseWithRaw(
  passphrase: string,
  params?: Partial<KeyDerivationParams>,
): Promise<{ keys: DerivedKeyMaterial; rawKeyMaterial: Uint8Array }> {
  if (!crypto.subtle) {
    throw new Error('WebCrypto not available in this environment');
  }

  const salt = params?.salt ?? randomSalt();
  const iterations = params?.iterations ?? DEFAULT_ITERATIONS;

  const baseKey = await importPassphrase(passphrase);

  const saltBuffer = new Uint8Array(salt);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBuffer,
      iterations,
    },
    baseKey,
    512,
  );

  const bytes = new Uint8Array(bits);
  const masterBytes = bytes.slice(0, 32);
  const dataBytes = bytes.slice(32, 64);

  const masterKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(masterBytes),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  const dataKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(dataBytes),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  const rawKeyMaterial = new Uint8Array(64);
  rawKeyMaterial.set(masterBytes, 0);
  rawKeyMaterial.set(dataBytes, 32);

  return {
    keys: { masterKey, dataKey },
    rawKeyMaterial,
  };
}

export async function importKeysFromRaw(
  rawKeyMaterial: Uint8Array,
): Promise<DerivedKeyMaterial> {
  if (!crypto.subtle) {
    throw new Error('WebCrypto not available in this environment');
  }
  if (rawKeyMaterial.length !== 64) {
    throw new Error('Raw key material must be 64 bytes');
  }

  const masterBytes = new Uint8Array(rawKeyMaterial.slice(0, 32));
  const dataBytes = new Uint8Array(rawKeyMaterial.slice(32, 64));

  const masterKey = await crypto.subtle.importKey(
    'raw',
    masterBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  const dataKey = await crypto.subtle.importKey(
    'raw',
    dataBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  return { masterKey, dataKey };
}


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
    ['deriveKey'],
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

  const masterKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations,
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  const hkdfInfo = new TextEncoder().encode('papel-data-key');

  const hkdfBaseKey = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.exportKey('raw', masterKey),
    { name: 'HKDF' },
    false,
    ['deriveKey'],
  );

  const dataKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: hkdfInfo,
    },
    hkdfBaseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  return { masterKey, dataKey };
}


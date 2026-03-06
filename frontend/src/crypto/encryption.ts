import type { Note } from '../types/note';
import type { DerivedKeyMaterial } from './keys';

export interface EncryptedNoteBlob {
  version: number;
  noteId: string;
  iv: string;
  ciphertext: string;
}

const BLOB_VERSION = 1;
const IV_BYTES = 12;

function toBase64(bytes: Uint8Array): string {
  if (typeof btoa !== 'undefined') {
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

function fromBase64(encoded: string): Uint8Array {
  if (typeof atob !== 'undefined') {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(encoded, 'base64'));
}

function randomIv(): Uint8Array {
  const iv = new Uint8Array(IV_BYTES);
  crypto.getRandomValues(iv);
  return iv;
}

export async function encryptNote(
  keys: DerivedKeyMaterial,
  note: Note,
): Promise<EncryptedNoteBlob> {
  const iv = randomIv();
  const encoder = new TextEncoder();
  const payload = encoder.encode(
    JSON.stringify({
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }),
  );

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    keys.dataKey,
    payload,
  );

  const ciphertext = new Uint8Array(ciphertextBuffer);

  return {
    version: BLOB_VERSION,
    noteId: note.id,
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };
}

export async function decryptNote(
  keys: DerivedKeyMaterial,
  blob: EncryptedNoteBlob,
): Promise<Note> {
  if (blob.version !== BLOB_VERSION) {
    throw new Error(`Unsupported blob version: ${blob.version}`);
  }

  const iv = fromBase64(blob.iv);
  const ciphertext = fromBase64(blob.ciphertext);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    keys.dataKey,
    ciphertext,
  );

  const decoder = new TextDecoder();
  const json = decoder.decode(decryptedBuffer);
  const parsed = JSON.parse(json) as Note;
  return parsed;
}


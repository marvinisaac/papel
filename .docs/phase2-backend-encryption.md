# Phase 2: Encryption Model & Backend MVP

## Objective

Introduce an optional, self-hostable backend that stores only encrypted blobs, enabling safe remote backup and multi-device sync without exposing plaintext Markdown or encryption keys to the server.

## Threat Model & Trust Assumptions

- **Threat model**
  - Assume the backend host and any Git remotes can be read by an attacker.
  - Assume network traffic can be observed or recorded.
  - Attacker should not be able to recover plaintext notes without user-held secrets.
- **Trusted components**
  - User’s browser and device are trusted to hold plaintext and keys.
  - The backend is trusted to store and serve encrypted data correctly, but not with confidentiality.

## Encryption Model

- **Keys**
  - Derive a master encryption key from a user passphrase using a modern KDF (e.g., PBKDF2, scrypt, or Argon2 via WebCrypto or a JS library).
  - Consider a simple key hierarchy:
    - `K_master`: derived from passphrase and stored only in memory.
    - `K_data`: symmetric key used to encrypt notes, derived from `K_master` (e.g., HKDF).
- **Per-note vs. per-snapshot**
  - Start with a **per-note** key or nonce approach for simplicity:
    - Each note uses `K_data` with a unique random IV/nonce per encryption operation.
  - Later phases can evolve to per-snapshot or per-device keys if needed.
- **Algorithm choices**
  - Use an authenticated encryption mode (e.g., AES-GCM or XChaCha20-Poly1305 via a well-reviewed library).
  - All encryption and decryption happen in the browser.

## Encrypted Blob Format

- **Logical structure**
  - Each encrypted blob corresponds to a note snapshot or a compacted representation of a note.
  - Include minimal metadata needed for decryption and migration:
    - Version tag for the encryption format.
    - Random IV/nonce.
    - Ciphertext of the Markdown content (and optional metadata).
- **Example fields**
  - `version`: e.g., `1`.
  - `noteId`: stable note identifier (UUID).
  - `iv`: base64-encoded IV/nonce.
  - `ciphertext`: base64-encoded ciphertext.

## Backend API (MVP)

- **Authentication**
  - Simple token-based auth suitable for single user:
    - Configured API token in the backend container.
    - Browser includes token in an `Authorization` header (e.g., `Bearer <token>`).
- **Core endpoints (encrypted only)**
  - `GET /api/notes`
    - Returns a list of encrypted blob metadata (e.g., `noteId`, last updated).
  - `GET /api/notes/:noteId`
    - Returns the encrypted blob for a single note.
  - `PUT /api/notes/:noteId`
    - Accepts an encrypted blob for a note and replaces or creates it on the backend.
  - `DELETE /api/notes/:noteId`
    - Marks a note as deleted or removes its encrypted blob.
- **Backend behavior**
  - Backend validates auth and basic structure but never attempts to decrypt.
  - Persists blobs to disk in a layout that Phase 3 can later map into Git.

## Browser-Backend Sync Flow

- **Initial connection**
  - User configures backend URL and API token in the app.
  - App fetches the list of encrypted notes from backend.
  - For each note, app downloads the encrypted blob, decrypts locally using `K_data`, and hydrates the local store.
- **Editing notes**
  - User edits notes against the local store (Phase 1 behavior).
  - On save or autosave, app:
    - Updates the local IndexedDB entry with plaintext.
    - If online and backend is configured, encrypts the note and sends it via `PUT /api/notes/:noteId`.
- **Offline behavior**
  - If backend is unreachable, edits are still stored locally.
  - A background sync process retries pending uploads when connectivity returns.

## Backend Implementation Notes (Dockerized)

- **Container responsibilities**
  - Serve the API over HTTPS (or sit behind a reverse proxy that terminates TLS).
  - Validate API tokens.
  - Persist encrypted blobs to a simple on-disk store (e.g., one file per `noteId`).
- **Configuration**
  - Environment variables for:
    - API token.
    - Data directory path.
    - (Phase 3) Git repository path and remote.

## UX Considerations

- **Setup flow**
  - Simple screen to configure:
    - Backend URL.
    - API token.
  - Clear indication that the backend never sees plaintext notes.
- **Key management**
  - User creates a passphrase when enabling sync.
  - App derives keys locally and never sends the passphrase or keys to the backend.
  - Consider a basic “forgot passphrase” warning: losing the passphrase means encrypted data cannot be recovered.


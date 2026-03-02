# Phase 4: Multi-Device UX & Sync Polish

## Objective

Make the multi-device experience robust and understandable for a single human user, building on the encrypted backend and Git-backed storage from earlier phases.

## Core Principles

- **Single human, multiple devices**
  - Optimize for one person using Papel on several devices (laptop, desktop, tablet).
  - Conflicts are rare but must be handled gracefully when they occur.
- **Local-first mental model**
  - Each device should feel responsive and usable even when offline.
  - Sync is opportunistic: it catches up when connectivity and backend are available.

## User Flows

- **Connect a device to an existing backend**
  - User installs/opens Papel in a new browser.
  - In settings, user enters:
    - Backend URL.
    - API token.
    - Encryption passphrase (to derive keys).
  - App:
    - Verifies connectivity and auth.
    - Fetches encrypted blobs.
    - Decrypts them locally and hydrates the local store.
- **Ongoing usage across devices**
  - User edits notes on Device A; changes are saved locally and synced to backend when online.
  - Device B:
    - Periodically checks backend for updates (polling or lightweight change feed).
    - Downloads encrypted blobs for updated `noteId`s.
    - Decrypts and merges them into the local store.

## Sync Indicators & States

- **Global sync status**
  - Surface a small status indicator in the UI (e.g., in the header or settings menu) with states such as:
    - `Online & synced`
    - `Syncing…`
    - `Offline (changes pending)`
    - `Sync error`
- **Per-note hints (optional)**
  - For advanced users, optionally show:
    - Last synced time per note.
    - Whether a note has unsynced local changes.

## Conflict Handling

- **When conflicts can occur**
  - Two devices edit the same note while offline or before either has pulled the other’s changes.
- **Detection strategy**
  - Include a simple version or last-known revision marker with each note update sent to the backend.
  - If the backend receives an update with an out-of-date marker, it flags a potential conflict.
- **Resolution UX (minimal viable)**
  - On detecting a conflict, backend can accept both versions by:
    - Keeping the “remote” version as the canonical note.
    - Storing the conflicting client version as a separate snapshot (or a new note with a suffix like “(conflicted copy)”).
  - Frontend surfaces a clear message:
    - Explains that a conflict occurred.
    - Links to both versions so the user can manually merge and delete the extra copy.

## Settings & Controls

- **Backend configuration**
  - Screen to:
    - View backend URL and token (with masking for secret values).
    - Test connectivity.
    - Disconnect from backend (fall back to local-only mode).
- **Sync controls**
  - “Sync now” button to manually trigger a sync.
  - Optionally, a toggle for automatic background sync frequency (e.g., every N seconds/minutes).

## Error Handling & Recovery

- **Network failures**
  - Keep writing to local store.
  - Queue sync operations and retry with exponential backoff.
  - Show non-intrusive UI that sync is currently offline.
- **Backend errors**
  - If auth fails, prompt user to re-enter token.
  - If backend returns unexpected errors, log details and show a simple, descriptive message.
- **Device recovery**
  - If a device’s local store is lost (e.g., browser storage cleared):
    - User reconnects to backend and rehydrates from encrypted blobs using their passphrase.


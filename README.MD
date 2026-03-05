# Papel
A single-user, Markdown-based, local-first, browser-based, self-hostable, Git-syncable note-taking app

## Architecture
- Markdown is the source of truth
- Browser-based app can be run without backend but will lose multi-device syncing
- App will continue working even when offline since everything is available locally
- App can optionally be connected to backend for remote backup and multi-device support
- After initial connection, content is fetched from the backend and saved locally
- Future edits will be made locally before being synced opportunistically to the backend
- Backend is a Docker image that is self-hostable
- Backend is "dumb" storage of encrypted blobs, it never sees the plaintext Markdown

> Git sync runs inside the backend container, which commits encrypted blobs to a Git repository and pushes to a configured remote. The frontend never talks to Git directly and never sends plaintext to the backend.

## Sync & Storage
- **Local-first**: All reading and editing of plaintext Markdown happens in the browser. The app continues to work offline because notes are stored locally in the browser.
- **Optional backend**: When configured, the backend stores only encrypted blobs of your notes and never sees the plaintext Markdown or encryption keys.
- **Git-backed backend storage**: The backend uses Git as an internal implementation detail to version and back up the encrypted blob store by committing changes and pushing to a user-configured remote.
- **Docs**: Deeper architecture and phase-by-phase plans live in `.docs/*.md` in this repo.

## App Design
- Writing UI is similar to Github comments:
    - Writing tab for writing raw Markdown content
    - Preview tab for viewing of formatted content
- Database is local browser-only
    - Can be safely deleted or forcibly removed by the browser
    - Only used for "bells and whistle" features (i.e. search, links, graph view, etc.)
    - Will always treat the decrypted Markdown files from backend as source of truth

## Features
- Backup / download of all Markdown files
- Drag-drop / import of existing Markdown files
- Multi-device syncing
- No app installation + PWA

## Limitations
- Single-user + multiple device is the target scenario
    - To minimize conflicts, multi-user and/or concurrent usage will NOT be supported


## Offline Single-Device MVP (Phase 1)

This worktree contains a Vue 3 + Vite single-page app that implements the Phase 1 offline, single-device note-taking MVP using IndexedDB for local storage.

- Single-user, single-device usage.
- Notes stored locally in IndexedDB via a small storage abstraction.
- Two-pane UI with a sidebar of notes and a markdown editor with Write/Preview tabs.
- Autosave with debounce and explicit Ctrl+S shortcut to flush saves.
- Client-side routing with / and /#/note/:id deep links.
- Import .md files as notes and export all notes to a .zip of markdown files.

Run "npm install" and then "npm run dev" in the worktree directory to start the dev server.

## Encrypted Backend & Sync (Phase 2)

- Optional, self-hostable backend that stores only encrypted blobs of your notes.
- All encryption and decryption happen in the browser using a key derived from a user passphrase; the backend never sees plaintext or keys.
- Simple token-based backend API (`/api/notes`, `/api/notes/:noteId`) that treats encrypted blobs as opaque data on disk.
- Browser sync flow:
  - Notes are still edited and autosaved locally in IndexedDB.
  - When sync is enabled and a passphrase is provided, notes are encrypted and pushed to the backend on save and key lifecycle events.
  - If the backend is unreachable, edits remain local and are queued for retry.
- A sync settings panel in the UI lets you configure backend URL, API token, and passphrase, and shows whether encrypted sync is configured.

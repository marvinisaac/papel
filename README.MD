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

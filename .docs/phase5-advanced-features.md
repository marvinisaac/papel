# Phase 5: Advanced Features & PWA

## Objective

Add advanced features that make Papel delightful while preserving the local-first, encrypted, and Git-backed architecture.

## Full-Text Search

- **Goals**
  - Fast search across note titles and bodies on the current device.
  - No change to the trust model: indexing happens locally over plaintext.
- **Approach**
  - Build and maintain a local search index (e.g., in IndexedDB) over decrypted notes.
  - Update the index on note create/update/delete.
  - Keep the index a cache: source of truth remains the decrypted Markdown content.

## Graph View & Backlinks

- **Linking model**
  - Support wiki-style links (e.g., `[[Note Title]]`) or similar conventions inside Markdown.
  - Parse links locally when notes are saved or on demand.
- **Graph construction**
  - Build an in-memory graph of notes and their links.
  - Optionally persist a lightweight link index locally for faster load.
- **UI**
  - Provide:
    - Backlinks section in each note showing “Notes that link here”.
    - Optional graph visualization of notes as nodes and links as edges.

## Enhanced Import & Export

- **Import**
  - Folder import:
    - Allow users to select a folder (where supported) containing multiple Markdown files.
    - Preserve folder structure via tags or hierarchies if desired.
  - Other tools:
    - Consider simple adapters for popular tools (e.g., Obsidian-style vaults) as a later extension.
- **Export**
  - Flexible export options:
    - Export all notes.
    - Export a subset (by tag, folder, or selection).
  - Preserve note IDs or filenames to avoid unnecessary duplication across exports.

## PWA: Installable Experience

- **PWA basics**
  - Add a web app manifest with:
    - App name, icons, theme colors.
    - Start URL and display mode (`standalone`).
  - Register a service worker for:
    - Basic offline shell support.
    - Caching of static assets (HTML, JS, CSS, fonts).
- **Behavior**
  - Users can “install” Papel from supported browsers.
  - App should remain fully functional offline using the same local storage mechanisms as in earlier phases.

## Quality-of-Life Enhancements

- **Theming**
  - Light and dark theme support.
  - Optional system-theme awareness.
- **Keyboard shortcuts**
  - Quick navigation (e.g., jump between notes, open search).
  - Formatting helpers (e.g., bold/italic, headings) in the editor.
- **Quick-open palette**
  - Command palette or note quick-open:
    - Fuzzy-search notes by title.
    - Invoke commands like “New note”, “Export all”, “Sync now”.

## Interaction with Previous Phases

- **Local-first remains central**
  - Advanced features are built on top of the same local data model and encrypted-sync story.
  - No additional trust is placed in the backend or Git remotes.
- **Performance considerations**
  - Search indexing and graph computations should be incremental to avoid blocking the UI.
  - PWA caching should be tuned so it doesn’t interfere with dynamic note data, which is still managed via the local DB and backend sync.


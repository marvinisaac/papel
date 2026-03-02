# Phase 1: Offline Single-Device MVP

## Objective

Deliver a clean, local-first note-taking experience for a single user running entirely in the browser, with no backend or Git dependency.

## Scope & Non-Goals

- **In scope**
  - Single-user, single-device usage.
  - Local-only persistence using browser storage (IndexedDB or similar).
  - Basic note CRUD and organization that feels fast and lightweight.
  - Import/export of Markdown files.
- **Out of scope**
  - Any backend or network communication.
  - Encryption beyond what the platform/browser already provides.
  - Multi-device sync or Git integration.
  - Advanced features like graph view, backlinks, or full-text search (those come later).

## Core User Flows

- **Create a note**
  - From the main view, user clicks “New note”.
  - A new note opens in the editor with a default title (e.g., “Untitled note”) and empty body.
  - Changes are autosaved locally as the user types.
- **Edit a note**
  - User selects a note from the list.
  - Editor shows the note in “Write” mode by default.
  - User can switch between **Write** and **Preview** tabs (GitHub-style).
- **Delete a note**
  - User selects a note and chooses “Delete”.
  - App asks for confirmation, then removes the note from local storage.
- **Import Markdown**
  - User drags one or more `.md` files into the app or uses an “Import” button.
  - App creates corresponding notes, using filenames as titles and file contents as note bodies.
- **Export all notes**
  - User clicks “Export all notes”.
  - App produces a ZIP containing one `.md` file per note, with stable filenames derived from titles or IDs.

## UI Design

- **Main layout**
  - Left: note list (or minimal sidebar) showing titles and updated timestamps.
  - Right: editor area with **Write** and **Preview** tabs.
- **Editor behavior**
  - **Write tab**: plain Markdown textarea or editor component.
  - **Preview tab**: rendered Markdown view.
  - Keyboard shortcuts for common actions (e.g., `Ctrl+S` to force-save, `Ctrl+N` for new note) are a nice-to-have.

## Data Model (Local-Only)

- **Note entity**
  - `id`: stable UUID or similar.
  - `title`: short string, derived from first heading or user input.
  - `content`: full Markdown body.
  - `createdAt`: timestamp.
  - `updatedAt`: timestamp.
- **Storage strategy**
  - Use IndexedDB (via a small wrapper) as the primary store.
  - Optionally maintain a small in-memory index for the currently loaded session.
  - All reads/writes go through a storage abstraction so that later phases can plug in sync.

## Autosave & Reliability

- Autosave notes as the user types, with a small debounce.
- Ensure that closing the tab or refreshing does not lose any recently typed content.
- Provide minimal error handling for storage failures (e.g., quota exceeded) with user-visible messaging.

## Navigation & Routing

- Single-page app with client-side routing.
- A simple URL pattern like `/note/:id` for deep-linking to specific notes.
- Default route shows the most recently edited note or a friendly “Get started” message when no notes exist.

## Technical Notes

- Target modern browsers; no need to support very old versions.
- Keep external dependencies minimal to reduce complexity and bundle size.
- Structure the code so the local storage abstraction can later integrate with sync logic (backend + Git) without rewriting the UI.


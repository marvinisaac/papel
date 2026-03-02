# Phase 3: Git-Backed Backend Storage

## Objective

Make the backend’s encrypted blob store Git-aware, providing version history, off-site backup, and easy replication using standard Git tooling, while still only ever storing encrypted data.

## Disk Layout for Encrypted Blobs

- **Goals**
  - Simple, human-inspectable layout.
  - Stable file paths so Git diffs and history remain meaningful.
  - Easy to back up, clone, and restore using normal Git operations.
- **Proposed layout**
  - Data directory (e.g., `/data` inside the container) doubles as the Git working tree.
  - Structure:
    - `notes/<noteId>.json` – encrypted blob for each note (as defined in Phase 2).
    - Optionally, `meta/index.json` or similar for global metadata if needed later.
  - Each `notes/<noteId>.json` file contains:
    - Encryption format version.
    - IV/nonce.
    - Ciphertext.
    - Any minimal metadata needed for recovery.

## Git Workflow in the Backend

- **Repository management**
  - On startup:
    - If `/data/.git` exists, open it as an existing repo.
    - Otherwise, run `git init` in `/data`.
  - Configure basic identity (name/email) for automated commits, but do not override user-level config outside the repo.
- **Committing changes**
  - After processing write operations (e.g., `PUT /api/notes/:noteId`, `DELETE /api/notes/:noteId`):
    - Stage changed files under `notes/`.
    - Create a commit with a structured message, for example:
      - `note <noteId> created`
      - `note <noteId> updated`
      - `note <noteId> deleted`
    - Batch multiple note changes into a single commit when appropriate (e.g., multiple writes in a short window).
- **Pushing to remote**
  - If a Git remote is configured:
    - Push the current branch (default `main` or `master`) to the remote.
    - On transient network errors, queue a retry without blocking the API response.
  - If no remote is configured, commits still accumulate locally and can be pushed manually by the user.

## Configuration Knobs

- **Environment variables**
  - `PAPEL_DATA_DIR`: path to working tree (default `/data`).
  - `PAPEL_GIT_REMOTE`: optional Git remote URL; if unset, backend does not auto-push.
  - `PAPEL_GIT_BRANCH`: branch name to use (default `main`).
  - `PAPEL_GIT_AUTO_PUSH`: boolean flag (`true`/`false`) controlling whether backend attempts automatic pushes after commits.
- **Runtime behavior**
  - Changing configuration requires restarting the container.
  - Backend should log Git-related actions (commits, push attempts, failures) for observability.

## Status & Health Reporting

- **Internal tracking**
  - Track the last successful:
    - Commit hash.
    - Push time and target remote.
  - Track the last Git error, if any (e.g., authentication failure, network error).
- **Status endpoint**
  - `GET /api/status/git`
    - Returns:
      - `enabled`: whether Git integration is active.
      - `branch`: current branch.
      - `lastCommit`: hash and timestamp.
      - `lastPush`: timestamp and success/failure.
      - `lastError`: optional human-readable description.
  - Frontend can surface this in a settings or diagnostics UI, but Phase 3 does not require a rich UI.

## Backup & Recovery Story

- **Backup**
  - With Git remote configured:
    - Encrypted blobs are continuously versioned and pushed, so any Git clone of the repo serves as a backup.
  - Without remote:
    - Local Git history still provides rollback and auditing on the host machine.
- **Recovery**
  - To recover:
    - Clone or restore the Git repo to a filesystem.
    - Point a fresh backend container at that repo directory as `PAPEL_DATA_DIR`.
    - The browser, with the correct encryption keys, can then rehydrate notes from the encrypted blobs.

## Interaction with Earlier Phases

- **No changes to encryption model**
  - Phase 3 does not alter how notes are encrypted; it only changes how encrypted blobs are persisted and versioned.
- **API stability**
  - The external API from Phase 2 remains the same (PUT/GET encrypted blobs).
  - Only internal backend behavior is extended to include Git operations.


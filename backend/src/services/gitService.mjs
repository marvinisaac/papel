import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  STORAGE_DIR,
  GIT_REMOTE,
  GIT_BRANCH,
  GIT_AUTO_PUSH,
  GIT_PAT,
  GIT_SNAPSHOT_INTERVAL_MS,
} from '../config.mjs';

const DECRYPT_README_NAME = 'README.MD';
const DECRYPT_SCRIPT_NAME = 'decrypt-notes.mjs';

function getScriptsDir() {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(dir, '..', '..', 'scripts');
}

function getDecryptScriptSourcePath() {
  return path.join(getScriptsDir(), DECRYPT_SCRIPT_NAME);
}

function getDecryptReadmeSourcePath() {
  return path.join(getScriptsDir(), DECRYPT_README_NAME);
}

async function ensureDecryptScriptInStorage() {
  const fs = await import('fs/promises');
  const source = getDecryptScriptSourcePath();
  const dest = path.join(STORAGE_DIR, DECRYPT_SCRIPT_NAME);
  try {
    await fs.copyFile(source, dest);
  } catch (err) {
    // Source may be missing if running from a clone without backend; ignore.
  }
}

async function ensureDecryptReadmeInStorage() {
  const fs = await import('fs/promises');
  const source = getDecryptReadmeSourcePath();
  const dest = path.join(STORAGE_DIR, DECRYPT_README_NAME);
  try {
    await fs.copyFile(source, dest);
  } catch (err) {
    // Source may be missing if running from a clone without backend; ignore.
  }
}

const execFileAsync = promisify(execFile);

const gitStatus = {
  enabled: false,
  branch: null,
  lastCommit: null,
  lastPush: null,
  lastError: null,
};

/**
 * Format a commit message as "YYYY MM DD HH:mm (N files)" in UTC.
 * @param {number} fileCount
 * @returns {string}
 */
function formatCommitMessage(fileCount) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const h = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  return `${y} ${m} ${d} ${h}:${min} (${fileCount} files)`;
}

let snapshotTimer = null;

function setError(message) {
  gitStatus.lastError = message;
  // eslint-disable-next-line no-console
  console.error('[git]', message);
}

function gitEnv() {
  if (!GIT_PAT) return process.env;

  // Use GIT_ASKPASS compatible env to feed the PAT for HTTPS remotes.
  return {
    ...process.env,
    PAPEL_GIT_PAT_INTERNAL: GIT_PAT,
    GIT_ASKPASS: path.join(STORAGE_DIR, '.papel-git-askpass.sh'),
  };
}

async function ensureAskPassScript() {
  if (!GIT_PAT) return;
  const scriptPath = path.join(STORAGE_DIR, '.papel-git-askpass.sh');
  const fs = await import('fs/promises');

  try {
    await fs.access(scriptPath);
  } catch {
    const content = '#!/bin/sh\nprintf "%s" "${PAPEL_GIT_PAT_INTERNAL}"\n';
    await fs.writeFile(scriptPath, content, { mode: 0o700 });
  }
}

async function runGit(args) {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd: STORAGE_DIR,
      env: gitEnv(),
    });
    if (stderr && stderr.trim()) {
      // eslint-disable-next-line no-console
      console.error('[git stderr]', stderr.trim());
    }
    return stdout.trim();
  } catch (err) {
    const msg =
      err && err.stderr
        ? String(err.stderr).trim()
        : err && err.message
          ? err.message
          : 'Unknown git error';
    setError(msg);
    throw err;
  }
}

export async function ensureRepoInitialized() {
  if (gitStatus.enabled) return;

  try {
    await runGit(['rev-parse', '--git-dir']);
  } catch {
    // Not a repo yet, try to init
    try {
      await runGit(['init', '-b', GIT_BRANCH]);
    } catch {
      // Fallback for older git without -b
      await runGit(['init']);
      await runGit(['checkout', '-B', GIT_BRANCH]);
    }

    await runGit(['config', 'user.name', 'papel-backend']);
    await runGit(['config', 'user.email', 'papel@localhost']);

    if (GIT_REMOTE) {
      try {
        await runGit(['remote', 'add', 'origin', GIT_REMOTE]);
      } catch {
        // remote may already exist; ignore
      }
    }
  }

  await ensureDecryptScriptInStorage();
  await ensureDecryptReadmeInStorage();

  gitStatus.enabled = true;

  try {
    const branch = await runGit([
      'rev-parse',
      '--abbrev-ref',
      'HEAD',
    ]);
    gitStatus.branch = branch;
  } catch {
    // ignore
  }
}

export async function stageNoteChange(fileRelativePath, existedBefore) {
  if (!gitStatus.enabled) return;

  if (existedBefore === false) {
    await runGit(['add', fileRelativePath]);
  } else {
    // For updates we also just add; for deletions we use rm.
    await runGit(['add', fileRelativePath]);
  }
}

export async function stageNoteDeletion(fileRelativePath) {
  if (!gitStatus.enabled) return;
  await runGit(['rm', '--ignore-unmatch', fileRelativePath]);
}

export async function commitNoteChange(message) {
  if (!gitStatus.enabled) return null;

  try {
    await runGit(['commit', '-m', message]);
  } catch (err) {
    // If there are no changes to commit, ignore.
    return null;
  }

  try {
    const hash = await runGit(['rev-parse', 'HEAD']);
    const timestamp = await runGit([
      'show',
      '-s',
      '--format=%cI',
      'HEAD',
    ]);
    gitStatus.lastCommit = { hash, timestamp };
    gitStatus.lastError = null;
    return gitStatus.lastCommit;
  } catch {
    return null;
  }
}

export async function pushIfConfigured() {
  if (!gitStatus.enabled || !GIT_AUTO_PUSH || !GIT_REMOTE || !GIT_PAT) {
    return;
  }

  await ensureAskPassScript();

  try {
    await runGit(['push', 'origin', GIT_BRANCH]);
    const now = new Date().toISOString();
    gitStatus.lastPush = {
      timestamp: now,
      remote: GIT_REMOTE,
      success: true,
    };
    gitStatus.lastError = null;
  } catch (err) {
    const now = new Date().toISOString();
    gitStatus.lastPush = {
      timestamp: now,
      remote: GIT_REMOTE,
      success: false,
    };
    setError(
      err && err.message
        ? `Push failed: ${err.message}`
        : 'Push failed',
    );
  }
}

export async function snapshotNow({ push } = { push: true }) {
  try {
    await ensureRepoInitialized();
  } catch {
    // Repo initialization failed; gitStatus.lastError already set.
    return null;
  }

  // Stage JSON files (notes and related metadata) under STORAGE_DIR.
  try {
    await runGit(['add', '*.json']);
  } catch {
    // No matching files or add failure; we'll detect empty stage below.
  }

  try {
    await runGit(['add', DECRYPT_SCRIPT_NAME]);
  } catch {
    // Script may not exist in STORAGE_DIR (e.g. fresh clone); ignore.
  }

  try {
    await runGit(['add', DECRYPT_README_NAME]);
  } catch {
    // Readme may not exist in STORAGE_DIR (e.g. fresh clone); ignore.
  }

  let files = [];
  try {
    const diff = await runGit(['diff', '--cached', '--name-only']);
    files = diff
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    // If we cannot inspect staged files, bail out without committing.
    return null;
  }

  const count = files.length;
  if (count === 0) {
    return null;
  }

  const message = formatCommitMessage(count);
  const timestamp = new Date().toISOString();

  try {
    await runGit(['commit', '-m', message]);
  } catch {
    // If commit fails (e.g., race where nothing left to commit), stop here.
    return null;
  }

  try {
    const hash = await runGit(['rev-parse', 'HEAD']);
    gitStatus.lastCommit = { hash, timestamp };
    gitStatus.lastError = null;
  } catch {
    // Ignore inability to read HEAD; commit already happened.
  }

  if (push) {
    await pushIfConfigured();
  }

  return gitStatus.lastCommit;
}

export function startGitSnapshotScheduler() {
  if (!GIT_SNAPSHOT_INTERVAL_MS || GIT_SNAPSHOT_INTERVAL_MS <= 0) return;
  if (snapshotTimer) return;

  snapshotTimer = setInterval(() => {
    snapshotNow().catch(() => {
      // Errors are logged inside gitService; ignore here.
    });
  }, GIT_SNAPSHOT_INTERVAL_MS);
}

export async function getGitStatus() {
  // Best-effort refresh of branch/head info if enabled.
  if (gitStatus.enabled) {
    try {
      const branch = await runGit([
        'rev-parse',
        '--abbrev-ref',
        'HEAD',
      ]);
      gitStatus.branch = branch;
    } catch {
      // ignore
    }
  }

  return {
    enabled: gitStatus.enabled,
    branch: gitStatus.branch,
    lastCommit: gitStatus.lastCommit,
    lastPush: gitStatus.lastPush,
    lastError: gitStatus.lastError,
  };
}


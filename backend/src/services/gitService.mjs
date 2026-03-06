import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

import {
  STORAGE_DIR,
  GIT_REMOTE,
  GIT_BRANCH,
  GIT_AUTO_PUSH,
  GIT_PAT,
} from '../config.mjs';

const execFileAsync = promisify(execFile);

const gitStatus = {
  enabled: false,
  branch: null,
  lastCommit: null,
  lastPush: null,
  lastError: null,
};

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


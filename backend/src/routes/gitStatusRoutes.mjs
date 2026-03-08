import { Router } from 'express';

import { ensureRepoInitialized, getGitStatus } from '../services/gitService.mjs';

const router = Router();

router.get('/status/git', async (req, res) => {
  try {
    await ensureRepoInitialized();
  } catch {
    // ignore; gitStatus will reflect failure
  }

  try {
    const status = await getGitStatus();
    res.json(status);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to get git status', err);
    res.status(500).json({ error: 'Failed to get git status' });
  }
});

export default router;


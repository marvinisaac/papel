import { Router } from 'express';

import { snapshotNow, getGitStatus } from '../services/gitService.mjs';

const router = Router();

router.post('/git/snapshot', async (req, res) => {
  const { push } = req.body || {};
  const shouldPush = push !== false;

  try {
    await snapshotNow({ push: shouldPush });
    const status = await getGitStatus();
    res.json({
      ok: true,
      status,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to create git snapshot', err);
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

export default router;


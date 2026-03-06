import { Router } from 'express';

import { getSalt } from '../services/saltService.mjs';

const router = Router();

router.get('/salt', (req, res) => {
  res.json({ salt: getSalt() });
});

export default router;


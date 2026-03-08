import { API_TOKEN } from '../config.mjs';

export function authenticate(req, res, next) {
  const header = req.header('authorization') || '';
  const [, token] = header.split(' ');

  if (!token || token !== API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}


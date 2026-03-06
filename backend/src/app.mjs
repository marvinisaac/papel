import express from 'express';

import { PORT } from './config.mjs';
import { cors } from './middleware/cors.mjs';
import { bootstrap } from './middleware/bootstrap.mjs';
import { authenticate } from './middleware/authenticate.mjs';
import { errorHandler } from './middleware/errorHandler.mjs';
import saltRoutes from './routes/saltRoutes.mjs';
import notesRoutes from './routes/notesRoutes.mjs';

export const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(cors);
app.use(bootstrap);
app.use(authenticate);
app.use('/api', saltRoutes);
app.use('/api', notesRoutes);
app.use(errorHandler);

export function startServer(callback) {
  return app.listen(PORT, callback);
}


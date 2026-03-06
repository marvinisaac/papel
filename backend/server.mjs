import { startServer } from './src/app.mjs';
import { PORT, STORAGE_DIR } from './src/config.mjs';

startServer(() => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${PORT}, data dir: ${STORAGE_DIR}`);
});


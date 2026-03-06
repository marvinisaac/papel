import { startServer } from './src/app.mjs';
import { PORT, DATA_DIR } from './src/config.mjs';

startServer(() => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${PORT}, data dir: ${DATA_DIR}`);
});


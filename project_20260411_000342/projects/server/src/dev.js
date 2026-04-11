import { createApp } from './app.js';
import { getConfig } from './config.js';

const config = getConfig();
const app = createApp();

app.listen(config.port, () => {
  console.log(`AI proxy listening on port ${config.port} (${config.nodeEnv})`);
});
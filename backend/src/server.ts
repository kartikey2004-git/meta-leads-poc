import 'dotenv/config';
import { createServer } from 'http';
import { env } from './config/env';
import { initWebSocket } from './lib/websocket';
import createApp from './app';

const httpServer = createServer();
const wss = initWebSocket(httpServer);
const app = createApp(wss);

httpServer.on('request', app);

httpServer.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});

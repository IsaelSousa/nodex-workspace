import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { nodeRoutes } from './routes/nodes.js';
import { eventRoutes } from './routes/events.js';
import { settingsRoutes } from './routes/settings.js';
import { projectRoutes } from './routes/projects.js';
import { timeEntryRoutes } from './routes/time-entries.js';
import { backupRoutes } from './routes/backup.js';
import { initDatabase, db } from './db/sqlite.js';
import { startReminderScheduler } from './telegram.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: 'info',
  },
  bodyLimit: 50 * 1024 * 1024,
});

async function main() {
  initDatabase();
  startReminderScheduler();

  await fastify.register(cors, {
    origin: '*',
  });

  await fastify.register(websocket);

  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (socket, req) => {
      fastify.log.info('Novo cliente conectado via WebSocket');

      socket.on('message', (message: string) => {
        fastify.websocketServer.clients.forEach((client) => {
          if (client !== socket && client.readyState === 1) {
            client.send(message);
          }
        });
      });

      socket.on('close', () => {
        fastify.log.info('Cliente WebSocket desconectado');
      });
    });
  });

  await fastify.register(nodeRoutes);
  await fastify.register(eventRoutes);
  await fastify.register(settingsRoutes);
  await fastify.register(projectRoutes);
  await fastify.register(timeEntryRoutes);
  await fastify.register(backupRoutes);

  const webDistPath = path.resolve(__dirname, '../../web/dist');
  try {
    await fastify.register(fastifyStatic, {
      root: webDistPath,
      prefix: '/',
    });

    fastify.setNotFoundHandler((req, reply) => {
      if (!req.raw.url?.startsWith('/api') && !req.raw.url?.startsWith('/ws')) {
        return reply.sendFile('index.html');
      }
      return reply.status(404).send({ error: 'Not found' });
    });
  } catch (err) {
    fastify.log.warn('Web dist folder not found, running in API-only mode');
  }

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 NodeX Server rodando em http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();

function shutdown() {
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

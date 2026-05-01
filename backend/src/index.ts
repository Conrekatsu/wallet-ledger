import 'dotenv/config';
import app, { beginShutdown, getInFlightRequests } from './app';
import pool from './db/pool';
import { logger } from './lib/logger';


const PORT = process.env.PORT ?? 4000;
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10000);

const server = app.listen(PORT, () => {
  logger.info('Backend server started', { port: PORT });
});

let isShuttingDown = false;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForInFlightRequestsToDrain(timeoutMs: number) {
  const startedAt = Date.now();
  while (getInFlightRequests() > 0) {
    if (Date.now() - startedAt >= timeoutMs) {
      logger.warn('Shutdown timeout reached before draining in-flight requests', {
        inFlightRequests: getInFlightRequests(),
      });
      break;
    }
    await sleep(100);
  }
}

function closeServer() {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function shutdown(signal: NodeJS.Signals) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info('Received shutdown signal', { signal });
  beginShutdown();

  try {
    await waitForInFlightRequestsToDrain(SHUTDOWN_TIMEOUT_MS);
    await closeServer();
    await pool.end();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Graceful shutdown failed', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

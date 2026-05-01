import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import transactionRoutes from './routes/transactions';
import accountRoutes from './routes/accounts';
import { logger } from './lib/logger';
import { getMetricsSnapshot } from './lib/metrics';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import { errorHandler } from './middleware/errorHandler';
import { globalApiLimiter, strictWriteLimiter } from './middleware/rateLimit';

const app = express();
let isShuttingDown = false;
let inFlightRequests = 0;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    logger.info('HTTP request completed', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
});
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.setHeader('Connection', 'close');
    res.status(503).json({ error: 'Server is shutting down' });
    return;
  }

  inFlightRequests += 1;
  let done = false;
  const onComplete = () => {
    if (done) return;
    done = true;
    inFlightRequests -= 1;
  };
  res.on('finish', onComplete);
  res.on('close', onComplete);
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', globalApiLimiter);
app.use('/api/accounts/:id/funds', strictWriteLimiter);
app.use('/api/transfers', strictWriteLimiter);
app.use('/api/transfers/:id/retry', strictWriteLimiter);
app.use('/api', apiKeyAuth);
app.get('/api/metrics', (_req, res) => {
  res.json(getMetricsSnapshot());
});
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transfers', transactionRoutes);
app.use(errorHandler);

export function beginShutdown() {
  isShuttingDown = true;
}

export function getInFlightRequests() {
  return inFlightRequests;
}

export default app;

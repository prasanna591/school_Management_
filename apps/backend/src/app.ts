import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { corsOrigins, env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { auditLogger } from './middleware/auditLogger';
import { apiRateLimiter } from './middleware/rateLimit';
import { apiRouter } from './routes';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY ? 1 : false);

  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));
  app.use(auditLogger);

  app.use(env.API_PREFIX, apiRateLimiter);

  app.get('/', (_req, res) => {
    res.status(200).json({
      success: true,
      data: { name: 'PSM School Management API', version: '0.1.0', docs: `${env.API_PREFIX}/health` },
    });
  });

  app.use(env.API_PREFIX, apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

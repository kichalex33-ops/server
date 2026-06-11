import { Express } from 'express';
import compression from 'compression';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

function configureSecurity(app: Express) {
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  const allowedOrigins = corsOrigin === '*'
    ? '*'
    : corsOrigin.split(',').map((item) => item.trim()).filter(Boolean);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  app.use(compression());
  app.use(cors({ origin: allowedOrigins }));
  app.use(rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 600),
    standardHeaders: true,
    legacyHeaders: false
  }));
}

export default configureSecurity;

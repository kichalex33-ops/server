import { Request, Response, NextFunction } from 'express';

function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = new Date().toISOString();
  res.on('finish', () => {
    console.log(`[API] ${startedAt} ${req.method} ${req.originalUrl} ${res.statusCode} ${req.ip}`);
  });
  next();
}

export default requestLogger;

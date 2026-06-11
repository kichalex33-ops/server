import { Request, Response, NextFunction } from 'express';

interface HttpError extends Error {
  statusCode?: number;
  status?: number;
}

function errorHandler(error: HttpError, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(error);

  const status = error.statusCode || error.status || 500;
  const message = status >= 500 ? 'Erro ao processar requisicao.' : error.message;

  if (status >= 500) {
    console.error('[API] Erro interno', error);
  }

  return res.status(status).json({
    ok: false,
    error: message
  });
}

export default errorHandler;

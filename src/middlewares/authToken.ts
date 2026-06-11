import { Request, Response, NextFunction } from 'express';

function authToken(req: Request, res: Response, next: NextFunction) {
  const token = process.env.API_TOKEN || '';
  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const publicCredentialRoutes = new Set([
    '/api/driver/login',
    '/api/driver/pairing/confirm'
  ]);

  if (!writeMethods.includes(req.method) || token === '' || publicCredentialRoutes.has(req.path)) {
    return next();
  }

  const authorization = req.get('authorization') || '';
  const apiToken = req.get('x-api-token') || '';
  const bearer = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (bearer === token || apiToken === token) {
    return next();
  }

  return res.status(401).json({ ok: false, error: 'Token de API invalido ou ausente.' });
}

export default authToken;

import { Request, Response, NextFunction } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any> | any;

function asyncHandler(handler: AsyncHandler) {
  return function wrappedHandler(req: Request, res: Response, next: NextFunction) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export default asyncHandler;

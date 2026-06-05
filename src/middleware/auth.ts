import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
import { AppError, sendError } from '../utils/response';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new AppError('JWT secret not configured', 500);

    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, new AppError('Invalid or expired token', 401, 'TOKEN_INVALID'));
    } else {
      sendError(res, error);
    }
  }
};

export const authorize = (...roles: Array<'user' | 'admin'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, new AppError('Not authenticated', 401, 'UNAUTHORIZED'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
      return;
    }
    next();
  };
};

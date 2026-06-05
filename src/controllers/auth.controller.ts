import { Request, Response } from 'express';
import * as AuthService from '../services/auth.service';
import { RegisterSchema, LoginSchema } from '../utils/schemas';
import { sendSuccess, sendError } from '../utils/response';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = RegisterSchema.parse(req.body);
    const data = await AuthService.register(input);
    sendSuccess(res, data, 201);
  } catch (error) {
    sendError(res, error);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = LoginSchema.parse(req.body);
    const data = await AuthService.login(input);
    sendSuccess(res, data);
  } catch (error) {
    sendError(res, error);
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await AuthService.getProfile(req.user!.userId);
    sendSuccess(res, user);
  } catch (error) {
    sendError(res, error);
  }
};

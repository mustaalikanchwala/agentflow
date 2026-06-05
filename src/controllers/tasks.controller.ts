import { Request, Response } from 'express';
import * as TaskService from '../services/task.service';
import { CreateTaskSchema, UpdateTaskSchema } from '../utils/schemas';
import { sendSuccess, sendError } from '../utils/response';

export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = CreateTaskSchema.parse(req.body);
    const task = await TaskService.createTask(req.user!.userId, input);
    sendSuccess(res, task, 201);
  } catch (error) {
    sendError(res, error);
  }
};

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tasks, total, page, limit } = await TaskService.getTasks(
      req.user!.userId,
      req.query as Record<string, string>
    );
    sendSuccess(res, tasks, 200, { total, page, limit });
  } catch (error) {
    sendError(res, error);
  }
};

export const getTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const task = await TaskService.getTask(req.params.id, req.user!.userId);
    sendSuccess(res, task);
  } catch (error) {
    sendError(res, error);
  }
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const input = UpdateTaskSchema.parse(req.body);
    const task = await TaskService.updateTask(req.params.id, req.user!.userId, input);
    sendSuccess(res, task);
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await TaskService.deleteTask(req.params.id, req.user!.userId);
    sendSuccess(res, result);
  } catch (error) {
    sendError(res, error);
  }
};

export const getAllTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const tasks = await TaskService.getAllTasks();
    sendSuccess(res, tasks);
  } catch (error) {
    sendError(res, error);
  }
};

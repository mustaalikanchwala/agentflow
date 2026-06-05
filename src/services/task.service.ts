import * as TaskRepository from '../repositories/task.repository';
import { AppError } from '../utils/response';
import { CreateTaskInput, UpdateTaskInput } from '../utils/schemas';

// ─── Service methods ──────────────────────────────────────────────────────────

export const createTask = async (userId: string, input: CreateTaskInput) => {
  const id = crypto.randomUUID();
  return await TaskRepository.createTask(
    id,
    userId,
    input.title,
    input.description ?? null,
    input.priority,
    input.metadata
  );
};

export const getTasks = async (
  userId: string,
  query: { status?: string; priority?: string; page?: string; limit?: string }
) => {
  const page = parseInt(query.page ?? '1');
  const limit = parseInt(query.limit ?? '20');
  const offset = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    TaskRepository.findTasksByUser(userId, { status: query.status, priority: query.priority }, limit, offset),
    TaskRepository.countTasksByUser(userId),
  ]);

  return { tasks, total, page, limit };
};

export const getTask = async (id: string, userId: string) => {
  const task = await TaskRepository.findTaskById(id, userId);
  if (!task) throw new AppError('Task not found', 404);
  return task;
};

export const updateTask = async (id: string, userId: string, input: UpdateTaskInput) => {
  // Ensure task exists and belongs to user
  const existing = await TaskRepository.findTaskById(id, userId);
  if (!existing) throw new AppError('Task not found', 404);

  if (Object.keys(input).length === 0) {
    throw new AppError('No fields to update', 400);
  }

  const updated = await TaskRepository.updateTask(id, userId, input);
  return updated;
};

export const deleteTask = async (id: string, userId: string) => {
  const deleted = await TaskRepository.deleteTask(id, userId);
  if (!deleted) throw new AppError('Task not found', 404);
  return { deleted: true, id };
};

export const getAllTasks = async () => {
  return await TaskRepository.findAllTasks();
};

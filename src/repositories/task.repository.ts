import pool from '../db/pool';
import { Task } from '../types';

export const createTask = async (
  id: string,
  userId: string,
  title: string,
  description: string | null,
  priority: string,
  metadata: object
): Promise<Task> => {
  const result = await pool.query<Task>(
    `INSERT INTO tasks (id, user_id, title, description, priority, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, userId, title, description, priority, JSON.stringify(metadata)]
  );
  return result.rows[0];
};

export const findTasksByUser = async (
  userId: string,
  filters: { status?: string; priority?: string },
  limit: number,
  offset: number
): Promise<Task[]> => {
  let query = `SELECT * FROM tasks WHERE user_id = $1`;
  const params: unknown[] = [userId];
  let idx = 2;

  if (filters.status) {
    query += ` AND status = $${idx++}`;
    params.push(filters.status);
  }
  if (filters.priority) {
    query += ` AND priority = $${idx++}`;
    params.push(filters.priority);
  }

  query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
  params.push(limit, offset);

  const result = await pool.query<Task>(query, params);
  return result.rows;
};

export const countTasksByUser = async (userId: string): Promise<number> => {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) FROM tasks WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0].count);
};

export const findTaskById = async (
  id: string,
  userId: string
): Promise<Task | null> => {
  const result = await pool.query<Task>(
    `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] ?? null;
};

export const updateTask = async (
  id: string,
  userId: string,
  fields: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'metadata'>>
): Promise<Task | null> => {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (fields.title !== undefined)       { setClauses.push(`title = $${idx++}`);       values.push(fields.title); }
  if (fields.description !== undefined) { setClauses.push(`description = $${idx++}`); values.push(fields.description); }
  if (fields.status !== undefined)      { setClauses.push(`status = $${idx++}`);      values.push(fields.status); }
  if (fields.priority !== undefined)    { setClauses.push(`priority = $${idx++}`);    values.push(fields.priority); }
  if (fields.metadata !== undefined)    { setClauses.push(`metadata = $${idx++}`);    values.push(JSON.stringify(fields.metadata)); }

  if (setClauses.length === 0) return null;

  setClauses.push(`updated_at = NOW()`);
  values.push(id, userId);

  const result = await pool.query<Task>(
    `UPDATE tasks SET ${setClauses.join(', ')}
     WHERE id = $${idx++} AND user_id = $${idx}
     RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
};

export const deleteTask = async (
  id: string,
  userId: string
): Promise<boolean> => {
  const result = await pool.query(
    `DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  return result.rows.length > 0;
};

// Admin only
export const findAllTasks = async (): Promise<Task[]> => {
  const result = await pool.query<Task>(
    `SELECT t.*, u.email AS user_email
     FROM tasks t
     JOIN users u ON t.user_id = u.id
     ORDER BY t.created_at DESC
     LIMIT 100`
  );
  return result.rows;
};

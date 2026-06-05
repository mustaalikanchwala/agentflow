import pool from '../db/pool';
import { AgentRun, ToolCall } from '../types';

export const createRun = async (
  id: string,
  userId: string,
  prompt: string
): Promise<AgentRun> => {
  const result = await pool.query<AgentRun>(
    `INSERT INTO agent_runs (id, user_id, prompt, status)
     VALUES ($1, $2, $3, 'running')
     RETURNING *`,
    [id, userId, prompt]
  );
  return result.rows[0];
};

export const completeRun = async (
  id: string,
  result: string,
  toolCalls: ToolCall[]
): Promise<AgentRun> => {
  const updated = await pool.query<AgentRun>(
    `UPDATE agent_runs
     SET status = 'completed', result = $1, tool_calls = $2, completed_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [result, JSON.stringify(toolCalls), id]
  );
  return updated.rows[0];
};

export const failRun = async (
  id: string,
  error: string
): Promise<void> => {
  await pool.query(
    `UPDATE agent_runs
     SET status = 'failed', error = $1, completed_at = NOW()
     WHERE id = $2`,
    [error, id]
  );
};

export const findRunsByUser = async (userId: string): Promise<AgentRun[]> => {
  const result = await pool.query<AgentRun>(
    `SELECT * FROM agent_runs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );
  return result.rows;
};

export const findRunById = async (
  id: string,
  userId: string
): Promise<AgentRun | null> => {
  const result = await pool.query<AgentRun>(
    `SELECT * FROM agent_runs WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] ?? null;
};

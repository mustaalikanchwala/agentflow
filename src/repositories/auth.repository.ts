import pool from '../db/pool';
import { User } from '../types';

// Find user by email
export const findByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query<User>(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0] ?? null;
};

// Find user by id
export const findById = async (id: string): Promise<User | null> => {
  const result = await pool.query<User>(
    `SELECT id, email, role, created_at FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
};

// Create new user, return without password_hash
export const createUser = async (
  id: string,
  email: string,
  passwordHash: string,
  role: 'user' | 'admin'
): Promise<Pick<User, 'id' | 'email' | 'role' | 'created_at'>> => {
  const result = await pool.query<User>(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, role, created_at`,
    [id, email, passwordHash, role]
  );
  return result.rows[0];
};

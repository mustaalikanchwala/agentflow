import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as AuthRepository from '../repositories/auth.repository';
import { AppError } from '../utils/response';
import { JwtPayload, User } from '../types';
import { RegisterInput, LoginInput } from '../utils/schemas';

// ─── JWT helper ───────────────────────────────────────────────────────────────

const signToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

// ─── Service methods ──────────────────────────────────────────────────────────

export const register = async (input: RegisterInput) => {
  // Check if email already exists
  const existing = await AuthRepository.findByEmail(input.email);
  if (existing) {
    throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(input.password, 12);
  const id = crypto.randomUUID();

  // Persist user
  const user = await AuthRepository.createUser(id, input.email, passwordHash, input.role);

  // Sign and return token
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  return { user, token };
};

export const login = async (input: LoginInput) => {
  // Find user
  const user = await AuthRepository.findByEmail(input.email);
  if (!user) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Verify password
  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  return {
    user: { id: user.id, email: user.email, role: user.role },
    token,
  };
};

export const getProfile = async (userId: string) => {
  const user = await AuthRepository.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

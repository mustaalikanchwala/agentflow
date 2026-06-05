export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: Date;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface AgentRun {
  id: string;
  user_id: string;
  prompt: string;
  status: 'running' | 'completed' | 'failed';
  tool_calls: ToolCall[];
  result: string | null;
  error: string | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface ToolCall {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  timestamp: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

// Extend Express Request to carry user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

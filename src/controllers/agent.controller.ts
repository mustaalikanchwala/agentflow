import { Request, Response } from 'express';
import * as AgentService from '../services/agent.service';
import { AgentRunSchema } from '../utils/schemas';
import { sendSuccess, sendError } from '../utils/response';

export const startAgentRun = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt } = AgentRunSchema.parse(req.body);
    const run = await AgentService.startRun(prompt, req.user!.userId);
    sendSuccess(res, run, 201);
  } catch (error) {
    sendError(res, error);
  }
};

export const getAgentRuns = async (req: Request, res: Response): Promise<void> => {
  try {
    const runs = await AgentService.getRuns(req.user!.userId);
    sendSuccess(res, runs);
  } catch (error) {
    sendError(res, error);
  }
};

export const getAgentRun = async (req: Request, res: Response): Promise<void> => {
  try {
    const run = await AgentService.getRun(req.params.id, req.user!.userId);
    sendSuccess(res, run);
  } catch (error) {
    sendError(res, error);
  }
};

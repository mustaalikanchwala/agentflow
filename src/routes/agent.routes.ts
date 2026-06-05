import { Router } from 'express';
import { startAgentRun, getAgentRuns, getAgentRun } from '../controllers/agent.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/run', startAgentRun);
router.get('/runs', getAgentRuns);
router.get('/runs/:id', getAgentRun);

export default router;

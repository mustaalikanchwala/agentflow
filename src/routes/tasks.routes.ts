import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  getAllTasks,
} from '../controllers/tasks.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All task routes require authentication
router.use(authenticate);

router.post('/', createTask);
router.get('/', getTasks);
router.get('/:id', getTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

// Admin only
router.get('/admin/all', authorize('admin'), getAllTasks);

export default router;

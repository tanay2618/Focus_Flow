import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as tasks from '../controllers/task.controller.js';

const router = Router();
router.use(requireAuth); // every task route is protected and user-scoped

router.get('/', tasks.listTasks);
router.post('/', tasks.createTask);
router.get('/stats', tasks.getStats); // must stay above '/:id'
router.get('/:id', tasks.getTask);
router.put('/:id', tasks.updateTask);
router.patch('/:id/complete', tasks.completeTask);
router.delete('/:id', tasks.deleteTask);

export default router;

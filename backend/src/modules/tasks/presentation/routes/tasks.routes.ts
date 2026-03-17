import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { validate } from '../../../../middlewares/validate.middleware';
import { CreateTaskSchema, UpdateTaskStatusSchema } from '../validators/tasks.validators';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', validate(CreateTaskSchema), TaskController.createTask);
router.get('/', TaskController.getTasks);
router.patch('/:id/status', validate(UpdateTaskStatusSchema), TaskController.updateStatus);
router.get('/stats', TaskController.getStats);

export default router;

import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { validate } from '../../../../middlewares/validate.middleware';
import { CreateTaskSchema, UpdateTaskSchema, UpdateTaskStatusSchema } from '../validators/tasks.validators';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Tasks
 *   description: Task management and tracking
 */

router.use(authenticate);

/**
 * @openapi
 * /tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a new task
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task created successfully
 */
router.post('/', validate(CreateTaskSchema), TaskController.createTask);

/**
 * @openapi
 * /tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Get all tasks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tasks retrieved
 */
router.get('/', TaskController.getTasks);

router.get('/stats', TaskController.getStats);

router.get('/:id', TaskController.getTaskById);

router.put('/:id', validate(UpdateTaskSchema), TaskController.updateTask);

/**
 * @openapi
 * /tasks/{id}/status:
 *   patch:
 *     tags: [Tasks]
 *     summary: Update task status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.patch('/:id/status', validate(UpdateTaskStatusSchema), TaskController.updateStatus);

router.delete('/:id', TaskController.deleteTask);

/**
 * @openapi
 * /tasks/stats:
 *   get:
 *     tags: [Tasks]
 *     summary: Get task statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved
 */
export default router;

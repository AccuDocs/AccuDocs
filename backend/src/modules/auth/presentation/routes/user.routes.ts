import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, adminOnly } from '../../../../middlewares/auth.middleware';
import { validate } from '../../../../middlewares';
import { createUserSchema, updateUserSchema } from '../../../../utils/validators';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Users
 *   description: User management (admin only)
 */

router.use(authenticate);
router.use(adminOnly);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users in the organization
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved
 */
router.get('/', UserController.getUsers);
router.post('/', validate(createUserSchema), UserController.createUser);

/**
 * @openapi
 * /users/{id}/toggle-status:
 *   patch:
 *     tags: [Users]
 *     summary: Toggle user active status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User status toggled
 */
router.patch('/:id/toggle-status', UserController.toggleStatus);
router.get('/:id', UserController.getUser);
router.put('/:id', validate(updateUserSchema), UserController.updateUser);

export default router;

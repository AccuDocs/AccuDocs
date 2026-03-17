import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, adminOnly } from '../../../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(adminOnly);

router.get('/', UserController.getUsers);
router.patch('/:id/toggle-status', UserController.toggleStatus);

export default router;

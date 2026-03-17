import { Router } from 'express';
import { WhatsAppController } from '../controllers/WhatsAppController';
import { authenticate, adminOnly } from '../../../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(adminOnly);

router.get('/qr', WhatsAppController.getQR);
router.get('/status', WhatsAppController.getStatus);
router.post('/logout', WhatsAppController.logout);

export default router;

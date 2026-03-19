import { Router } from 'express';
import { WhatsAppController } from '../controllers/WhatsAppController';
import { authenticate, adminOnly } from '../../../../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: WhatsApp
 *   description: WhatsApp Integration and QR Management
 */

router.use(authenticate);
router.use(adminOnly);

/**
 * @openapi
 * /whatsapp/qr:
 *   get:
 *     tags: [WhatsApp]
 *     summary: Get WhatsApp connection QR code
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR code data retrieved
 */
router.get('/qr', WhatsAppController.getQR);

/**
 * @openapi
 * /whatsapp/status:
 *   get:
 *     tags: [WhatsApp]
 *     summary: Get WhatsApp connection status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection status retrieved
 */
router.get('/status', WhatsAppController.getStatus);

/**
 * @openapi
 * /whatsapp/logout:
 *   post:
 *     tags: [WhatsApp]
 *     summary: Logout WhatsApp session
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', WhatsAppController.logout);

export default router;

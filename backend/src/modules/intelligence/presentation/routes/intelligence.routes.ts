import { Router } from 'express';
import { IntelligenceController } from '../controllers/IntelligenceController';
import { validate } from '../../../../middlewares/validate.middleware';
import { ClientParamSchema } from '../validators/intelligence.validators';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Intelligence
 *   description: AI-driven financial forecasts and risk analysis
 */

router.use(authenticate);

/**
 * @openapi
 * /intelligence/forecasts/{yearId}:
 *   get:
 *     tags: [Intelligence]
 *     summary: Get financial forecasts for a specific year
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: yearId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Forecast data retrieved
 */
router.get('/forecasts/:yearId', IntelligenceController.getForecasts);

/**
 * @openapi
 * /intelligence/risks/{clientId}:
 *   get:
 *     tags: [Intelligence]
 *     summary: Get AI risk analysis for a specific client
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Risk analysis data retrieved
 */
router.get('/risks/:clientId', validate(ClientParamSchema, 'params'), IntelligenceController.getClientRisk);

export default router;

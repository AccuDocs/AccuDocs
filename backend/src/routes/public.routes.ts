import { Router } from 'express';
import { PaymentLinkController } from '../modules/billing/presentation/controllers/PaymentLinkController';
import { asyncHandler } from '../middlewares';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Public
 *   description: Unauthenticated public endpoints (payment links, client uploads)
 */

/**
 * GET /public/pay/:token
 * Returns sanitised invoice summary for payment page — no authentication required.
 */
router.get('/pay/:token', PaymentLinkController.getPublicSummary);

/**
 * POST /public/pay/:token/confirm
 * Manually confirm payment received — no authentication required.
 */
router.post('/pay/:token/confirm', PaymentLinkController.markPaid);

export default router;

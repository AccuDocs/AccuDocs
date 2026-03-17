import { Router } from 'express';
import { IntelligenceController } from '../controllers/IntelligenceController';
import { validate } from '../../../../middlewares/validate.middleware';
import { ClientParamSchema } from '../validators/intelligence.validators';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// We will let yearId be validated generically or loosely in the controller path
router.get('/forecasts/:yearId', IntelligenceController.getForecasts);

// We validate clientId in params using our schema (can map it in a middleware extension or rely on controller checking)
router.get('/risks/:clientId', validate(ClientParamSchema, 'params'), IntelligenceController.getClientRisk);

export default router;

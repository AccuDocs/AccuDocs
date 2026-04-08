import { Router } from 'express';
import { GstController } from '../controllers/gst.controller';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();
const gstController = new GstController();

// Create/Update draft via autofetch
router.post('/draft', authenticate, gstController.draftReturn.bind(gstController));

// Client returns endpoint
router.get('/client/:clientId', authenticate, gstController.getReturns.bind(gstController));

// CRUD ops for individual return
router.get('/:id', authenticate, gstController.getReturnById.bind(gstController));
router.put('/:id', authenticate, gstController.updateReturn.bind(gstController));
router.delete('/:id', authenticate, gstController.deleteReturn.bind(gstController));

// Portal JSON export
router.get('/:id/export-json', authenticate, gstController.exportJson.bind(gstController));

// Manual sync to workspace
router.post('/:id/save-to-workspace', authenticate, gstController.saveToWorkspace.bind(gstController));

export default router;

import { Router } from 'express';
import multer from 'multer';
import { GstController } from '../controllers/gst.controller';
import { HsnSacController } from '../controllers/HsnSacController';
import { ITCController } from '../controllers/ITCController';
import { GSTR2AController } from '../controllers/GSTR2AController';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();
const gstController = new GstController();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// ─── Existing GST return endpoints ────────────────────────────────────────────
router.post('/draft', authenticate, gstController.draftReturn.bind(gstController));
router.get('/client/:clientId', authenticate, gstController.getReturns.bind(gstController));
router.get('/:id', authenticate, gstController.getReturnById.bind(gstController));
router.put('/:id', authenticate, gstController.updateReturn.bind(gstController));
router.delete('/:id', authenticate, gstController.deleteReturn.bind(gstController));
router.get('/:id/export-json', authenticate, gstController.exportJson.bind(gstController));
router.post('/:id/save-to-workspace', authenticate, gstController.saveToWorkspace.bind(gstController));

// ─── HSN/SAC Code Directory ───────────────────────────────────────────────────
/** GET /gst/hsn-sac/search?q=&type=&rate=&page=&limit= */
router.get('/hsn-sac/search', authenticate, HsnSacController.search);
/** GET /gst/hsn-sac/:id */
router.get('/hsn-sac/:id', authenticate, HsnSacController.getById);
/** POST /gst/hsn-sac/import */
router.post('/hsn-sac/import', authenticate, upload.single('file'), HsnSacController.importExcel);
/** POST /gst/hsn-sac/lookup-online */
router.post('/hsn-sac/lookup-online', authenticate, HsnSacController.onlineLookup);

// ─── ITC Tracker ─────────────────────────────────────────────────────────────
/** GET /gst/itc/:clientId?period=YYYY-MM */
router.get('/itc/:clientId', authenticate, ITCController.getLedger);
/** POST /gst/itc/:clientId/calculate */
router.post('/itc/:clientId/calculate', authenticate, ITCController.calculate);

// ─── GSTR-2A Reconciliation ───────────────────────────────────────────────────
/** POST /gst/gstr2a/reconcile */
router.post('/gstr2a/reconcile', authenticate, GSTR2AController.reconcile);
/** GET /gst/gstr2a/reconciliation/:clientId?period=YYYY-MM */
router.get('/gstr2a/reconciliation/:clientId', authenticate, GSTR2AController.getReconciliation);

export default router;

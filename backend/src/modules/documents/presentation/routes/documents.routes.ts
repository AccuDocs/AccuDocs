import { Router } from 'express';
import multer from 'multer';
import { DocumentController } from '../controllers/DocumentController';
import { authenticate } from '../../../../middlewares/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

router.use(authenticate);

router.post('/upload', upload.single('file'), DocumentController.upload);
router.get('/clients/:clientId/folders', DocumentController.getFolders);
router.get('/folders/:folderId/documents', DocumentController.getFolderDocuments);
router.get('/download/:id', DocumentController.download);
router.patch('/:id/share', DocumentController.share);
router.get('/stats', DocumentController.getStats);

export default router;

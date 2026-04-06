import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController';
import { authenticate } from '../../../../middlewares/auth.middleware';
import { uploadSingle } from '../../../../middlewares/upload.middleware';

const router = Router();

router.use(authenticate);

// Tree View for Workspace
router.get('/clients/:clientId', DocumentController.getFolders);

// Folder Contents and Breadcrumbs
router.get('/folders/:folderId', DocumentController.getFolderDocuments);

// Create Folder
router.post('/folders', DocumentController.createFolder);

// Files Upload
router.post('/files/upload', uploadSingle, DocumentController.upload);

// Files Download
router.get('/files/:id/download', DocumentController.download);

// Global Files List
router.get('/files', DocumentController.listFiles);

export default router;

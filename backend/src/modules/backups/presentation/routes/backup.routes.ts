import { Router } from 'express';
import { authenticate } from '../../../../middlewares/auth.middleware';
import { requireRole } from '../../../../middlewares/role.middleware';
import { BackupController } from '../controllers/BackupController';
import { config } from '../../../../config/env.config';

const router = Router();

router.get('/portal', BackupController.portal);

if (config.backup.authRequired) {
  router.use(authenticate, requireRole('admin'));
}

router.get('/status', BackupController.status);
router.get('/history', BackupController.history);
router.get('/files', BackupController.files);
router.get('/files/:fileName/download', BackupController.downloadFile);
router.delete('/files/:fileName', BackupController.deleteFile);
router.post('/run', BackupController.run);
router.post('/test-drive', BackupController.testDrive);

export default router;

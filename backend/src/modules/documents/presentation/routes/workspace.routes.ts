import { Router } from 'express';
import { DocumentController } from '../controllers/DocumentController';
import { authenticate } from '../../../../middlewares/auth.middleware';
import { uploadSingle } from '../../../../middlewares/upload.middleware';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Workspace
 *   description: Document workspace management (folders, files, tree view)
 */

router.use(authenticate);

/**
 * @openapi
 * /workspace/clients/{clientId}:
 *   get:
 *     tags: [Workspace]
 *     summary: Get folder tree for a client
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
 *         description: Folder tree retrieved
 */
router.get('/clients/:clientId', DocumentController.getFolders);

/**
 * @openapi
 * /workspace/folders/{folderId}:
 *   get:
 *     tags: [Workspace]
 *     summary: Get documents inside a folder
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Folder contents retrieved
 */
router.get('/folders/:folderId', DocumentController.getFolderDocuments);

/**
 * @openapi
 * /workspace/folders:
 *   post:
 *     tags: [Workspace]
 *     summary: Create a new folder
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               parentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Folder created successfully
 */
router.post('/folders', DocumentController.createFolder);

/**
 * @openapi
 * /workspace/files/upload:
 *   post:
 *     tags: [Workspace]
 *     summary: Upload a file to workspace
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
 */
router.post('/files/upload', uploadSingle, DocumentController.upload);

/**
 * @openapi
 * /workspace/files/{id}/download:
 *   get:
 *     tags: [Workspace]
 *     summary: Download a file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File downloaded
 */
router.get('/files/:id/download', DocumentController.download);

/**
 * @openapi
 * /workspace/files/{id}:
 *   delete:
 *     tags: [Workspace]
 *     summary: Delete a file
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: File deleted successfully
 */
router.delete('/files/:id', DocumentController.deleteDocument);

/**
 * @openapi
 * /workspace/folders/{id}:
 *   delete:
 *     tags: [Workspace]
 *     summary: Delete a folder
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Folder deleted successfully
 */
router.delete('/folders/:id', DocumentController.deleteFolder);

/**
 * @openapi
 * /workspace/files:
 *   get:
 *     tags: [Workspace]
 *     summary: List all files in workspace
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of files retrieved
 */
router.get('/files', DocumentController.listFiles);

export default router;

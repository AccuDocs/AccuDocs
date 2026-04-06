import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { DocumentService } from '../../application/services/DocumentService';
import { sendSuccess, sendCreated, sendPaginated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class DocumentController {
  
  static upload = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DocumentService);
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
    }

    const doc = await service.uploadDocument(
      req.user!.organizationId,
      req.user!.userId,
      req.body.folderId,
      req.file
    );
    sendCreated(res, doc, 'Document uploaded successfully');
  });

  static createFolder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DocumentService);
    const folder = await service.createFolder(req.user!.organizationId, req.user!.userId, req.body);
    sendSuccess(res, folder, 'Folder created successfully');
  });

  static getFolders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DocumentService);
    const folders = await service.getFolders(req.user!.organizationId, req.params.clientId);
    sendSuccess(res, folders);
  });

  static getFolderDocuments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DocumentService);
    const result = await service.getFolderDetails(req.user!.organizationId, req.params.folderId);
    sendSuccess(res, result);
  });

  static deleteDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DocumentService);
    await service.deleteDocument(req.params.id, req.user!.organizationId);
    sendSuccess(res, null, 'Document deleted successfully');
  });

  static deleteFolder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DocumentService);
    await service.deleteFolder(req.params.id, req.user!.organizationId);
    sendSuccess(res, null, 'Folder deleted successfully');
  });

  static download = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DocumentService);
    const result = await service.getDownloadUrl(req.user!.organizationId, req.params.id);
    sendSuccess(res, result);
  });

  static share = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DocumentService);
    const result = await service.shareDocument(req.user!.organizationId, req.params.id, req.body);
    sendSuccess(res, result, 'Document shared successfully');
  });

  static getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DocumentService);
    const stats = await service.getStats(req.user!.organizationId);
    sendSuccess(res, stats);
  });

  static listFiles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DocumentService);
    const { page = 1, limit = 10, sortBy, sortOrder = 'desc' } = req.query;
    const { documents, total } = await service.listFiles(
      req.user!.organizationId,
      { page: Number(page), limit: Number(limit), sortBy: sortBy as string, sortOrder: sortOrder as any }
    );
    sendPaginated(res, documents, Number(page), Number(limit), total);
  });
}

import { Response } from 'express';
import { container } from 'tsyringe';
import { DatabaseBackupService, BackupKind, BackupDestination } from '../../application/services/DatabaseBackupService';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';
import { sendSuccess } from '../../../../utils/response';
import { BadRequestError } from '../../../../utils/errors';
import { renderBackupPortal } from '../views/backupPortal.view';
import { config } from '../../../../config/env.config';

export class BackupController {
  static portal = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    res.type('html').send(renderBackupPortal());
  });

  static status = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DatabaseBackupService);
    sendSuccess(res, await service.getStatus());
  });

  static history = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DatabaseBackupService);
    sendSuccess(res, await service.listRuns(Number(req.query.limit || 20)));
  });

  static files = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DatabaseBackupService);
    sendSuccess(res, await service.listLocalBackupFiles());
  });

  static downloadFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DatabaseBackupService);
    const file = await service.getLocalBackupFile(req.params.fileName);
    res.download(file.filePath, file.fileName);
  });

  static deleteFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DatabaseBackupService);
    sendSuccess(res, await service.deleteLocalBackupFile(req.params.fileName), 'Backup file deleted');
  });

  static run = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DatabaseBackupService);
    const kind = (req.body?.kind ?? 'both') as BackupKind | 'both';
    const destination = (req.body?.destination ?? config.backup.destination) as BackupDestination;

    if (!['schema', 'full', 'both'].includes(kind)) {
      throw new BadRequestError('Backup kind must be schema, full, or both');
    }

    if (!['drive', 'local'].includes(destination)) {
      throw new BadRequestError('Backup destination must be drive or local');
    }

    const result = kind === 'both'
      ? await service.runBackupPair('manual', req.user?.userId, destination)
      : await service.runBackup(kind, 'manual', req.user?.userId, destination);

    sendSuccess(res, result, 'Backup completed');
  });

  static testDrive = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(DatabaseBackupService);
    sendSuccess(res, await service.testGoogleDrive(), 'Google Drive connection verified');
  });
}

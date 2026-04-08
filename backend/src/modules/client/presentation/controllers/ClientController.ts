import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { ClientService } from '../../application/services/ClientService';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class ClientController {

  static createClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ClientService);
    const client = await service.create(req.body, req.user!.userId, req.user!.organizationId, req.files);
    sendCreated(res, client, 'Client created successfully');
  });

  static getClients = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ClientService);
    const { search, page = 1, limit = 10, sortBy, sortOrder = 'desc' } = req.query;

    const { clients, total } = await service.getAll(
      req.user!.organizationId,
      { search: search as string },
      { page: Number(page), limit: Number(limit), sortBy: sortBy as string, sortOrder: sortOrder as any }
    );
    sendPaginated(res, clients, Number(page), Number(limit), total);
  });

  static getClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ClientService);
    const client = await service.getById(req.params.id, req.user!.organizationId);
    sendSuccess(res, client);
  });

  static updateClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ClientService);
    const client = await service.update(req.params.id, req.body, req.user!.userId, req.user!.organizationId, req.files);
    sendSuccess(res, client, 'Client updated successfully');
  });

  static deleteClient = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ClientService);
    await service.delete(req.params.id, req.user!.organizationId);
    sendNoContent(res);
  });

  static getNextCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(ClientService);
    const code = await service.getNextCode(req.user!.organizationId);
    sendSuccess(res, { code });
  });
}

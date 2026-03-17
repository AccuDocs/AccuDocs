import { Response } from 'express';
import { container } from 'tsyringe';
import { UserService } from '../../application/services/UserService';
import { sendSuccess, sendPaginated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';

export class UserController {
  
  static getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(UserService);
    const result = await service.getUsers(req.user!.organizationId, req.query);
    
    sendPaginated(
      res, 
      result.users, 
      Number(req.query.page) || 1, 
      Number(req.query.limit) || 10, 
      result.total
    );
  });

  static toggleStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(UserService);
    const result = await service.toggleUserStatus(req.user!.organizationId, req.params.id);
    sendSuccess(res, result, 'User status updated successfully');
  });
}

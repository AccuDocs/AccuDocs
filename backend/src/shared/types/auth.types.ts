import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  organizationId: string;
  role: 'super_admin' | 'admin' | 'staff' | 'client';
  mobile: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

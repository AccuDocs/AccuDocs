import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../shared/types/auth.types';
import { AuditLog } from '../models/AuditLog.model';
import { logger } from '../utils/logger';

export const auditLogger = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const originalSend = res.send;

      res.send = function (body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          logActionAsync(req, res, body).catch(e => {
            logger.error(`Failed to register audit log: ${e.message}`);
          });
        }
        return originalSend.apply(res, arguments as any);
      };
    }
    next();
  };
};

async function logActionAsync(req: AuthenticatedRequest, res: Response, resBody: any) {
  const user = req.user;
  const orgId = user?.organizationId;
  
  if (!orgId) return;

  const entityType = determineEntityType(req.path);
  if (entityType === 'UNKNOWN') return;

  let entityId = '(unknown)';
  try {
    const parsedBody = JSON.parse(resBody);
    if (parsedBody.data && parsedBody.data.id) {
      entityId = parsedBody.data.id;
    }
  } catch (e) { }

  const changesObj = {
    path: req.path,
    method: req.method,
    body: redactSensitiveInfo(req.body),
    query: req.query
  };

  await AuditLog.create({
    organizationId: orgId,
    entityType: entityType as any,
    entityId: entityId,
    action: req.method === 'POST' ? 'CREATE' : req.method === 'DELETE' ? 'DELETE' : 'UPDATE',
    changes: changesObj,
    performedBy: user?.userId,
    ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
  });
}

function determineEntityType(path: string): string {
  if (path.includes('/invoice')) return 'INVOICE';
  if (path.includes('/payment')) return 'PAYMENT';
  if (path.includes('/client')) return 'CLIENT';
  if (path.includes('/document')) return 'DOCUMENT';
  if (path.includes('/task')) return 'TASK';
  if (path.includes('/auth')) return 'AUTH';
  return 'UNKNOWN';
}

function redactSensitiveInfo(obj: any): any {
  if (!obj) return obj;
  const clone = { ...obj };
  
  const sensitiveKeys = ['password', 'otp', 'token'];
  for (const key of sensitiveKeys) {
    if (clone[key]) clone[key] = '***REDACTED***';
  }

  return clone;
}

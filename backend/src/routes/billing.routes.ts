import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth, requireRole, requireOrganization } from '../middlewares';
import { Invoice } from '../models/invoice.model';
import { Client } from '../models/client.model';
import { Organization } from '../models/organization.model';
import { intelligenceService } from '../services/intelligence.service';
import { whatsappService } from '../services/whatsapp.service';
import { Op } from 'sequelize';

const router = Router();

// GET /api/v1/billing/metrics
// Get dashboard metrics for invoices
router.get('/metrics', authenticate, requireRole(['admin', 'finance_manager']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.role;
    const orgId = req.user?.organizationId;

    if (!orgId && userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(400).json({ status: 'error', message: 'Organization ID is missing' });
    }

    const where: any = {
      status: {
        [Op.in]: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']
      }
    };
    
    if (orgId) {
      where.organizationId = orgId;
    }

    // This is a simplified version of what would be a complex query or aggregation
    const outstandingInvoices = await Invoice.findAll({ where });

    let totalOutstanding = 0;
    let totalOverdue = 0;

    outstandingInvoices.forEach(inv => {
      totalOutstanding += Number(inv.outstandingAmount || 0);
      if (inv.status === 'OVERDUE') {
        totalOverdue += Number(inv.outstandingAmount || 0);
      }
    });

    const draftWhere: any = { status: 'DRAFT' };
    if (orgId) {
      draftWhere.organizationId = orgId;
    }
    
    const draftInvoices = await Invoice.count({ where: draftWhere });

    let revenueForecast30Days = 0;
    if (orgId) {
      const org = await Organization.findByPk(orgId);
      if (org) {
        const forecast = await intelligenceService.forecastRevenue(org);
        revenueForecast30Days = forecast.thirtyDays;
      }
    }

    res.json({
      status: 'success',
      data: {
        totalOutstanding,
        totalOverdue,
        draftInvoices,
        revenueForecast30Days
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/billing/invoices
// List invoices
router.get('/invoices', authenticate, requireRole(['admin', 'finance_manager', 'invoicing_officer']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.role;
    const orgId = req.user?.organizationId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!orgId && userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(400).json({ status: 'error', message: 'Organization ID is missing' });
    }

    const where: any = {};
    if (orgId) {
      where.organizationId = orgId;
    }

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [
        { model: Client, as: 'client', attributes: ['name', 'gstin'] }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      status: 'success',
      data: rows,
      total: count,
      limit,
      offset
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/billing/invoices/:id/whatsapp
// Sends the invoice to whatsapp
router.post('/invoices/:id/whatsapp', authenticate, requireRole(['admin', 'finance_manager', 'invoicing_officer']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoiceId = req.params.id;
    const userRole = req.user?.role;
    const orgId = req.user?.organizationId;

    const where: any = { id: invoiceId };
    if (orgId) {
      where.organizationId = orgId;
    }

    const invoice = await Invoice.findOne({
      where,
      include: [{ model: Client, as: 'client' }]
    });

    if (!invoice) {
      return res.status(404).json({ status: 'error', message: 'Invoice not found' });
    }

    // Use organizationId from invoice if user is admin without orgId
    const effectiveOrgId = orgId || invoice.organizationId;
    const org = await Organization.findByPk(effectiveOrgId);
    
    if (!org) {
      return res.status(404).json({ status: 'error', message: 'Organization not found' });
    }

    const success = await whatsappService.sendInvoice(invoice, org);

    if (success) {
      res.json({ status: 'success', message: 'WhatsApp message sent successfully' });
    } else {
      res.status(500).json({ status: 'error', message: 'Failed to send WhatsApp message' });
    }

  } catch (error) {
    next(error);
  }
});

export default router;

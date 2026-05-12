import { Response } from 'express';
import { Op, QueryTypes } from 'sequelize';
import { container } from 'tsyringe';
import { BillingService } from '../../application/services/BillingService';
import { sendSuccess, sendCreated, sendPaginated } from '../../../../utils/response';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';
import {
  Client as ClientModel,
  Invoice as InvoiceModel,
  InvoiceLineItem as InvoiceLineItemModel,
} from '../../../../models';
import { sequelize } from '../../../../config/database.config';

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function startOfMonth(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

function startOfNextMonth(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 1, 1);
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export class BillingController {
  static createInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(BillingService);
    const invoice = await service.createInvoice(req.user!.organizationId, req.user!.userId, req.body);

    const responseData = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      partyRole: invoice.partyRole,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
    };

    sendCreated(res, responseData, 'Invoice created successfully');
  });

  static getInvoices = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, clientId, invoiceType, partyRole, search, page = 1, limit = 10, sortBy, sortOrder = 'desc' } = req.query;

    const sortColumnMap: Record<string, string> = {
      invoiceNumber: 'invoiceNumber',
      invoiceDate: 'invoiceDate',
      dueDate: 'dueDate',
      totalAmount: 'totalAmount',
      status: 'status',
      createdAt: 'createdAt',
    };

    const where: any = {
      organizationId: req.user!.organizationId,
    };

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (invoiceType) {
      where.invoiceType = invoiceType;
    }

    if (partyRole) {
      where.partyRole = partyRole;
    }

    if (search) {
      where[Op.or] = [
        { invoiceNumber: { [Op.iLike]: `%${String(search).trim()}%` } },
        { '$client.name$': { [Op.iLike]: `%${String(search).trim()}%` } },
        { '$client.gstin$': { [Op.iLike]: `%${String(search).trim()}%` } },
      ];
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const offset = (pageNumber - 1) * limitNumber;
    const orderBy = sortColumnMap[String(sortBy || '')] || 'createdAt';
    const direction = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const { rows, count } = await InvoiceModel.findAndCountAll({
      where,
      include: [
        {
          model: ClientModel,
          as: 'client',
          attributes: ['id', 'name', 'code', 'gstin', 'mobile', 'stateCode'],
          where: { organizationId: req.user!.organizationId },
          required: false,
        },
        {
          model: InvoiceLineItemModel,
          as: 'lineItems',
          attributes: ['id', 'invoiceId', 'serviceTemplateId', 'description', 'sacCode', 'quantity', 'unitRate', 'amount', 'sortOrder'],
          required: false,
        },
      ],
      distinct: true,
      offset,
      limit: limitNumber,
      order: [[orderBy, direction]],
    });

    const payload = rows.map((invoice) => {
      const rawInvoice = invoice as any;
      return {
        id: rawInvoice.id,
        organizationId: rawInvoice.organizationId,
        clientId: rawInvoice.clientId,
        recurringTemplateId: rawInvoice.recurringTemplateId,
        invoiceType: rawInvoice.invoiceType,
        partyRole: rawInvoice.partyRole || 'customer',
        invoiceNumber: rawInvoice.invoiceNumber,
        status: rawInvoice.status,
        invoiceDate: rawInvoice.invoiceDate,
        dueDate: rawInvoice.dueDate,
        expiryDate: rawInvoice.expiryDate,
        issuedAt: rawInvoice.issuedAt,
        paidAt: rawInvoice.paidAt,
        cancelledAt: rawInvoice.cancelledAt,
        gstType: rawInvoice.gstType,
        placeOfSupply: rawInvoice.placeOfSupply,
        clientGstin: rawInvoice.clientGstin,
        firmGstin: rawInvoice.firmGstin,
        subtotal: toNumber(rawInvoice.subtotal),
        cgstAmount: toNumber(rawInvoice.cgstAmount),
        sgstAmount: toNumber(rawInvoice.sgstAmount),
        igstAmount: toNumber(rawInvoice.igstAmount),
        roundOff: toNumber(rawInvoice.roundOff),
        totalAmount: toNumber(rawInvoice.totalAmount),
        amountPaid: toNumber(rawInvoice.amountPaid),
        balanceDue: toNumber(rawInvoice.balanceDue),
        notes: rawInvoice.notes,
        receiverName: rawInvoice.receiverName,
        receiverAddress: rawInvoice.receiverAddress,
        cancelReason: rawInvoice.cancelReason,
        pdfS3Key: rawInvoice.pdfS3Key,
        pdfGeneratedAt: rawInvoice.pdfGeneratedAt,
        whatsappSentAt: rawInvoice.whatsappSentAt,
        createdAt: rawInvoice.createdAt,
        updatedAt: rawInvoice.updatedAt,
        client: rawInvoice.client
        ? {
            id: rawInvoice.client.id,
            name: rawInvoice.client.name,
            code: rawInvoice.client.code,
            gstin: rawInvoice.client.gstin,
            mobile: rawInvoice.client.mobile,
            stateCode: rawInvoice.client.stateCode,
          }
        : undefined,
        lineItems: (rawInvoice.lineItems || []).map((item: any) => ({
          id: item.id,
          invoiceId: item.invoiceId,
          serviceTemplateId: item.serviceTemplateId,
          description: item.description,
          sacCode: item.sacCode,
          quantity: toNumber(item.quantity),
          unitRate: toNumber(item.unitRate),
          amount: toNumber(item.amount),
          sortOrder: item.sortOrder,
        })),
      };
    });

    sendPaginated(res, payload, pageNumber, limitNumber, count);
  });

  static getInvoiceById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const invoice = await InvoiceModel.findOne({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId,
      },
      include: [
        {
          model: ClientModel,
          as: 'client',
          attributes: ['id', 'name', 'code', 'gstin', 'mobile', 'stateCode', 'address', 'city', 'pincode'],
          where: { organizationId: req.user!.organizationId },
          required: false,
        },
        {
          model: InvoiceLineItemModel,
          as: 'lineItems',
          attributes: ['id', 'invoiceId', 'serviceTemplateId', 'description', 'sacCode', 'quantity', 'unitRate', 'amount', 'sortOrder'],
          required: false,
        },
      ],
      order: [[{ model: InvoiceLineItemModel, as: 'lineItems' }, 'sortOrder', 'asc']],
    });

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    const [paymentRows] = await sequelize.query(
      `
        select
          id,
          invoice_id as "invoiceId",
          client_id as "clientId",
          amount,
          payment_date as "paymentDate",
          coalesce(payment_mode, 'bank_transfer') as "paymentMode",
          reference_number as "referenceNumber",
          notes,
          coalesce(recorded_by, organization_id) as "recordedBy",
          created_at as "createdAt"
        from payments
        where invoice_id = :invoiceId
        order by payment_date asc, created_at asc
      `,
      {
        replacements: {
          invoiceId: invoice.id,
        },
      }
    );

    const rawInvoice = invoice as any;
    const payload = {
      id: rawInvoice.id,
      organizationId: rawInvoice.organizationId,
      clientId: rawInvoice.clientId,
      recurringTemplateId: rawInvoice.recurringTemplateId,
      invoiceType: rawInvoice.invoiceType,
      partyRole: rawInvoice.partyRole || 'customer',
      invoiceNumber: rawInvoice.invoiceNumber,
      status: rawInvoice.status,
      invoiceDate: rawInvoice.invoiceDate,
      dueDate: rawInvoice.dueDate,
      expiryDate: rawInvoice.expiryDate,
      issuedAt: rawInvoice.issuedAt,
      paidAt: rawInvoice.paidAt,
      cancelledAt: rawInvoice.cancelledAt,
      gstType: rawInvoice.gstType,
      placeOfSupply: rawInvoice.placeOfSupply,
      clientGstin: rawInvoice.clientGstin,
      firmGstin: rawInvoice.firmGstin,
      subtotal: toNumber(rawInvoice.subtotal),
      cgstAmount: toNumber(rawInvoice.cgstAmount),
      sgstAmount: toNumber(rawInvoice.sgstAmount),
      igstAmount: toNumber(rawInvoice.igstAmount),
      roundOff: toNumber(rawInvoice.roundOff),
      totalAmount: toNumber(rawInvoice.totalAmount),
      amountPaid: toNumber(rawInvoice.amountPaid),
      balanceDue: toNumber(rawInvoice.balanceDue),
      notes: rawInvoice.notes,
      receiverName: rawInvoice.receiverName,
      receiverAddress: rawInvoice.receiverAddress,
      cancelReason: rawInvoice.cancelReason,
      pdfS3Key: rawInvoice.pdfS3Key,
      pdfGeneratedAt: rawInvoice.pdfGeneratedAt,
      whatsappSentAt: rawInvoice.whatsappSentAt,
      createdAt: rawInvoice.createdAt,
      updatedAt: rawInvoice.updatedAt,
      client: rawInvoice.client
        ? {
            id: rawInvoice.client.id,
            name: rawInvoice.client.name,
            code: rawInvoice.client.code,
            gstin: rawInvoice.client.gstin,
            mobile: rawInvoice.client.mobile,
            stateCode: rawInvoice.client.stateCode,
            address: rawInvoice.client.address,
            city: rawInvoice.client.city,
            pincode: rawInvoice.client.pincode,
          }
        : undefined,
      lineItems: (rawInvoice.lineItems || []).map((item: any) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        serviceTemplateId: item.serviceTemplateId,
        description: item.description,
        sacCode: item.sacCode,
        quantity: toNumber(item.quantity),
        unitRate: toNumber(item.unitRate),
        amount: toNumber(item.amount),
        sortOrder: item.sortOrder,
      })),
      payments: (paymentRows as Array<Record<string, unknown>>).map((payment) => ({
        id: String(payment.id),
        invoiceId: String(payment.invoiceId),
        clientId: String(payment.clientId),
        amount: toNumber(payment.amount),
        paymentDate: String(payment.paymentDate),
        paymentMode: String(payment.paymentMode),
        referenceNumber: payment.referenceNumber ? String(payment.referenceNumber) : undefined,
        notes: payment.notes ? String(payment.notes) : undefined,
        recordedBy: String(payment.recordedBy),
        createdAt: String(payment.createdAt),
      })),
    };

    sendSuccess(res, payload);
  });

  static updateInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(BillingService);
    const invoice = await service.updateInvoice(req.user!.organizationId, req.params.id, req.body);

    sendSuccess(
      res,
      {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        partyRole: invoice.partyRole,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
      },
      'Invoice updated successfully'
    );
  });

  static generatePdf = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(BillingService);
    const result = await service.generatePdf(req.user!.organizationId, req.params.id);
    sendSuccess(res, result, 'PDF generated successfully');
  });

  static updateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = container.resolve(BillingService);
    const invoice = await service.updateStatus(req.user!.organizationId, req.params.id, req.user!.userId, req.body);
    sendSuccess(res, { status: invoice.status });
  });

  static getMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const invoices = await InvoiceModel.findAll({
      where: {
        organizationId: req.user!.organizationId,
        partyRole: 'customer',
      },
    });

    const today = startOfToday();
    const monthStart = startOfMonth();
    const nextMonthStart = startOfNextMonth();

    let draftCount = 0;
    let draftValue = 0;
    let issuedCount = 0;
    let partiallyPaidCount = 0;
    let overdueCount = 0;
    let paidCount = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let billedThisMonth = 0;

    for (const invoice of invoices) {
      const totalAmount = toNumber(invoice.totalAmount);
      const balanceDue = toNumber(invoice.balanceDue);
      const invoiceDate = new Date(invoice.invoiceDate);
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (invoice.status === 'draft') {
        draftCount += 1;
        draftValue += totalAmount;
      }

      if (invoice.status === 'issued') {
        issuedCount += 1;
      }

      if (invoice.status === 'partially_paid') {
        partiallyPaidCount += 1;
      }

      if (invoice.status === 'paid') {
        paidCount += 1;
      }

      if (invoice.status !== 'paid' && invoice.status !== 'cancelled') {
        totalOutstanding += balanceDue;
      }

      const isOverdueStatus = dueDate.getTime() < today.getTime() && balanceDue > 0 && invoice.status !== 'paid' && invoice.status !== 'cancelled';
      if (isOverdueStatus) {
        overdueCount += 1;
        totalOverdue += balanceDue;
      }

      if (invoiceDate >= monthStart && invoiceDate < nextMonthStart) {
        billedThisMonth += totalAmount;
      }
    }

    const [payments] = await sequelize.query(
      `
        select coalesce(sum(amount), 0) as amount
        from payments
        where organization_id = :organizationId
          and payment_date >= :monthStart
          and payment_date < :nextMonthStart
      `,
      {
        replacements: {
          organizationId: req.user!.organizationId,
          monthStart: toDateOnly(monthStart),
          nextMonthStart: toDateOnly(nextMonthStart),
        },
      }
    );

    const collectedThisMonth = toNumber((payments as Array<Record<string, unknown>>)[0]?.amount);

    sendSuccess(res, {
      totalInvoices: invoices.length,
      draftCount,
      draftValue: roundMetric(draftValue),
      issuedCount,
      partiallyPaidCount,
      overdueCount,
      paidCount,
      totalOutstanding: roundMetric(totalOutstanding),
      totalOverdue: roundMetric(totalOverdue),
      collectedThisMonth: roundMetric(collectedThisMonth),
      billedThisMonth: roundMetric(billedThisMonth),
    });
  });

  static getServiceTemplates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { clientId } = req.query;
    const service = container.resolve(BillingService);
    const templates = await service.getServiceTemplates(req.user!.organizationId, clientId as string);
    sendSuccess(res, templates);
  });

  static getRecurringTemplates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { search, isActive } = req.query;
    const templateColumns = await sequelize.query<{ column_name: string }>(
      `
        select column_name
        from information_schema.columns
        where table_schema = current_schema()
          and table_name = 'recurring_invoice_templates'
      `,
      { type: QueryTypes.SELECT }
    );

    const columnSet = new Set(templateColumns.map((column) => column.column_name));
    const nameExpr = columnSet.has('template_name') ? 'rit.template_name' : 'rit.name';
    const frequencyExpr = columnSet.has('recurring_frequency') ? 'rit.recurring_frequency' : 'rit.frequency';
    const nextRunExpr = columnSet.has('next_invoice_date') ? 'rit.next_invoice_date' : 'rit.next_run_date';
    const dueDaysExpr = columnSet.has('due_date_offset')
      ? 'rit.due_date_offset'
      : columnSet.has('default_due_days')
        ? 'rit.default_due_days'
        : '30';
    const subtotalExpr = columnSet.has('subtotal') ? 'rit.subtotal' : '0';
    const serviceCategoryExpr = columnSet.has('service_category') ? 'rit.service_category' : "''";
    const advanceNoticeExpr = columnSet.has('advance_notice_days') ? 'rit.advance_notice_days' : '5';
    const lineItemsExpr = columnSet.has('line_items_snapshot') ? 'rit.line_items_snapshot' : 'null';
    const defaultNotesExpr = columnSet.has('default_notes') ? 'rit.default_notes' : 'null';
    const totalGeneratedExpr = columnSet.has('total_generated') ? 'rit.total_generated' : '0';

    const filters: string[] = ['rit.organization_id = :organizationId', 'rit.deleted_at is null'];
    const replacements: Record<string, unknown> = {
      organizationId: req.user!.organizationId,
    };

    if (typeof search === 'string' && search.trim()) {
      filters.push(`(${nameExpr} ilike :search or c.name ilike :search)`);
      replacements.search = `%${search.trim()}%`;
    }

    if (typeof isActive === 'string' && (isActive === 'true' || isActive === 'false')) {
      filters.push('rit.is_active = :isActive');
      replacements.isActive = isActive === 'true';
    }

    const [rows] = await sequelize.query(
      `
        select
          rit.id,
          rit.organization_id as "organizationId",
          rit.client_id as "clientId",
          ${nameExpr} as name,
          ${frequencyExpr} as frequency,
          ${nextRunExpr} as "nextRunDate",
          rit.auto_issue as "autoIssue",
          rit.is_active as "isActive",
          ${dueDaysExpr} as "defaultDueDays",
          ${advanceNoticeExpr} as "advanceNoticeDays",
          ${subtotalExpr} as subtotal,
          ${serviceCategoryExpr} as "serviceCategory",
          ${lineItemsExpr} as "lineItemsSnapshot",
          ${defaultNotesExpr} as "defaultNotes",
          ${totalGeneratedExpr} as "totalGenerated",
          rit.created_at as "createdAt",
          c.id as "client.id",
          c.name as "client.name"
        from recurring_invoice_templates rit
        left join clients c on c.id = rit.client_id and c.organization_id = :organizationId
        where ${filters.join(' and ')}
        order by ${nextRunExpr} asc, rit.created_at desc
      `,
      { replacements }
    );

    const payload = (rows as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      organizationId: String(row.organizationId),
      clientId: String(row.clientId),
      client: row['client.id']
        ? {
            id: String(row['client.id']),
            name: row['client.name'] ? String(row['client.name']) : 'Unnamed client',
          }
        : undefined,
      name: String(row.name),
      frequency: mapFrequency(String(row.frequency)),
      nextRunDate: String(row.nextRunDate),
      advanceNoticeDays: toNumber(row.advanceNoticeDays) || 5,
      isActive: Boolean(row.isActive),
      autoIssue: Boolean(row.autoIssue),
      lineItemsSnapshot:
        Array.isArray(row.lineItemsSnapshot) && row.lineItemsSnapshot.length > 0
          ? row.lineItemsSnapshot
          : [
              {
                description: String(row.name),
                sacCode: sacCodeForCategory(row.serviceCategory ? String(row.serviceCategory) : ''),
                quantity: 1,
                unitRate: toNumber(row.subtotal),
              },
            ],
      defaultNotes: row.defaultNotes
        ? String(row.defaultNotes)
        : `${String(row.name)} recurring billing plan`,
      defaultDueDays: toNumber(row.defaultDueDays) || 30,
      totalGenerated: toNumber(row.totalGenerated),
      createdAt: String(row.createdAt),
    }));

    sendSuccess(res, payload);
  });
}

function sacCodeForCategory(category: string): string {
  if (category === 'gst') {
    return '998232';
  }

  if (category === 'tds') {
    return '998233';
  }

  if (category === 'roc') {
    return '998214';
  }

  if (category === 'audit') {
    return '998221';
  }

  return '998231';
}

function mapFrequency(value: string): 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' {
  if (value === 'MONTHLY' || value === 'QUARTERLY' || value === 'HALF_YEARLY' || value === 'YEARLY') {
    return value;
  }

  return 'MONTHLY';
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

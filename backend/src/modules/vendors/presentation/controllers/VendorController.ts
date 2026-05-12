import { Response } from 'express';
import { Op, QueryTypes } from 'sequelize';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';
import { sendCreated, sendPaginated, sendSuccess } from '../../../../utils/response';
import { AppError } from '../../../../utils/errors';
import { sequelize } from '../../../../config/database.config';
import {
  Client,
  Vendor,
  VendorBill,
  VendorDocument,
  VendorPayment,
  VendorPurchaseOrder,
  VendorPurchaseOrderItem,
} from '../../../../models';

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function dateOnly(value?: string | Date | null): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function addDays(value: string | Date, days: number): string {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return dateOnly(date);
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function normalizeVendorType(value: unknown): 'goods_supplier' | 'service_provider' | 'contractor' | 'consultant' {
  return value === 'service_provider' || value === 'contractor' || value === 'consultant'
    ? value
    : 'goods_supplier';
}

function normalizeVendorStatus(value: unknown): 'active' | 'blocked' {
  return value === 'blocked' ? 'blocked' : 'active';
}

function normalizePoStatus(value: unknown): string {
  const allowed = new Set([
    'draft',
    'pending_approval',
    'approved',
    'sent',
    'partially_received',
    'completed',
    'cancelled',
  ]);
  return allowed.has(String(value)) ? String(value) : 'draft';
}

function normalizePaymentMethod(value: unknown): 'upi' | 'bank_transfer' | 'cheque' | 'cash' {
  return value === 'upi' || value === 'cheque' || value === 'cash' ? value : 'bank_transfer';
}

function computeBillStatus(totalAmount: number, amountPaid: number, dueDate: string, requested?: unknown): string {
  if (requested === 'draft' || requested === 'cancelled') return String(requested);
  if (amountPaid >= totalAmount && totalAmount > 0) return 'paid';
  if (amountPaid > 0) return 'partially_paid';

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < startOfToday().getTime() ? 'overdue' : 'pending';
}

function calculateLines(lines: any[] = []) {
  let subtotal = 0;
  let taxAmount = 0;
  const items = lines.map((line, index) => {
    const quantity = Number(line.quantity ?? line.qtyOrdered ?? 1);
    const rate = Number(line.rate ?? line.unitPrice ?? 0);
    const gstRate = Number(line.gstRate ?? 18);
    const taxable = quantity * rate;
    const tax = taxable * (gstRate / 100);
    subtotal += taxable;
    taxAmount += tax;
    return {
      description: String(line.description || 'Purchase item'),
      hsnSacCode: line.hsnSacCode || null,
      quantity,
      rate,
      gstRate,
      taxAmount: Math.round(tax * 100) / 100,
      totalAmount: Math.round((taxable + tax) * 100) / 100,
      sortOrder: index,
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;
  taxAmount = Math.round(taxAmount * 100) / 100;
  return { items, subtotal, taxAmount, totalAmount: Math.round((subtotal + taxAmount) * 100) / 100 };
}

function getClientScope(req: AuthenticatedRequest): string | null {
  const raw = req.query.clientId ?? req.body?.clientId;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

async function assertClientScope(organizationId: string, clientId: string | null): Promise<void> {
  if (!clientId) return;
  const exists = await Client.count({ where: { id: clientId, organizationId } });
  if (!exists) throw new AppError('Client workspace not found', 404);
}

function scopedVendorInclude(clientId: string | null, attributes: string[]) {
  const include: any = { model: Vendor, as: 'vendor', attributes };
  if (clientId) {
    include.where = { clientId };
    include.required = true;
  }
  return include;
}

function vendorResponse(vendor: any, metrics?: any) {
  return {
    id: vendor.id,
    organizationId: vendor.organizationId,
    clientId: vendor.clientId,
    vendorCode: vendor.vendorCode,
    vendorName: vendor.vendorName,
    businessName: vendor.businessName,
    vendorType: vendor.vendorType,
    gstNumber: vendor.gstNumber,
    panNumber: vendor.panNumber,
    contactPerson: vendor.contactPerson,
    mobile: vendor.mobile,
    email: vendor.email,
    billingAddress: vendor.billingAddress,
    shippingAddress: vendor.shippingAddress,
    paymentTerms: vendor.paymentTerms,
    creditDays: Number(vendor.creditDays || 0),
    creditLimit: toNumber(vendor.creditLimit),
    status: vendor.status,
    notes: vendor.notes,
    metadata: vendor.metadata || {},
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
    metrics,
  };
}

async function nextVendorCode(organizationId: string): Promise<string> {
  const count = await Vendor.count({ where: { organizationId } });
  return `VEN-${String(count + 1).padStart(4, '0')}`;
}

async function nextPoNumber(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await VendorPurchaseOrder.count({ where: { organizationId } });
  return `VPO/${year}/${String(count + 1).padStart(4, '0')}`;
}

async function assertVendor(organizationId: string, vendorId: string, clientId: string | null = null) {
  const where: any = { id: vendorId, organizationId };
  if (clientId) where.clientId = clientId;
  const vendor = await Vendor.findOne({ where });
  if (!vendor) throw new AppError('Vendor not found', 404);
  return vendor;
}

async function vendorMetrics(organizationId: string, vendorId: string) {
  const [rows] = await sequelize.query(
    `
      select
        coalesce(sum(total_amount), 0) as "totalPurchases",
        coalesce(sum(balance_due), 0) as "totalOutstanding",
        coalesce(sum(case when due_date < current_date and balance_due > 0 then balance_due else 0 end), 0) as "overdueAmount",
        max(invoice_date) as "lastPurchaseDate",
        coalesce(avg(case when total_amount > 0 then amount_paid / total_amount * 100 else 0 end), 0) as "paymentPerformance"
      from vendor_bills
      where organization_id = :organizationId
        and vendor_id = :vendorId
        and deleted_at is null
        and status <> 'cancelled'
    `,
    { replacements: { organizationId, vendorId } }
  );
  const row = (rows as Array<Record<string, unknown>>)[0] || {};
  return {
    totalPurchases: toNumber(row.totalPurchases),
    totalOutstanding: toNumber(row.totalOutstanding),
    overdueAmount: toNumber(row.overdueAmount),
    lastPurchaseDate: row.lastPurchaseDate ? String(row.lastPurchaseDate) : null,
    paymentPerformance: Math.round(toNumber(row.paymentPerformance)),
  };
}

async function updateBillPaymentState(billId: string, transaction?: any) {
  const bill = await VendorBill.findByPk(billId, { transaction });
  if (!bill) return;

  const paid = await VendorPayment.sum('amount', {
    where: { billId, status: 'paid' },
    transaction,
  });
  const amountPaid = toNumber(paid);
  const totalAmount = toNumber(bill.totalAmount);
  const balanceDue = Math.max(totalAmount - amountPaid, 0);
  const status = computeBillStatus(totalAmount, amountPaid, dateOnly(bill.dueDate), bill.status === 'cancelled' ? 'cancelled' : undefined);

  await bill.update({ amountPaid, balanceDue, status }, { transaction });
}

export class VendorController {
  static getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;
    const clientId = getClientScope(req);
    await assertClientScope(organizationId, clientId);
    const [summaryRows] = await sequelize.query(
      `
        select
          count(distinct v.id) as "totalVendors",
          count(distinct case when v.status = 'active' then v.id end) as "activeVendors",
          coalesce(sum(case when vb.status <> 'cancelled' then vb.total_amount else 0 end), 0) as "totalPurchases",
          coalesce(sum(case when vb.status <> 'cancelled' then vb.balance_due else 0 end), 0) as "totalOutstanding",
          coalesce(sum(case when vb.due_date < current_date and vb.balance_due > 0 and vb.status <> 'cancelled' then vb.balance_due else 0 end), 0) as "overdueAmount",
          coalesce(sum(case when vb.due_date >= current_date and vb.due_date <= current_date + interval '7 days' and vb.balance_due > 0 then vb.balance_due else 0 end), 0) as "upcomingDue"
        from vendors v
        left join vendor_bills vb
          on vb.vendor_id = v.id
         and vb.organization_id = v.organization_id
         and vb.deleted_at is null
        where v.organization_id = :organizationId
          and v.deleted_at is null
          and (:clientId is null or v.client_id = cast(:clientId as uuid))
      `,
      { replacements: { organizationId, clientId } }
    );

    const summary = (summaryRows as Array<Record<string, unknown>>)[0] || {};
    sendSuccess(res, {
      totalVendors: toNumber(summary.totalVendors),
      activeVendors: toNumber(summary.activeVendors),
      totalPurchases: toNumber(summary.totalPurchases),
      totalOutstanding: toNumber(summary.totalOutstanding),
      overdueAmount: toNumber(summary.overdueAmount),
      upcomingDue: toNumber(summary.upcomingDue),
    });
  });

  static listVendors = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 20, search, status, vendorType } = req.query;
    const clientId = getClientScope(req);
    await assertClientScope(req.user!.organizationId, clientId);
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const where: any = { organizationId: req.user!.organizationId };

    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (vendorType) where.vendorType = vendorType;
    if (search) {
      const q = `%${String(search).trim()}%`;
      where[Op.or] = [
        { vendorCode: { [Op.iLike]: q } },
        { vendorName: { [Op.iLike]: q } },
        { businessName: { [Op.iLike]: q } },
        { gstNumber: { [Op.iLike]: q } },
        { mobile: { [Op.iLike]: q } },
      ];
    }

    const { rows, count } = await Vendor.findAndCountAll({
      where,
      offset: (pageNumber - 1) * limitNumber,
      limit: limitNumber,
      order: [['createdAt', 'DESC']],
    });

    const payload = await Promise.all(rows.map(async (vendor) => vendorResponse(vendor, await vendorMetrics(req.user!.organizationId, vendor.id))));
    sendPaginated(res, payload, pageNumber, limitNumber, count);
  });

  static createVendor = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;
    const clientId = getClientScope(req);
    await assertClientScope(organizationId, clientId);
    const vendor = await Vendor.create({
      organizationId,
      clientId,
      vendorCode: req.body.vendorCode || await nextVendorCode(organizationId),
      vendorName: String(req.body.vendorName || '').trim(),
      businessName: req.body.businessName || null,
      vendorType: normalizeVendorType(req.body.vendorType),
      gstNumber: req.body.gstNumber || null,
      panNumber: req.body.panNumber || null,
      contactPerson: req.body.contactPerson || null,
      mobile: req.body.mobile || null,
      email: req.body.email || null,
      billingAddress: req.body.billingAddress || null,
      shippingAddress: req.body.shippingAddress || null,
      paymentTerms: req.body.paymentTerms || null,
      creditDays: Number(req.body.creditDays || 0),
      creditLimit: Number(req.body.creditLimit || 0),
      status: normalizeVendorStatus(req.body.status),
      notes: req.body.notes || null,
      metadata: req.body.metadata || {},
    });

    sendCreated(res, vendorResponse(vendor, await vendorMetrics(organizationId, vendor.id)), 'Vendor created');
  });

  static getVendor = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const vendor = await assertVendor(req.user!.organizationId, req.params.id);
    sendSuccess(res, vendorResponse(vendor, await vendorMetrics(req.user!.organizationId, vendor.id)));
  });

  static updateVendor = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const vendor = await assertVendor(req.user!.organizationId, req.params.id);
    const clientId = typeof req.body.clientId === 'string' && req.body.clientId.trim() ? req.body.clientId.trim() : undefined;
    if (clientId !== undefined) {
      await assertClientScope(req.user!.organizationId, clientId);
    }
    await vendor.update({
      clientId: clientId !== undefined ? clientId : vendor.clientId,
      vendorName: req.body.vendorName ?? vendor.vendorName,
      businessName: req.body.businessName ?? vendor.businessName,
      vendorType: req.body.vendorType ? normalizeVendorType(req.body.vendorType) : vendor.vendorType,
      gstNumber: req.body.gstNumber ?? vendor.gstNumber,
      panNumber: req.body.panNumber ?? vendor.panNumber,
      contactPerson: req.body.contactPerson ?? vendor.contactPerson,
      mobile: req.body.mobile ?? vendor.mobile,
      email: req.body.email ?? vendor.email,
      billingAddress: req.body.billingAddress ?? vendor.billingAddress,
      shippingAddress: req.body.shippingAddress ?? vendor.shippingAddress,
      paymentTerms: req.body.paymentTerms ?? vendor.paymentTerms,
      creditDays: req.body.creditDays != null ? Number(req.body.creditDays) : vendor.creditDays,
      creditLimit: req.body.creditLimit != null ? Number(req.body.creditLimit) : vendor.creditLimit,
      status: req.body.status ? normalizeVendorStatus(req.body.status) : vendor.status,
      notes: req.body.notes ?? vendor.notes,
      metadata: req.body.metadata ?? vendor.metadata,
    });

    sendSuccess(res, vendorResponse(vendor, await vendorMetrics(req.user!.organizationId, vendor.id)), 'Vendor updated');
  });

  static listPurchaseOrders = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const clientId = getClientScope(req);
    await assertClientScope(req.user!.organizationId, clientId);
    const where: any = { organizationId: req.user!.organizationId };
    if (req.query.vendorId) where.vendorId = req.query.vendorId;
    if (req.query.status) where.status = req.query.status;

    const rows = await VendorPurchaseOrder.findAll({
      where,
      include: [
        scopedVendorInclude(clientId, ['id', 'clientId', 'vendorCode', 'vendorName', 'gstNumber']),
        { model: VendorPurchaseOrderItem, as: 'items' },
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(req.query.limit || 100),
    });
    sendSuccess(res, rows);
  });

  static createPurchaseOrder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;
    const clientId = getClientScope(req);
    await assertClientScope(organizationId, clientId);
    await assertVendor(organizationId, req.body.vendorId, clientId);
    const calculated = calculateLines(req.body.items);

    const created = await sequelize.transaction(async (transaction) => {
      const po = await VendorPurchaseOrder.create({
        organizationId,
        vendorId: req.body.vendorId,
        poNumber: req.body.poNumber || await nextPoNumber(organizationId),
        poDate: dateOnly(req.body.poDate),
        deliveryDate: req.body.deliveryDate || null,
        status: normalizePoStatus(req.body.status),
        subtotal: calculated.subtotal,
        taxAmount: calculated.taxAmount,
        totalAmount: calculated.totalAmount,
        approvalNote: req.body.approvalNote || null,
        notes: req.body.notes || null,
        createdBy: req.user!.userId,
      }, { transaction });

      if (calculated.items.length > 0) {
        await VendorPurchaseOrderItem.bulkCreate(
          calculated.items.map((item) => ({ ...item, purchaseOrderId: po.id })),
          { transaction }
        );
      }
      return po;
    });

    sendCreated(res, created, 'Purchase order created');
  });

  static updatePurchaseOrderStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const po = await VendorPurchaseOrder.findOne({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!po) throw new AppError('Purchase order not found', 404);
    await po.update({ status: normalizePoStatus(req.body.status), approvalNote: req.body.approvalNote ?? po.approvalNote });
    sendSuccess(res, po, 'Purchase order status updated');
  });

  static listBills = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const clientId = getClientScope(req);
    await assertClientScope(req.user!.organizationId, clientId);
    const where: any = { organizationId: req.user!.organizationId };
    if (req.query.vendorId) where.vendorId = req.query.vendorId;
    if (req.query.status) where.status = req.query.status;

    const rows = await VendorBill.findAll({
      where,
      include: [scopedVendorInclude(clientId, ['id', 'clientId', 'vendorCode', 'vendorName', 'gstNumber'])],
      order: [['invoiceDate', 'DESC'], ['createdAt', 'DESC']],
      limit: Number(req.query.limit || 100),
    });
    sendSuccess(res, rows);
  });

  static createBill = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;
    const clientId = getClientScope(req);
    await assertClientScope(organizationId, clientId);
    const vendor = await assertVendor(organizationId, req.body.vendorId, clientId);
    const invoiceDate = dateOnly(req.body.invoiceDate);
    const dueDate = req.body.dueDate || addDays(invoiceDate, Number(vendor.creditDays || 0));
    const subtotal = Number(req.body.subtotal ?? Math.max(Number(req.body.totalAmount || 0) - Number(req.body.taxAmount || 0), 0));
    const taxAmount = Number(req.body.taxAmount || 0);
    const totalAmount = Number(req.body.totalAmount ?? subtotal + taxAmount);
    const amountPaid = Number(req.body.amountPaid || 0);
    const duplicateKey = `${organizationId}:${req.body.vendorId}:${String(req.body.billNumber || '').trim().toLowerCase()}:${totalAmount}`;

    const existingDuplicate = await VendorBill.findOne({ where: { duplicateKey } });
    if (existingDuplicate) {
      throw new AppError('Duplicate vendor bill detected for this vendor, bill number, and amount', 409);
    }

    const bill = await VendorBill.create({
      organizationId,
      vendorId: req.body.vendorId,
      purchaseOrderId: req.body.purchaseOrderId || null,
      billNumber: String(req.body.billNumber || '').trim(),
      invoiceDate,
      dueDate,
      category: req.body.category || null,
      subtotal,
      taxAmount,
      totalAmount,
      amountPaid,
      balanceDue: Math.max(totalAmount - amountPaid, 0),
      status: computeBillStatus(totalAmount, amountPaid, dueDate, req.body.status),
      attachmentUrl: req.body.attachmentUrl || null,
      duplicateKey,
      notes: req.body.notes || null,
      createdBy: req.user!.userId,
    });

    sendCreated(res, bill, 'Vendor bill recorded');
  });

  static listPayments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const clientId = getClientScope(req);
    await assertClientScope(req.user!.organizationId, clientId);
    const where: any = { organizationId: req.user!.organizationId };
    if (req.query.vendorId) where.vendorId = req.query.vendorId;
    if (req.query.billId) where.billId = req.query.billId;

    const rows = await VendorPayment.findAll({
      where,
      include: [
        scopedVendorInclude(clientId, ['id', 'clientId', 'vendorCode', 'vendorName']),
        { model: VendorBill, as: 'bill', attributes: ['id', 'billNumber', 'totalAmount', 'balanceDue'] },
      ],
      order: [['paymentDate', 'DESC'], ['createdAt', 'DESC']],
      limit: Number(req.query.limit || 100),
    });
    sendSuccess(res, rows);
  });

  static createPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;
    const clientId = getClientScope(req);
    await assertClientScope(organizationId, clientId);
    await assertVendor(organizationId, req.body.vendorId, clientId);
    const allocations = Array.isArray(req.body.allocations) && req.body.allocations.length > 0
      ? req.body.allocations
      : [{ billId: req.body.billId || null, amount: req.body.amount }];

    const payments = await sequelize.transaction(async (transaction) => {
      const created: VendorPayment[] = [];
      for (const allocation of allocations) {
        const amount = Number(allocation.amount || 0);
        if (amount <= 0) continue;
        if (allocation.billId) {
          const bill = await VendorBill.findOne({
            where: { id: allocation.billId, vendorId: req.body.vendorId, organizationId },
            transaction,
          });
          if (!bill) throw new AppError('Vendor bill not found for payment allocation', 404);
        }

        const payment = await VendorPayment.create({
          organizationId,
          vendorId: req.body.vendorId,
          billId: allocation.billId || null,
          amount,
          paymentDate: dateOnly(req.body.paymentDate),
          paymentMethod: normalizePaymentMethod(req.body.paymentMethod),
          referenceNumber: req.body.referenceNumber || null,
          status: req.body.status === 'pending' ? 'pending' : 'paid',
          notes: req.body.notes || null,
          recordedBy: req.user!.userId,
        }, { transaction });
        created.push(payment);
        if (allocation.billId) {
          await updateBillPaymentState(allocation.billId, transaction);
        }
      }
      return created;
    });

    sendCreated(res, payments, 'Vendor payment recorded');
  });

  static getAccountsPayable = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const clientId = getClientScope(req);
    await assertClientScope(req.user!.organizationId, clientId);
    const rows = await sequelize.query(
      `
        select
          v.id as "vendorId",
          v.vendor_code as "vendorCode",
          v.vendor_name as "vendorName",
          coalesce(sum(vb.balance_due), 0) as "totalOutstanding",
          coalesce(sum(case when current_date - vb.due_date between 0 and 30 then vb.balance_due else 0 end), 0) as "bucket0to30",
          coalesce(sum(case when current_date - vb.due_date between 31 and 60 then vb.balance_due else 0 end), 0) as "bucket31to60",
          coalesce(sum(case when current_date - vb.due_date between 61 and 90 then vb.balance_due else 0 end), 0) as "bucket61to90",
          coalesce(sum(case when current_date - vb.due_date > 90 then vb.balance_due else 0 end), 0) as "bucket90Plus",
          min(case when vb.balance_due > 0 then vb.due_date end) as "nextDueDate"
        from vendors v
        left join vendor_bills vb
          on vb.vendor_id = v.id
         and vb.organization_id = v.organization_id
         and vb.deleted_at is null
         and vb.status <> 'cancelled'
         and vb.balance_due > 0
        where v.organization_id = :organizationId
          and v.deleted_at is null
          and (:clientId is null or v.client_id = cast(:clientId as uuid))
        group by v.id, v.vendor_code, v.vendor_name
        order by "totalOutstanding" desc, v.vendor_name asc
      `,
      {
        replacements: { organizationId: req.user!.organizationId, clientId },
        type: QueryTypes.SELECT,
      }
    );

    sendSuccess(res, (rows as Array<Record<string, unknown>>).map((row) => ({
      vendorId: String(row.vendorId),
      vendorCode: String(row.vendorCode),
      vendorName: String(row.vendorName),
      totalOutstanding: toNumber(row.totalOutstanding),
      bucket0to30: toNumber(row.bucket0to30),
      bucket31to60: toNumber(row.bucket31to60),
      bucket61to90: toNumber(row.bucket61to90),
      bucket90Plus: toNumber(row.bucket90Plus),
      nextDueDate: row.nextDueDate ? String(row.nextDueDate) : null,
    })));
  });

  static listDocuments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const clientId = getClientScope(req);
    await assertClientScope(req.user!.organizationId, clientId);
    const where: any = { organizationId: req.user!.organizationId };
    if (req.query.vendorId) where.vendorId = req.query.vendorId;
    if (req.query.documentType) where.documentType = req.query.documentType;
    const rows = await VendorDocument.findAll({
      where,
      include: [scopedVendorInclude(clientId, ['id', 'clientId', 'vendorCode', 'vendorName'])],
      order: [['createdAt', 'DESC']],
      limit: Number(req.query.limit || 100),
    });
    sendSuccess(res, rows);
  });

  static createDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const clientId = getClientScope(req);
    await assertClientScope(req.user!.organizationId, clientId);
    await assertVendor(req.user!.organizationId, req.body.vendorId, clientId);
    const document = await VendorDocument.create({
      organizationId: req.user!.organizationId,
      vendorId: req.body.vendorId,
      documentType: req.body.documentType || 'other',
      name: req.body.name,
      fileUrl: req.body.fileUrl || null,
      notes: req.body.notes || null,
      uploadedBy: req.user!.userId,
    });
    sendCreated(res, document, 'Vendor document saved');
  });
}

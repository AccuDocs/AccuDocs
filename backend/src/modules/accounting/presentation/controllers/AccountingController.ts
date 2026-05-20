import { Response } from 'express';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';
import { sendCreated, sendSuccess } from '../../../../utils/response';
import { AppError } from '../../../../utils/errors';
import { AccountingService } from '../../application/services/AccountingService';

function orgId(req: AuthenticatedRequest): string {
  return req.user!.organizationId;
}

function userId(req: AuthenticatedRequest): string {
  return req.user!.userId;
}

export class AccountingController {
  static dashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const window = AccountingService.windowFromQuery(req.query as Record<string, unknown>);
    const data = await AccountingService.getDashboard(orgId(req), window);
    sendSuccess(res, data);
  });

  static listAccounts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await AccountingService.listAccounts(orgId(req), req.query as Record<string, unknown>);
    sendSuccess(res, data);
  });

  static createAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await AccountingService.createAccount(orgId(req), userId(req), req.body);
    sendCreated(res, data, 'Account created');
  });

  static listVouchers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await AccountingService.listVouchers(orgId(req), req.query as Record<string, unknown>);
    sendSuccess(res, data);
  });

  static getVoucher = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await AccountingService.getVoucher(orgId(req), req.params.id);
    sendSuccess(res, data);
  });

  static createVoucher = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await AccountingService.createVoucher(orgId(req), userId(req), req.body);
    sendCreated(res, data, 'Voucher created');
  });

  static listJournalEntries = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await AccountingService.listJournalEntries(orgId(req), req.query as Record<string, unknown>);
    sendSuccess(res, data);
  });

  static ledger = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await AccountingService.getLedger(orgId(req), req.query as Record<string, unknown>);
    sendSuccess(res, data);
  });

  static trialBalance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await AccountingService.trialBalance(orgId(req), req.query as Record<string, unknown>);
    sendSuccess(res, data);
  });

  static profitAndLoss = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await AccountingService.profitAndLoss(orgId(req), req.query as Record<string, unknown>);
    sendSuccess(res, data);
  });

  static balanceSheet = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await AccountingService.balanceSheet(orgId(req), req.query as Record<string, unknown>);
    sendSuccess(res, data);
  });

  static cashFlow = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await AccountingService.cashFlow(orgId(req), req.query as Record<string, unknown>);
    sendSuccess(res, data);
  });

  static receivables = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await AccountingService.outstanding(orgId(req), 'customer', req.query as Record<string, unknown>);
    sendSuccess(res, data);
  });

  static payables = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await AccountingService.outstanding(orgId(req), 'vendor', req.query as Record<string, unknown>);
    sendSuccess(res, data);
  });

  static settings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await AccountingService.getSettings(orgId(req));
    sendSuccess(res, data);
  });

  static postSalesInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const invoiceId = req.params.invoiceId;
    if (!invoiceId) throw new AppError('Invoice id is required', 400);
    const data = await AccountingService.postSalesInvoice(orgId(req), userId(req), invoiceId);
    sendSuccess(res, data, data.alreadyPosted ? 'Invoice was already posted' : 'Invoice posted to accounting');
  });

  static postCustomerPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const paymentId = req.params.paymentId;
    if (!paymentId) throw new AppError('Payment id is required', 400);
    const data = await AccountingService.postCustomerPayment(orgId(req), userId(req), paymentId);
    sendSuccess(res, data, data.alreadyPosted ? 'Payment was already posted' : 'Payment posted to accounting');
  });

  static postVendorBill = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const billId = req.params.billId;
    if (!billId) throw new AppError('Vendor bill id is required', 400);
    const data = await AccountingService.postVendorBill(orgId(req), userId(req), billId);
    sendSuccess(res, data, data.alreadyPosted ? 'Vendor bill was already posted' : 'Vendor bill posted to accounting');
  });

  static postVendorPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const paymentId = req.params.paymentId;
    if (!paymentId) throw new AppError('Vendor payment id is required', 400);
    const data = await AccountingService.postVendorPayment(orgId(req), userId(req), paymentId);
    sendSuccess(res, data, data.alreadyPosted ? 'Vendor payment was already posted' : 'Vendor payment posted to accounting');
  });
}

import { Response } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../../config/database.config';
import { asyncHandler } from '../../../../middlewares';
import { AuthenticatedRequest } from '../../../../shared/types/auth.types';
import { sendSuccess } from '../../../../utils/response';

type QueryValue = string | number | null | undefined;
type QueryReplacements = Record<string, QueryValue>;

type DbRow = Record<string, unknown>;

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toStringOrNull(value: unknown): string | null {
  return value == null ? null : String(value);
}

function normalizeSearch(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function dateFilterReplacements(req: AuthenticatedRequest): QueryReplacements {
  return {
    organizationId: req.user!.organizationId,
    search: normalizeSearch(req.query.search),
    clientId: typeof req.query.clientId === 'string' && req.query.clientId.trim() ? req.query.clientId.trim() : null,
    startDate: typeof req.query.startDate === 'string' && req.query.startDate ? req.query.startDate : null,
    endDate: typeof req.query.endDate === 'string' && req.query.endDate ? req.query.endDate : null,
    limit: Math.min(Number(req.query.limit ?? 50), 200),
  };
}

async function queryRows<T extends DbRow>(sql: string, replacements: QueryReplacements): Promise<T[]> {
  return sequelize.query<T>(sql, {
    replacements,
    type: QueryTypes.SELECT,
  });
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await queryRows<{ exists: boolean }>(
    `
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = :tableName
      ) as exists
    `,
    { tableName },
  );
  return Boolean(rows[0]?.exists);
}

function partySummary(row: DbRow, mode: 'receivable' | 'payable') {
  return {
    id: String(row.id),
    code: toStringOrNull(row.code),
    name: String(row.name ?? ''),
    gstin: toStringOrNull(row.gstin),
    mobile: toStringOrNull(row.mobile),
    creditLimit: toNumber(row.creditLimit),
    creditDays: toNumber(row.creditDays),
    totalDebit: toNumber(row.totalDebit),
    totalCredit: toNumber(row.totalCredit),
    balance: toNumber(row.balance),
    overdueAmount: toNumber(row.overdueAmount),
    lastTransactionDate: toStringOrNull(row.lastTransactionDate),
    rating: riskRating(toNumber(row.balance), toNumber(row.overdueAmount), mode),
  };
}

function ledgerEntry(row: DbRow, normalBalance: 'debit' | 'credit' = 'debit') {
  const debit = toNumber(row.debit);
  const credit = toNumber(row.credit);
  const balance = toNumber(row.balance);
  const suffix = balance === 0 ? '' : normalBalance === 'credit'
    ? (balance >= 0 ? ' Cr' : ' Dr')
    : (balance >= 0 ? ' Dr' : ' Cr');

  return {
    id: String(row.id),
    partyId: toStringOrNull(row.partyId),
    partyName: toStringOrNull(row.partyName),
    date: toStringOrNull(row.date),
    voucher: toStringOrNull(row.voucher),
    transactionType: toStringOrNull(row.transactionType),
    description: toStringOrNull(row.description),
    debit,
    credit,
    balance: Math.abs(balance),
    balanceLabel: `${Math.abs(balance).toFixed(2)}${suffix}`,
    referenceId: toStringOrNull(row.referenceId),
  };
}

function riskRating(balance: number, overdue: number, mode: 'receivable' | 'payable'): 'good' | 'watch' | 'risk' {
  if (balance <= 0) return 'good';
  if (mode === 'receivable' && overdue / Math.max(balance, 1) >= 0.5) return 'risk';
  if (overdue > 0) return 'watch';
  return 'good';
}

const customerSummarySql = `
  select
    c.id,
    c.code,
    c.name,
    c.gstin,
    c.mobile,
    c.credit_limit as "creditLimit",
    coalesce(max(i.due_date - i.invoice_date), 0) as "creditDays",
    coalesce(sum(i.total_amount), 0) as "totalDebit",
    coalesce(sum(i.amount_paid), 0) as "totalCredit",
    coalesce(sum(i.balance_due), 0) as "balance",
    coalesce(sum(case when i.due_date < current_date and i.balance_due > 0 then i.balance_due else 0 end), 0) as "overdueAmount",
    max(i.invoice_date) as "lastTransactionDate"
  from clients c
  left join invoices i
    on i.client_id = c.id
   and i.organization_id = c.organization_id
   and i.deleted_at is null
   and i.status <> 'cancelled'
   and coalesce(i.party_role, 'customer') = 'customer'
  where c.organization_id = :organizationId
    and c.deleted_at is null
    and (:clientId is null or c.id = cast(:clientId as uuid))
    and (
      :search = ''
      or c.name ilike ('%' || :search || '%')
      or c.code ilike ('%' || :search || '%')
      or coalesce(c.gstin, '') ilike ('%' || :search || '%')
      or coalesce(c.mobile, '') ilike ('%' || :search || '%')
    )
  group by c.id, c.code, c.name, c.gstin, c.mobile, c.credit_limit
  order by "balance" desc, c.name asc
  limit :limit
`;

const customerEntriesSql = `
  with entries as (
    select
      i.id::text as id,
      i.client_id as "partyId",
      c.name as "partyName",
      i.invoice_date as date,
      i.invoice_number as voucher,
      'invoice' as "transactionType",
      'Sale Invoice' as description,
      i.total_amount as debit,
      0::numeric as credit,
      i.id as "referenceId",
      1 as sort_order
    from invoices i
    join clients c on c.id = i.client_id
    where i.organization_id = :organizationId
      and i.deleted_at is null
      and i.status <> 'cancelled'
      and coalesce(i.party_role, 'customer') = 'customer'
      and (:clientId is null or i.client_id = cast(:clientId as uuid))
      and (:startDate is null or i.invoice_date >= cast(:startDate as date))
      and (:endDate is null or i.invoice_date <= cast(:endDate as date))
      and (
        :search = ''
        or c.name ilike ('%' || :search || '%')
        or c.code ilike ('%' || :search || '%')
        or coalesce(c.gstin, '') ilike ('%' || :search || '%')
        or coalesce(c.mobile, '') ilike ('%' || :search || '%')
        or i.invoice_number ilike ('%' || :search || '%')
      )
    union all
    select
      p.id::text as id,
      p.client_id as "partyId",
      c.name as "partyName",
      p.payment_date as date,
      coalesce(nullif(p.reference_number, ''), 'Receipt') as voucher,
      'receipt' as "transactionType",
      'Payment Received' as description,
      0::numeric as debit,
      p.amount as credit,
      p.invoice_id as "referenceId",
      2 as sort_order
    from payments p
    join clients c on c.id = p.client_id
    where p.organization_id = :organizationId
      and p.deleted_at is null
      and (:clientId is null or p.client_id = cast(:clientId as uuid))
      and (:startDate is null or p.payment_date >= cast(:startDate as date))
      and (:endDate is null or p.payment_date <= cast(:endDate as date))
      and (
        :search = ''
        or c.name ilike ('%' || :search || '%')
        or c.code ilike ('%' || :search || '%')
        or coalesce(c.gstin, '') ilike ('%' || :search || '%')
        or coalesce(c.mobile, '') ilike ('%' || :search || '%')
        or coalesce(p.reference_number, '') ilike ('%' || :search || '%')
      )
  ),
  balanced as (
    select
      *,
      sum(debit - credit) over (
        partition by "partyId"
        order by date asc, sort_order asc, voucher asc, id asc
      ) as balance
    from entries
  )
  select *
  from balanced
  order by date desc, sort_order desc
  limit :limit
`;

const vendorSummarySql = `
  select
    v.id,
    v.vendor_code as code,
    v.vendor_name as name,
    v.gst_number as gstin,
    v.mobile,
    v.credit_limit as "creditLimit",
    v.credit_days as "creditDays",
    coalesce(sum(vb.amount_paid), 0) as "totalDebit",
    coalesce(sum(vb.total_amount), 0) as "totalCredit",
    coalesce(sum(vb.balance_due), 0) as "balance",
    coalesce(sum(case when vb.due_date < current_date and vb.balance_due > 0 then vb.balance_due else 0 end), 0) as "overdueAmount",
    max(vb.invoice_date) as "lastTransactionDate"
  from vendors v
  left join vendor_bills vb
    on vb.vendor_id = v.id
   and vb.organization_id = v.organization_id
   and vb.deleted_at is null
   and vb.status <> 'cancelled'
  where v.organization_id = :organizationId
    and v.deleted_at is null
    and (:clientId is null or v.client_id = cast(:clientId as uuid))
    and (
      :search = ''
      or v.vendor_name ilike ('%' || :search || '%')
      or v.vendor_code ilike ('%' || :search || '%')
      or coalesce(v.gst_number, '') ilike ('%' || :search || '%')
      or coalesce(v.mobile, '') ilike ('%' || :search || '%')
    )
  group by v.id, v.vendor_code, v.vendor_name, v.gst_number, v.mobile, v.credit_limit, v.credit_days
  order by "balance" desc, v.vendor_name asc
  limit :limit
`;

const vendorEntriesSql = `
  with entries as (
    select
      vb.id::text as id,
      vb.vendor_id as "partyId",
      v.vendor_name as "partyName",
      vb.invoice_date as date,
      vb.bill_number as voucher,
      'bill' as "transactionType",
      coalesce(vb.category, 'Vendor Bill') as description,
      0::numeric as debit,
      vb.total_amount as credit,
      vb.id as "referenceId",
      1 as sort_order
    from vendor_bills vb
    join vendors v on v.id = vb.vendor_id
    where vb.organization_id = :organizationId
      and vb.deleted_at is null
      and vb.status <> 'cancelled'
      and (:clientId is null or v.client_id = cast(:clientId as uuid))
      and (:startDate is null or vb.invoice_date >= cast(:startDate as date))
      and (:endDate is null or vb.invoice_date <= cast(:endDate as date))
      and (
        :search = ''
        or v.vendor_name ilike ('%' || :search || '%')
        or v.vendor_code ilike ('%' || :search || '%')
        or coalesce(v.gst_number, '') ilike ('%' || :search || '%')
        or coalesce(v.mobile, '') ilike ('%' || :search || '%')
        or vb.bill_number ilike ('%' || :search || '%')
      )
    union all
    select
      vp.id::text as id,
      vp.vendor_id as "partyId",
      v.vendor_name as "partyName",
      vp.payment_date as date,
      coalesce(nullif(vp.reference_number, ''), 'Payment') as voucher,
      'payment' as "transactionType",
      'Payment Made' as description,
      vp.amount as debit,
      0::numeric as credit,
      vp.bill_id as "referenceId",
      2 as sort_order
    from vendor_payments vp
    join vendors v on v.id = vp.vendor_id
    where vp.organization_id = :organizationId
      and vp.status = 'paid'
      and (:clientId is null or v.client_id = cast(:clientId as uuid))
      and (:startDate is null or vp.payment_date >= cast(:startDate as date))
      and (:endDate is null or vp.payment_date <= cast(:endDate as date))
      and (
        :search = ''
        or v.vendor_name ilike ('%' || :search || '%')
        or v.vendor_code ilike ('%' || :search || '%')
        or coalesce(v.gst_number, '') ilike ('%' || :search || '%')
        or coalesce(v.mobile, '') ilike ('%' || :search || '%')
        or coalesce(vp.reference_number, '') ilike ('%' || :search || '%')
      )
  ),
  balanced as (
    select
      *,
      sum(credit - debit) over (
        partition by "partyId"
        order by date asc, sort_order asc, voucher asc, id asc
      ) as balance
    from entries
  )
  select *
  from balanced
  order by date desc, sort_order desc
  limit :limit
`;

export class SubLedgerController {
  static dashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const replacements = dateFilterReplacements(req);
    const [summary] = await queryRows<DbRow>(`
      select
        (select count(*) from clients where organization_id = :organizationId and deleted_at is null and (:clientId is null or id = cast(:clientId as uuid)))
        + (select count(*) from vendors where organization_id = :organizationId and deleted_at is null and (:clientId is null or client_id = cast(:clientId as uuid)))
        + (select count(distinct item_id) from stock_ledger where org_id = :organizationId and (:clientId is null or client_id = cast(:clientId as uuid)))
        + 4 as "totalSubLedgers",
        coalesce((select sum(balance_due) from invoices where organization_id = :organizationId and deleted_at is null and status <> 'cancelled' and (:clientId is null or client_id = cast(:clientId as uuid))), 0) as "receivableAmount",
        coalesce((select sum(vb.balance_due) from vendor_bills vb join vendors v on v.id = vb.vendor_id where vb.organization_id = :organizationId and vb.deleted_at is null and vb.status <> 'cancelled' and (:clientId is null or v.client_id = cast(:clientId as uuid))), 0) as "payableAmount",
        coalesce((select sum(balance_due) from invoices where organization_id = :organizationId and deleted_at is null and status <> 'cancelled' and due_date < current_date and (:clientId is null or client_id = cast(:clientId as uuid))), 0)
        + coalesce((select sum(vb.balance_due) from vendor_bills vb join vendors v on v.id = vb.vendor_id where vb.organization_id = :organizationId and vb.deleted_at is null and vb.status <> 'cancelled' and vb.due_date < current_date and (:clientId is null or v.client_id = cast(:clientId as uuid))), 0) as "overdueAmount",
        (select count(*) from invoices where organization_id = :organizationId and invoice_date = current_date and deleted_at is null and (:clientId is null or client_id = cast(:clientId as uuid)))
        + (select count(*) from payments where organization_id = :organizationId and payment_date = current_date and deleted_at is null and (:clientId is null or client_id = cast(:clientId as uuid)))
        + (select count(*) from vendor_bills vb join vendors v on v.id = vb.vendor_id where vb.organization_id = :organizationId and vb.invoice_date = current_date and vb.deleted_at is null and (:clientId is null or v.client_id = cast(:clientId as uuid)))
        + (select count(*) from vendor_payments vp join vendors v on v.id = vp.vendor_id where vp.organization_id = :organizationId and vp.payment_date = current_date and (:clientId is null or v.client_id = cast(:clientId as uuid)))
        + (select count(*) from stock_ledger where org_id = :organizationId and transaction_date = current_date and (:clientId is null or client_id = cast(:clientId as uuid))) as "todayTransactions"
    `, replacements);

    const collections = await queryRows<DbRow>(`
      select to_char(payment_date, 'Mon') as label, coalesce(sum(amount), 0) as value
      from payments
      where organization_id = :organizationId
        and deleted_at is null
        and (:clientId is null or client_id = cast(:clientId as uuid))
        and payment_date >= date_trunc('month', current_date) - interval '5 months'
      group by date_trunc('month', payment_date), to_char(payment_date, 'Mon')
      order by date_trunc('month', payment_date)
    `, replacements);

    const topCustomers = await queryRows<DbRow>(`
      select c.id, c.name, coalesce(sum(i.balance_due), 0) as balance
      from clients c
      join invoices i on i.client_id = c.id and i.organization_id = c.organization_id
      where c.organization_id = :organizationId
        and c.deleted_at is null
        and i.deleted_at is null
        and i.status <> 'cancelled'
        and (:clientId is null or c.id = cast(:clientId as uuid))
      group by c.id, c.name
      order by balance desc
      limit 5
    `, replacements);

    const topVendors = await queryRows<DbRow>(`
      select v.id, v.vendor_name as name, coalesce(sum(vb.balance_due), 0) as balance
      from vendors v
      join vendor_bills vb on vb.vendor_id = v.id and vb.organization_id = v.organization_id
      where v.organization_id = :organizationId
        and v.deleted_at is null
        and vb.deleted_at is null
        and vb.status <> 'cancelled'
        and (:clientId is null or v.client_id = cast(:clientId as uuid))
      group by v.id, v.vendor_name
      order by balance desc
      limit 5
    `, replacements);

    sendSuccess(res, {
      kpis: {
        totalSubLedgers: toNumber(summary?.totalSubLedgers),
        receivableAmount: toNumber(summary?.receivableAmount),
        payableAmount: toNumber(summary?.payableAmount),
        overdueAmount: toNumber(summary?.overdueAmount),
        todayTransactions: toNumber(summary?.todayTransactions),
      },
      monthlyCollections: collections.map((row) => ({ label: String(row.label), value: toNumber(row.value) })),
      outstandingChart: [
        { label: 'Receivable', value: toNumber(summary?.receivableAmount) },
        { label: 'Payable', value: toNumber(summary?.payableAmount) },
        { label: 'Overdue', value: toNumber(summary?.overdueAmount) },
      ],
      topCustomers: topCustomers.map((row) => ({ id: String(row.id), name: String(row.name), balance: toNumber(row.balance) })),
      topVendors: topVendors.map((row) => ({ id: String(row.id), name: String(row.name), balance: toNumber(row.balance) })),
    });
  });

  static customers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const replacements = dateFilterReplacements(req);

    if (replacements.clientId) {
      return sendSuccess(res, {
        normalBalance: 'debit',
        summaries: [],
        entries: [],
      });
    }

    const [summaryRows, entries] = await Promise.all([
      queryRows<DbRow>(customerSummarySql, replacements),
      queryRows<DbRow>(customerEntriesSql, replacements),
    ]);

    sendSuccess(res, {
      normalBalance: 'debit',
      summaries: summaryRows.map((row) => partySummary(row, 'receivable')),
      entries: entries.map((row) => ledgerEntry(row, 'debit')),
    });
  });

  static vendors = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const replacements = dateFilterReplacements(req);
    const [summaryRows, entries] = await Promise.all([
      queryRows<DbRow>(vendorSummarySql, replacements),
      queryRows<DbRow>(vendorEntriesSql, replacements),
    ]);

    sendSuccess(res, {
      normalBalance: 'credit',
      summaries: summaryRows.map((row) => partySummary(row, 'payable')),
      entries: entries.map((row) => ledgerEntry(row, 'credit')),
    });
  });

  static inventory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const replacements = dateFilterReplacements(req);
    const summaries = await queryRows<DbRow>(`
      select
        i.id,
        i.sku as code,
        i.name,
        i.hsn_sac_code as hsn,
        coalesce(sum(sl.qty_in), 0) as "inQty",
        coalesce(sum(sl.qty_out), 0) as "outQty",
        coalesce(sum(sl.qty_in - sl.qty_out), 0) as balance,
        coalesce(sum((sl.qty_in - sl.qty_out) * sl.rate), 0) as "stockValue",
        max(sl.transaction_date) as "lastTransactionDate"
      from items i
      left join stock_ledger sl on sl.item_id = i.id and sl.org_id = i.org_id
      where i.org_id = :organizationId
        and (:clientId is null or sl.client_id = cast(:clientId as uuid))
        and (:search = '' or i.name ilike ('%' || :search || '%') or coalesce(i.sku, '') ilike ('%' || :search || '%'))
      group by i.id, i.sku, i.name, i.hsn_sac_code
      order by balance desc, i.name asc
      limit :limit
    `, replacements);

    const entries = await queryRows<DbRow>(`
      select
        sl.id::text as id,
        i.id as "partyId",
        i.name as "partyName",
        sl.transaction_date as date,
        coalesce(sl.reference_type, 'manual') as voucher,
        sl.transaction_type as "transactionType",
        coalesce(w.name, 'Warehouse') || coalesce(' / ' || sl.batch_no, '') as description,
        sl.qty_in as debit,
        sl.qty_out as credit,
        sl.running_balance as balance,
        sl.reference_id as "referenceId"
      from stock_ledger sl
      join items i on i.id = sl.item_id
      left join warehouses w on w.id = sl.warehouse_id
      where sl.org_id = :organizationId
        and (:clientId is null or sl.client_id = cast(:clientId as uuid))
        and (:startDate is null or sl.transaction_date >= cast(:startDate as date))
        and (:endDate is null or sl.transaction_date <= cast(:endDate as date))
        and (:search = '' or i.name ilike ('%' || :search || '%') or coalesce(i.sku, '') ilike ('%' || :search || '%'))
      order by sl.transaction_date desc, sl.created_at desc
      limit :limit
    `, replacements);

    sendSuccess(res, {
      summaries: summaries.map((row) => ({
        id: String(row.id),
        code: toStringOrNull(row.code),
        name: String(row.name),
        hsn: toStringOrNull(row.hsn),
        inQty: toNumber(row.inQty),
        outQty: toNumber(row.outQty),
        balance: toNumber(row.balance),
        stockValue: toNumber(row.stockValue),
        lastTransactionDate: toStringOrNull(row.lastTransactionDate),
      })),
      entries: entries.map((row) => ledgerEntry(row, 'debit')),
    });
  });

  static tax = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const replacements = dateFilterReplacements(req);
    const [hasTdsEntries, hasTcsEntries] = await Promise.all([
      tableExists('tds_entries'),
      tableExists('tcs_entries'),
    ]);
    const tdsAmountSql = hasTdsEntries
      ? "coalesce((select sum(tds_amount) from tds_entries where organization_id = :organizationId and deleted_at is null and (:clientId is null or client_id = cast(:clientId as uuid))), 0)"
      : '0';
    const tcsAmountSql = hasTcsEntries
      ? "coalesce((select sum(tcs_amount) from tcs_entries where organization_id = :organizationId and deleted_at is null and (:clientId is null or client_id = cast(:clientId as uuid))), 0)"
      : '0';

    const [summary] = await queryRows<DbRow>(`
      select
        coalesce((select sum(cgst_amount + sgst_amount + igst_amount) from invoices where organization_id = :organizationId and deleted_at is null and status <> 'cancelled' and (:clientId is null or client_id = cast(:clientId as uuid))), 0) as "gstOutput",
        coalesce((select sum(eligible_itc) from itc_ledger where organization_id = :organizationId and (:clientId is null or client_id = cast(:clientId as uuid))), 0) as "gstInput",
        ${tdsAmountSql} as "tdsAmount",
        ${tcsAmountSql} as "tcsAmount"
    `, replacements);

    const entries = await queryRows<DbRow>(`
      select
        id::text,
        client_id as "partyId",
        'GST Output' as "partyName",
        invoice_date as date,
        invoice_number as voucher,
        'gst_output' as "transactionType",
        'Output tax on sales invoice' as description,
        0::numeric as debit,
        (cgst_amount + sgst_amount + igst_amount) as credit,
        0::numeric as balance,
        id as "referenceId"
      from invoices
      where organization_id = :organizationId
        and deleted_at is null
        and status <> 'cancelled'
        and (:clientId is null or client_id = cast(:clientId as uuid))
        and (:startDate is null or invoice_date >= cast(:startDate as date))
        and (:endDate is null or invoice_date <= cast(:endDate as date))
      union all
      select
        id::text,
        client_id as "partyId",
        'GST Input' as "partyName",
        (period || '-01')::date as date,
        period as voucher,
        'gst_input' as "transactionType",
        'Eligible input tax credit' as description,
        eligible_itc as debit,
        0::numeric as credit,
        0::numeric as balance,
        id as "referenceId"
      from itc_ledger
      where organization_id = :organizationId
        and (:clientId is null or client_id = cast(:clientId as uuid))
        and (:startDate is null or (period || '-01')::date >= cast(:startDate as date))
        and (:endDate is null or (period || '-01')::date <= cast(:endDate as date))
      order by date desc
      limit :limit
    `, replacements);

    sendSuccess(res, {
      summary: {
        gstInput: toNumber(summary?.gstInput),
        gstOutput: toNumber(summary?.gstOutput),
        tdsAmount: toNumber(summary?.tdsAmount),
        tcsAmount: toNumber(summary?.tcsAmount),
        netGstPayable: Math.max(toNumber(summary?.gstOutput) - toNumber(summary?.gstInput), 0),
      },
      entries: entries.map((row) => ledgerEntry(row, 'credit')),
    });
  });

  static outstanding = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const replacements = dateFilterReplacements(req);
    const receivables: DbRow[] = replacements.clientId ? [] : await queryRows<DbRow>(`
      select
        c.id,
        c.code,
        c.name,
        coalesce(sum(i.balance_due), 0) as "totalOutstanding",
        coalesce(sum(case when current_date - i.due_date between 0 and 30 then i.balance_due else 0 end), 0) as "bucket0to30",
        coalesce(sum(case when current_date - i.due_date between 31 and 60 then i.balance_due else 0 end), 0) as "bucket31to60",
        coalesce(sum(case when current_date - i.due_date between 61 and 90 then i.balance_due else 0 end), 0) as "bucket61to90",
        coalesce(sum(case when current_date - i.due_date > 90 then i.balance_due else 0 end), 0) as "bucket90Plus",
        min(case when i.balance_due > 0 then i.due_date end) as "nextDueDate"
      from clients c
      join invoices i on i.client_id = c.id and i.organization_id = c.organization_id
      where c.organization_id = :organizationId
        and c.deleted_at is null
        and i.deleted_at is null
        and i.status <> 'cancelled'
        and i.balance_due > 0
        and (:clientId is null or c.id = cast(:clientId as uuid))
        and (:search = '' or c.name ilike ('%' || :search || '%') or c.code ilike ('%' || :search || '%'))
      group by c.id, c.code, c.name
      order by "totalOutstanding" desc
      limit :limit
    `, replacements);

    const payables = await queryRows<DbRow>(`
      select
        v.id,
        v.vendor_code as code,
        v.vendor_name as name,
        coalesce(sum(vb.balance_due), 0) as "totalOutstanding",
        coalesce(sum(case when current_date - vb.due_date between 0 and 30 then vb.balance_due else 0 end), 0) as "bucket0to30",
        coalesce(sum(case when current_date - vb.due_date between 31 and 60 then vb.balance_due else 0 end), 0) as "bucket31to60",
        coalesce(sum(case when current_date - vb.due_date between 61 and 90 then vb.balance_due else 0 end), 0) as "bucket61to90",
        coalesce(sum(case when current_date - vb.due_date > 90 then vb.balance_due else 0 end), 0) as "bucket90Plus",
        min(case when vb.balance_due > 0 then vb.due_date end) as "nextDueDate"
      from vendors v
      join vendor_bills vb on vb.vendor_id = v.id and vb.organization_id = v.organization_id
      where v.organization_id = :organizationId
        and v.deleted_at is null
        and vb.deleted_at is null
        and vb.status <> 'cancelled'
        and vb.balance_due > 0
        and (:clientId is null or v.client_id = cast(:clientId as uuid))
        and (:search = '' or v.vendor_name ilike ('%' || :search || '%') or v.vendor_code ilike ('%' || :search || '%'))
      group by v.id, v.vendor_code, v.vendor_name
      order by "totalOutstanding" desc
      limit :limit
    `, replacements);

    const mapAgeing = (row: DbRow) => ({
      id: String(row.id),
      code: toStringOrNull(row.code),
      name: String(row.name),
      totalOutstanding: toNumber(row.totalOutstanding),
      bucket0to30: toNumber(row.bucket0to30),
      bucket31to60: toNumber(row.bucket31to60),
      bucket61to90: toNumber(row.bucket61to90),
      bucket90Plus: toNumber(row.bucket90Plus),
      nextDueDate: toStringOrNull(row.nextDueDate),
    });

    sendSuccess(res, {
      receivables: receivables.map(mapAgeing),
      payables: payables.map(mapAgeing),
    });
  });

  static reports = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const replacements = dateFilterReplacements(req);
    const collectionRows: DbRow[] = replacements.clientId ? [{ value: 0 }] : await queryRows<DbRow>(`
      select coalesce(sum(amount), 0) as value
      from payments
      where organization_id = :organizationId
        and deleted_at is null
        and (:clientId is null or client_id = cast(:clientId as uuid))
        and payment_date >= date_trunc('month', current_date)
    `, replacements);
    const [collection] = collectionRows;
    const [payment] = await queryRows<DbRow>(`
      select coalesce(sum(amount), 0) as value
      from vendor_payments
      join vendors v on v.id = vendor_payments.vendor_id
      where vendor_payments.organization_id = :organizationId
        and vendor_payments.status = 'paid'
        and (:clientId is null or v.client_id = cast(:clientId as uuid))
        and payment_date >= date_trunc('month', current_date)
    `, replacements);
    const customerRows: DbRow[] = replacements.clientId ? [] : await queryRows<DbRow>(customerSummarySql, replacements);
    const vendorRows = await queryRows<DbRow>(vendorSummarySql, replacements);

    sendSuccess(res, {
      reports: [
        { name: 'Outstanding Report', amount: customerRows.reduce((sum, row) => sum + toNumber(row.balance), 0) + vendorRows.reduce((sum, row) => sum + toNumber(row.balance), 0), rows: customerRows.length + vendorRows.length },
        { name: 'Ageing Report', amount: customerRows.reduce((sum, row) => sum + toNumber(row.overdueAmount), 0) + vendorRows.reduce((sum, row) => sum + toNumber(row.overdueAmount), 0), rows: customerRows.filter((row) => toNumber(row.overdueAmount) > 0).length + vendorRows.filter((row) => toNumber(row.overdueAmount) > 0).length },
        { name: 'Collection Report', amount: toNumber(collection?.value), rows: 1 },
        { name: 'Payment Report', amount: toNumber(payment?.value), rows: 1 },
        { name: 'Ledger Summary', amount: customerRows.reduce((sum, row) => sum + toNumber(row.totalDebit), 0), rows: customerRows.length },
      ],
    });
  });

  static auditLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const replacements = dateFilterReplacements(req);
    const rows = await queryRows<DbRow>(`
      select
        al.id::text,
        al.created_at as date,
        c.name as "partyName",
        coalesce(al.entity_type, 'ledger') as "transactionType",
        al.action as voucher,
        coalesce(al.entity_id::text, '') as "referenceId",
        al.action || coalesce(' / ' || al.entity_type, '') as description,
        0::numeric as debit,
        0::numeric as credit,
        0::numeric as balance
      from activity_log al
      left join clients c on c.id = al.client_id
      where al.organization_id = :organizationId
        and (:clientId is null or al.client_id = cast(:clientId as uuid))
        and (:startDate is null or al.created_at::date >= cast(:startDate as date))
        and (:endDate is null or al.created_at::date <= cast(:endDate as date))
        and (:search = '' or al.action ilike ('%' || :search || '%') or coalesce(al.entity_type, '') ilike ('%' || :search || '%') or coalesce(c.name, '') ilike ('%' || :search || '%'))
      order by al.created_at desc
      limit :limit
    `, replacements);

    sendSuccess(res, { entries: rows.map((row) => ledgerEntry(row, 'debit')) });
  });

  static emptyLedger = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    sendSuccess(res, { summaries: [], entries: [] });
  });
}

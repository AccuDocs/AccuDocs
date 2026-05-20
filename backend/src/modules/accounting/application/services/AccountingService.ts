import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../../../../config/database.config';
import { AppError } from '../../../../utils/errors';

type DbRow = Record<string, unknown>;
type Replacements = Record<string, unknown>;

type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
type NormalBalance = 'debit' | 'credit';
type VoucherType =
  | 'sales_invoice'
  | 'purchase_invoice'
  | 'receipt'
  | 'payment'
  | 'credit_note'
  | 'debit_note'
  | 'journal'
  | 'contra'
  | 'expense'
  | 'stock_transfer'
  | 'opening'
  | 'closing'
  | 'gst_settlement'
  | 'bank_reconciliation';
type VoucherStatus = 'draft' | 'pending_approval' | 'approved' | 'posted';
type PartyType = 'customer' | 'vendor' | 'employee' | 'bank' | 'tax' | 'none';

interface DateWindow {
  startDate: string;
  endDate: string;
  clientId: string | null;
  limit: number;
}

interface AccountingLineInput {
  accountId: string;
  debit?: number | string | null;
  credit?: number | string | null;
  debitAmount?: number | string | null;
  creditAmount?: number | string | null;
  description?: string | null;
  partyType?: PartyType | null;
  partyId?: string | null;
  taxId?: string | null;
  gstComponent?: 'cgst' | 'sgst' | 'igst' | 'cess' | 'none' | null;
  referenceType?: string | null;
  referenceId?: string | null;
}

interface CreateVoucherInput {
  voucherType: VoucherType;
  voucherDate: string;
  status?: VoucherStatus;
  narration?: string | null;
  branchId?: string | null;
  costCenterId?: string | null;
  sourceModule?: string;
  sourceType?: string;
  sourceId?: string | null;
  partyType?: 'customer' | 'vendor' | 'employee' | 'bank' | 'none';
  partyId?: string | null;
  idempotencyKey?: string | null;
  isSystemGenerated?: boolean;
  lines: AccountingLineInput[];
}

interface CreateAccountInput {
  accountCode: string;
  name: string;
  accountType: AccountType;
  accountGroupId?: string | null;
  accountGroupCode?: string | null;
  parentAccountId?: string | null;
  branchId?: string | null;
  costCenterId?: string | null;
  normalBalance?: NormalBalance | null;
  controlType?: string | null;
  currencyCode?: string | null;
  isControlAccount?: boolean;
  allowManualPosting?: boolean;
  openingBalance?: number | string | null;
  openingBalanceType?: NormalBalance | null;
  openingBalanceDate?: string | null;
  gstApplicable?: boolean;
  hsnSacCode?: string | null;
}

interface FiscalYearRow extends DbRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface SettingsRow extends DbRow {
  id: string;
  defaultBranchId: string | null;
  receivableControlAccountId: string | null;
  payableControlAccountId: string | null;
  salesRevenueAccountId: string | null;
  purchaseAccountId: string | null;
  inventoryAccountId: string | null;
  cogsAccountId: string | null;
  cashAccountId: string | null;
  bankChargesAccountId: string | null;
  roundingAccountId: string | null;
  retainedEarningsAccountId: string | null;
  baseCurrencyCode: string;
}

interface PostedDocumentResult {
  voucherId: string;
  journalEntryId: string;
  voucherNo: string;
  entryNo: string;
  status: string;
  alreadyPosted?: boolean;
}

const voucherPrefixes: Record<VoucherType, string> = {
  sales_invoice: 'SV',
  purchase_invoice: 'PV',
  receipt: 'RC',
  payment: 'PY',
  credit_note: 'CN',
  debit_note: 'DN',
  journal: 'JV',
  contra: 'CV',
  expense: 'EX',
  stock_transfer: 'ST',
  opening: 'OP',
  closing: 'CL',
  gst_settlement: 'GST',
  bank_reconciliation: 'BR',
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function money(value: unknown): number {
  return Math.round(toNumber(value) * 100) / 100;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function stringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function dateOnly(value?: string | Date | null): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function defaultWindow(): { startDate: string; endDate: string } {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  return {
    startDate: `${startYear}-04-01`,
    endDate: today.toISOString().slice(0, 10),
  };
}

function parseWindow(query: Record<string, unknown> = {}): DateWindow {
  const defaults = defaultWindow();
  return {
    startDate: dateOnly(stringOrNull(query.startDate) ?? defaults.startDate),
    endDate: dateOnly(stringOrNull(query.endDate) ?? defaults.endDate),
    clientId: stringOrNull(query.clientId),
    limit: Math.min(Math.max(Number(query.limit ?? 50), 1), 250),
  };
}

function normalBalanceFor(type: AccountType): NormalBalance {
  return type === 'asset' || type === 'expense' ? 'debit' : 'credit';
}

async function queryRows<T extends DbRow>(
  sql: string,
  replacements: Replacements = {},
  transaction?: Transaction,
): Promise<T[]> {
  return sequelize.query<T>(sql, {
    replacements,
    transaction,
    type: QueryTypes.SELECT,
  });
}

async function queryOne<T extends DbRow>(
  sql: string,
  replacements: Replacements = {},
  transaction?: Transaction,
): Promise<T | null> {
  const rows = await queryRows<T>(sql, replacements, transaction);
  return rows[0] ?? null;
}

async function execute(sql: string, replacements: Replacements = {}, transaction?: Transaction): Promise<void> {
  await sequelize.query(sql, { replacements, transaction });
}

function displayBalance(row: DbRow): number {
  const normalBalance = String(row.normalBalance ?? row.normal_balance ?? 'debit');
  const debit = toNumber(row.debit);
  const credit = toNumber(row.credit);
  return normalBalance === 'credit' ? round(credit - debit) : round(debit - credit);
}

function lineInput(accountId: string, debit: number, credit: number, description: string, extra: Partial<AccountingLineInput> = {}): AccountingLineInput {
  return {
    accountId,
    debit,
    credit,
    description,
    partyType: extra.partyType ?? null,
    partyId: extra.partyId ?? null,
    taxId: extra.taxId ?? null,
    gstComponent: extra.gstComponent ?? null,
    referenceType: extra.referenceType ?? null,
    referenceId: extra.referenceId ?? null,
  };
}

export class AccountingService {
  static windowFromQuery(query: Record<string, unknown>): DateWindow {
    return parseWindow(query);
  }

  static async getDashboard(organizationId: string, window: DateWindow) {
    const replacements = { organizationId, ...window };
    const summary = await queryOne<DbRow>(
      `
        with period_lines as (
          select
            a.account_type,
            a.control_type,
            a.normal_balance,
            coalesce(sum(jel.base_debit_amount), 0) as debit,
            coalesce(sum(jel.base_credit_amount), 0) as credit
          from journal_entry_lines jel
          join journal_entries je on je.id = jel.journal_entry_id
          join accounts a on a.id = jel.account_id
          where je.organization_id = :organizationId
            and je.status = 'posted'
            and je.deleted_at is null
            and je.posting_date between cast(:startDate as date) and cast(:endDate as date)
            and (:clientId is null or jel.party_id = cast(:clientId as uuid))
          group by a.account_type, a.control_type, a.normal_balance
        ),
        to_date_lines as (
          select
            a.account_type,
            a.control_type,
            a.normal_balance,
            coalesce(sum(jel.base_debit_amount), 0) as debit,
            coalesce(sum(jel.base_credit_amount), 0) as credit
          from journal_entry_lines jel
          join journal_entries je on je.id = jel.journal_entry_id
          join accounts a on a.id = jel.account_id
          where je.organization_id = :organizationId
            and je.status = 'posted'
            and je.deleted_at is null
            and je.posting_date <= cast(:endDate as date)
            and (:clientId is null or jel.party_id = cast(:clientId as uuid))
          group by a.account_type, a.control_type, a.normal_balance
        )
        select
          coalesce(sum(case when account_type = 'income' then credit - debit else 0 end), 0) as "revenue",
          coalesce(sum(case when account_type = 'expense' then debit - credit else 0 end), 0) as "expenses",
          (
            select coalesce(sum(case when control_type = 'bank' then debit - credit else 0 end), 0)
            from to_date_lines
          ) as "bankBalance",
          (
            select coalesce(sum(case when control_type = 'cash' then debit - credit else 0 end), 0)
            from to_date_lines
          ) as "cashBalance",
          (
            select coalesce(sum(case when control_type = 'receivable' then debit - credit else 0 end), 0)
            from to_date_lines
          ) as "receivables",
          (
            select coalesce(sum(case when control_type = 'payable' then credit - debit else 0 end), 0)
            from to_date_lines
          ) as "payables",
          (
            select coalesce(sum(case when control_type = 'tax_output' then credit - debit when control_type = 'tax_input' then debit - credit else 0 end), 0)
            from to_date_lines
          ) as "gstNet"
        from period_lines
      `,
      replacements,
    );

    const counts = await queryOne<DbRow>(
      `
        select
          (select count(*)::int from accounts where organization_id = :organizationId and deleted_at is null) as "accountCount",
          (select count(*)::int from vouchers where organization_id = :organizationId and deleted_at is null) as "voucherCount",
          (select count(*)::int from journal_entries where organization_id = :organizationId and deleted_at is null and status = 'posted') as "postedJournalCount",
          (
            select coalesce(sum(total_debit), 0)
            from journal_entries
            where organization_id = :organizationId and status = 'posted' and deleted_at is null
          ) as "postedDebit",
          (
            select coalesce(sum(total_credit), 0)
            from journal_entries
            where organization_id = :organizationId and status = 'posted' and deleted_at is null
          ) as "postedCredit"
      `,
      replacements,
    );

    const recentTransactions = await this.listVouchers(organizationId, { ...window, limit: 8 });
    const revenue = toNumber(summary?.revenue);
    const expenses = toNumber(summary?.expenses);

    return {
      period: { startDate: window.startDate, endDate: window.endDate },
      summary: {
        revenue,
        expenses,
        netProfit: round(revenue - expenses),
        bankBalance: toNumber(summary?.bankBalance),
        cashBalance: toNumber(summary?.cashBalance),
        receivables: toNumber(summary?.receivables),
        payables: toNumber(summary?.payables),
        gstNet: toNumber(summary?.gstNet),
        accountCount: toNumber(counts?.accountCount),
        voucherCount: toNumber(counts?.voucherCount),
        postedJournalCount: toNumber(counts?.postedJournalCount),
        postedDebit: toNumber(counts?.postedDebit),
        postedCredit: toNumber(counts?.postedCredit),
        isBalanced: round(toNumber(counts?.postedDebit)) === round(toNumber(counts?.postedCredit)),
      },
      recentTransactions,
    };
  }

  static async listAccounts(organizationId: string, query: Record<string, unknown> = {}) {
    const rows = await queryRows<DbRow>(
      `
        select
          a.id,
          a.account_code as "accountCode",
          a.name,
          a.account_type as "accountType",
          a.sub_type as "subType",
          a.normal_balance as "normalBalance",
          a.control_type as "controlType",
          a.opening_balance as "openingBalance",
          a.opening_balance_type as "openingBalanceType",
          a.current_balance as "currentBalance",
          a.currency_code as "currencyCode",
          a.gst_applicable as "gstApplicable",
          a.status,
          a.system_defined as "systemDefined",
          ag.id as "groupId",
          ag.code as "groupCode",
          ag.name as "groupName",
          ag.report_section as "reportSection",
          parent.account_code as "parentAccountCode",
          parent.name as "parentAccountName"
        from accounts a
        join account_groups ag on ag.id = a.account_group_id
        left join accounts parent on parent.id = a.parent_account_id
        where a.organization_id = :organizationId
          and a.deleted_at is null
          and (:accountType is null or a.account_type = :accountType)
          and (:search = '' or a.account_code ilike ('%' || :search || '%') or a.name ilike ('%' || :search || '%'))
        order by a.account_code asc
      `,
      {
        organizationId,
        accountType: stringOrNull(query.accountType),
        search: stringOrNull(query.search) ?? '',
      },
    );

    const groups = await queryRows<DbRow>(
      `
        select
          ag.id,
          ag.code,
          ag.name,
          ag.group_type as "groupType",
          ag.normal_balance as "normalBalance",
          ag.report_section as "reportSection",
          ag.parent_id as "parentId",
          count(a.id)::int as "accountCount",
          coalesce(sum(a.current_balance), 0) as "balance"
        from account_groups ag
        left join accounts a on a.account_group_id = ag.id and a.deleted_at is null
        where ag.organization_id = :organizationId
          and ag.deleted_at is null
        group by ag.id, ag.code, ag.name, ag.group_type, ag.normal_balance, ag.report_section, ag.parent_id, ag.sort_order
        order by ag.sort_order asc, ag.code asc
      `,
      { organizationId },
    );

    return { accounts: rows, groups };
  }

  static async createAccount(organizationId: string, userId: string, input: CreateAccountInput) {
    const accountCode = stringOrNull(input.accountCode);
    const name = stringOrNull(input.name);
    if (!accountCode || !name) throw new AppError('Account code and name are required', 400);

    const accountType = input.accountType;
    if (!['asset', 'liability', 'equity', 'income', 'expense'].includes(accountType)) {
      throw new AppError('Invalid account type', 400);
    }

    return sequelize.transaction(async (transaction) => {
      const group = await this.resolveAccountGroup(organizationId, accountType, input.accountGroupId, input.accountGroupCode, transaction);
      const normalBalance = input.normalBalance ?? normalBalanceFor(accountType);
      const row = await queryOne<DbRow>(
        `
          insert into accounts (
            organization_id, account_group_id, parent_account_id, branch_id, cost_center_id,
            account_code, name, account_type, normal_balance, control_type,
            currency_code, is_control_account, allow_manual_posting,
            opening_balance, opening_balance_type, opening_balance_date,
            gst_applicable, hsn_sac_code, status, system_defined, created_by
          )
          values (
            :organizationId, :accountGroupId, cast(:parentAccountId as uuid), cast(:branchId as uuid), cast(:costCenterId as uuid),
            :accountCode, :name, :accountType, :normalBalance, :controlType,
            :currencyCode, :isControlAccount, :allowManualPosting,
            :openingBalance, :openingBalanceType, cast(:openingBalanceDate as date),
            :gstApplicable, :hsnSacCode, 'active', false, :userId
          )
          returning
            id,
            account_code as "accountCode",
            name,
            account_type as "accountType",
            normal_balance as "normalBalance",
            control_type as "controlType",
            opening_balance as "openingBalance",
            current_balance as "currentBalance",
            status
        `,
        {
          organizationId,
          accountGroupId: group.id,
          parentAccountId: input.parentAccountId ?? null,
          branchId: input.branchId ?? null,
          costCenterId: input.costCenterId ?? null,
          accountCode,
          name,
          accountType,
          normalBalance,
          controlType: input.controlType ?? null,
          currencyCode: input.currencyCode ?? 'INR',
          isControlAccount: input.isControlAccount ?? false,
          allowManualPosting: input.allowManualPosting ?? true,
          openingBalance: money(input.openingBalance),
          openingBalanceType: input.openingBalanceType ?? normalBalance,
          openingBalanceDate: input.openingBalanceDate ?? null,
          gstApplicable: input.gstApplicable ?? false,
          hsnSacCode: input.hsnSacCode ?? null,
          userId,
        },
        transaction,
      );
      if (!row) throw new AppError('Account could not be created', 500);
      return row;
    });
  }

  static async listVouchers(organizationId: string, query: Record<string, unknown> = {}) {
    return queryRows<DbRow>(
      `
        select
          v.id,
          v.voucher_no as "voucherNo",
          v.voucher_type as "voucherType",
          v.voucher_date as "voucherDate",
          v.source_module as "sourceModule",
          v.source_type as "sourceType",
          v.source_id as "sourceId",
          v.party_type as "partyType",
          v.party_id as "partyId",
          v.total_debit as "totalDebit",
          v.total_credit as "totalCredit",
          v.narration,
          v.status,
          v.approval_status as "approvalStatus",
          v.posted_at as "postedAt",
          je.id as "journalEntryId",
          je.entry_no as "entryNo"
        from vouchers v
        left join journal_entries je on je.voucher_id = v.id and je.deleted_at is null
        where v.organization_id = :organizationId
          and v.deleted_at is null
          and (:status is null or v.status = :status)
          and (:voucherType is null or v.voucher_type = :voucherType)
          and (:clientId is null or v.party_id = cast(:clientId as uuid))
        order by v.voucher_date desc, v.created_at desc
        limit :limit
      `,
      {
        organizationId,
        status: stringOrNull(query.status),
        voucherType: stringOrNull(query.voucherType),
        clientId: stringOrNull(query.clientId),
        limit: Math.min(Math.max(Number(query.limit ?? 50), 1), 250),
      },
    );
  }

  static async getVoucher(organizationId: string, voucherId: string) {
    const voucher = await queryOne<DbRow>(
      `
        select
          v.id,
          v.voucher_no as "voucherNo",
          v.voucher_type as "voucherType",
          v.voucher_date as "voucherDate",
          v.narration,
          v.status,
          v.total_debit as "totalDebit",
          v.total_credit as "totalCredit",
          je.id as "journalEntryId",
          je.entry_no as "entryNo"
        from vouchers v
        left join journal_entries je on je.voucher_id = v.id and je.deleted_at is null
        where v.organization_id = :organizationId
          and v.id = cast(:voucherId as uuid)
          and v.deleted_at is null
      `,
      { organizationId, voucherId },
    );
    if (!voucher) throw new AppError('Voucher not found', 404);

    const lines = await queryRows<DbRow>(
      `
        select
          jel.id,
          jel.line_no as "lineNo",
          jel.account_id as "accountId",
          a.account_code as "accountCode",
          a.name as "accountName",
          jel.debit_amount as debit,
          jel.credit_amount as credit,
          jel.description,
          jel.party_type as "partyType",
          jel.party_id as "partyId",
          jel.gst_component as "gstComponent",
          jel.reference_type as "referenceType",
          jel.reference_id as "referenceId"
        from journal_entry_lines jel
        join journal_entries je on je.id = jel.journal_entry_id
        join accounts a on a.id = jel.account_id
        where je.organization_id = :organizationId
          and je.voucher_id = cast(:voucherId as uuid)
        order by jel.line_no asc
      `,
      { organizationId, voucherId },
    );

    return { ...voucher, lines };
  }

  static async createVoucher(organizationId: string, userId: string, input: CreateVoucherInput): Promise<PostedDocumentResult> {
    const normalized = this.normalizeVoucherInput(input);
    return sequelize.transaction(async (transaction) => {
      const settings = await this.getSettingsForOrg(organizationId, transaction);
      const branchId = normalized.branchId ?? settings.defaultBranchId;
      const fiscalYear = await this.resolveFiscalYear(organizationId, normalized.voucherDate, transaction);
      await this.assertPeriodOpen(organizationId, fiscalYear.id, branchId, normalized.voucherDate, transaction);
      await this.assertAccountsBelongToOrg(organizationId, normalized.lines.map((line) => line.accountId), transaction);

      const totalDebit = round(normalized.lines.reduce((sum, line) => sum + money(line.debit ?? line.debitAmount), 0));
      const totalCredit = round(normalized.lines.reduce((sum, line) => sum + money(line.credit ?? line.creditAmount), 0));
      if (normalized.lines.length < 2 || totalDebit <= 0 || totalCredit <= 0 || totalDebit !== totalCredit) {
        throw new AppError(`Journal is not balanced. Debit ${totalDebit.toFixed(2)}, credit ${totalCredit.toFixed(2)}`, 400);
      }

      if (normalized.idempotencyKey) {
        const existing = await queryOne<DbRow>(
          `
            select je.id as "journalEntryId", je.entry_no as "entryNo", v.id as "voucherId", v.voucher_no as "voucherNo", je.status
            from journal_entries je
            join vouchers v on v.id = je.voucher_id
            where je.organization_id = :organizationId
              and je.idempotency_key = :idempotencyKey
              and je.deleted_at is null
            limit 1
          `,
          { organizationId, idempotencyKey: normalized.idempotencyKey },
          transaction,
        );
        if (existing) {
          return {
            voucherId: String(existing.voucherId),
            journalEntryId: String(existing.journalEntryId),
            voucherNo: String(existing.voucherNo),
            entryNo: String(existing.entryNo),
            status: String(existing.status),
            alreadyPosted: true,
          };
        }
      }

      const voucherNo = await this.nextVoucherNo(organizationId, normalized.voucherType, fiscalYear.id, transaction);
      const entryNo = await this.nextEntryNo(organizationId, fiscalYear.id, transaction);
      const status = normalized.status ?? 'draft';
      const voucher = await queryOne<DbRow>(
        `
          insert into vouchers (
            organization_id, fiscal_year_id, branch_id, cost_center_id, voucher_type,
            voucher_no, voucher_date, source_module, source_type, source_id,
            party_type, party_id, total_debit, total_credit, narration,
            status, approval_status, submitted_by, posted_by, posted_at, created_by
          )
          values (
            :organizationId, :fiscalYearId, cast(:branchId as uuid), cast(:costCenterId as uuid), :voucherType,
            :voucherNo, :voucherDate, :sourceModule, :sourceType, cast(:sourceId as uuid),
            :partyType, cast(:partyId as uuid), :totalDebit, :totalCredit, :narration,
            :status, :approvalStatus, :userId, :postedBy, :postedAt, :userId
          )
          returning id, voucher_no as "voucherNo"
        `,
        {
          organizationId,
          fiscalYearId: fiscalYear.id,
          branchId,
          costCenterId: normalized.costCenterId ?? null,
          voucherType: normalized.voucherType,
          voucherNo,
          voucherDate: normalized.voucherDate,
          sourceModule: normalized.sourceModule ?? 'accounting',
          sourceType: normalized.sourceType ?? normalized.voucherType,
          sourceId: normalized.sourceId ?? null,
          partyType: normalized.partyType ?? 'none',
          partyId: normalized.partyId ?? null,
          totalDebit,
          totalCredit,
          narration: normalized.narration ?? null,
          status,
          approvalStatus: status === 'pending_approval' ? 'pending' : status === 'approved' || status === 'posted' ? 'approved' : 'not_required',
          userId,
          postedBy: status === 'posted' ? userId : null,
          postedAt: status === 'posted' ? new Date() : null,
        },
        transaction,
      );
      if (!voucher) throw new AppError('Voucher could not be created', 500);

      const journal = await queryOne<DbRow>(
        `
          insert into journal_entries (
            organization_id, fiscal_year_id, branch_id, voucher_id, entry_no,
            entry_date, posting_date, source_module, source_type, source_id,
            narration, currency_code, exchange_rate, total_debit, total_credit,
            status, is_system_generated, idempotency_key, posted_by, posted_at, created_by
          )
          values (
            :organizationId, :fiscalYearId, cast(:branchId as uuid), :voucherId, :entryNo,
            :entryDate, :postingDate, :sourceModule, :sourceType, cast(:sourceId as uuid),
            :narration, :currencyCode, 1, :totalDebit, :totalCredit,
            :status, :isSystemGenerated, :idempotencyKey, :postedBy, :postedAt, :userId
          )
          returning id, entry_no as "entryNo"
        `,
        {
          organizationId,
          fiscalYearId: fiscalYear.id,
          branchId,
          voucherId: voucher.id,
          entryNo,
          entryDate: normalized.voucherDate,
          postingDate: normalized.voucherDate,
          sourceModule: normalized.sourceModule ?? 'accounting',
          sourceType: normalized.sourceType ?? normalized.voucherType,
          sourceId: normalized.sourceId ?? null,
          narration: normalized.narration ?? null,
          currencyCode: settings.baseCurrencyCode || 'INR',
          totalDebit,
          totalCredit,
          status,
          isSystemGenerated: normalized.isSystemGenerated ?? false,
          idempotencyKey: normalized.idempotencyKey ?? null,
          postedBy: status === 'posted' ? userId : null,
          postedAt: status === 'posted' ? new Date() : null,
          userId,
        },
        transaction,
      );
      if (!journal) throw new AppError('Journal entry could not be created', 500);

      for (let index = 0; index < normalized.lines.length; index += 1) {
        const line = normalized.lines[index];
        await this.insertJournalLine(organizationId, String(journal.id), branchId, normalized.costCenterId ?? null, index + 1, line, settings.baseCurrencyCode, transaction);
      }

      if (status === 'posted') {
        await this.refreshAccountBalances(organizationId, transaction);
      }

      return {
        voucherId: String(voucher.id),
        journalEntryId: String(journal.id),
        voucherNo: String(voucher.voucherNo),
        entryNo: String(journal.entryNo),
        status,
      };
    });
  }

  static async listJournalEntries(organizationId: string, query: Record<string, unknown> = {}) {
    return queryRows<DbRow>(
      `
        select
          je.id,
          je.entry_no as "entryNo",
          je.entry_date as "entryDate",
          je.posting_date as "postingDate",
          je.source_module as "sourceModule",
          je.source_type as "sourceType",
          je.source_id as "sourceId",
          je.narration,
          je.total_debit as "totalDebit",
          je.total_credit as "totalCredit",
          je.status,
          v.voucher_no as "voucherNo",
          v.voucher_type as "voucherType"
        from journal_entries je
        left join vouchers v on v.id = je.voucher_id
        where je.organization_id = :organizationId
          and je.deleted_at is null
          and (:status is null or je.status = :status)
          and (:startDate is null or je.posting_date >= cast(:startDate as date))
          and (:endDate is null or je.posting_date <= cast(:endDate as date))
        order by je.posting_date desc, je.created_at desc
        limit :limit
      `,
      {
        organizationId,
        status: stringOrNull(query.status),
        startDate: stringOrNull(query.startDate),
        endDate: stringOrNull(query.endDate),
        limit: Math.min(Math.max(Number(query.limit ?? 50), 1), 250),
      },
    );
  }

  static async getLedger(organizationId: string, query: Record<string, unknown> = {}) {
    const window = parseWindow(query);
    const accountId = stringOrNull(query.accountId);
    const rows = await queryRows<DbRow>(
      `
        with entries as (
          select
            jel.id,
            je.posting_date as date,
            je.entry_no as "entryNo",
            v.voucher_no as "voucherNo",
            v.voucher_type as "voucherType",
            a.id as "accountId",
            a.account_code as "accountCode",
            a.name as "accountName",
            a.normal_balance as "normalBalance",
            jel.debit_amount as debit,
            jel.credit_amount as credit,
            jel.description,
            jel.party_type as "partyType",
            jel.party_id as "partyId",
            sum(
              case when a.normal_balance = 'credit'
                then jel.base_credit_amount - jel.base_debit_amount
                else jel.base_debit_amount - jel.base_credit_amount
              end
            ) over (
              partition by a.id
              order by je.posting_date asc, je.entry_no asc, jel.line_no asc
            ) as "runningBalance"
          from journal_entry_lines jel
          join journal_entries je on je.id = jel.journal_entry_id
          left join vouchers v on v.id = je.voucher_id
          join accounts a on a.id = jel.account_id
          where je.organization_id = :organizationId
            and je.status = 'posted'
            and je.deleted_at is null
            and je.posting_date between cast(:startDate as date) and cast(:endDate as date)
            and (:accountId is null or a.id = cast(:accountId as uuid))
            and (:clientId is null or jel.party_id = cast(:clientId as uuid))
        )
        select *
        from entries
        order by date desc, "entryNo" desc
        limit :limit
      `,
      {
        organizationId,
        accountId,
        ...window,
      },
    );
    return { period: { startDate: window.startDate, endDate: window.endDate }, entries: rows };
  }

  static async trialBalance(organizationId: string, query: Record<string, unknown> = {}) {
    const window = parseWindow(query);
    const rows = await queryRows<DbRow>(
      `
        with movements as (
          select
            jel.account_id,
            coalesce(sum(case when je.posting_date < cast(:startDate as date) then jel.base_debit_amount else 0 end), 0) as opening_debit,
            coalesce(sum(case when je.posting_date < cast(:startDate as date) then jel.base_credit_amount else 0 end), 0) as opening_credit,
            coalesce(sum(case when je.posting_date between cast(:startDate as date) and cast(:endDate as date) then jel.base_debit_amount else 0 end), 0) as period_debit,
            coalesce(sum(case when je.posting_date between cast(:startDate as date) and cast(:endDate as date) then jel.base_credit_amount else 0 end), 0) as period_credit
          from journal_entry_lines jel
          join journal_entries je on je.id = jel.journal_entry_id
          where je.organization_id = :organizationId
            and je.status = 'posted'
            and je.deleted_at is null
            and je.posting_date <= cast(:endDate as date)
            and (:clientId is null or jel.party_id = cast(:clientId as uuid))
          group by jel.account_id
        )
        select
          a.id,
          a.account_code as "accountCode",
          a.name,
          a.account_type as "accountType",
          a.normal_balance as "normalBalance",
          ag.name as "groupName",
          coalesce(m.opening_debit, 0) as "openingDebit",
          coalesce(m.opening_credit, 0) as "openingCredit",
          coalesce(m.period_debit, 0) as "periodDebit",
          coalesce(m.period_credit, 0) as "periodCredit",
          greatest(
            coalesce(m.opening_debit, 0) - coalesce(m.opening_credit, 0)
            + coalesce(m.period_debit, 0) - coalesce(m.period_credit, 0),
            0
          ) as "closingDebit",
          greatest(
            coalesce(m.opening_credit, 0) - coalesce(m.opening_debit, 0)
            + coalesce(m.period_credit, 0) - coalesce(m.period_debit, 0),
            0
          ) as "closingCredit"
        from accounts a
        join account_groups ag on ag.id = a.account_group_id
        left join movements m on m.account_id = a.id
        where a.organization_id = :organizationId
          and a.deleted_at is null
        order by a.account_code
      `,
      { organizationId, ...window },
    );
    const totalDebit = round(rows.reduce((sum, row) => sum + toNumber(row.closingDebit), 0));
    const totalCredit = round(rows.reduce((sum, row) => sum + toNumber(row.closingCredit), 0));
    return {
      period: { startDate: window.startDate, endDate: window.endDate },
      rows,
      totals: { debit: totalDebit, credit: totalCredit, isBalanced: totalDebit === totalCredit },
    };
  }

  static async profitAndLoss(organizationId: string, query: Record<string, unknown> = {}) {
    const window = parseWindow(query);
    const rows = await queryRows<DbRow>(
      `
        select
          a.account_type as "accountType",
          ag.name as "groupName",
          a.id as "accountId",
          a.account_code as "accountCode",
          a.name as "accountName",
          coalesce(sum(jel.base_debit_amount), 0) as debit,
          coalesce(sum(jel.base_credit_amount), 0) as credit
        from journal_entry_lines jel
        join journal_entries je on je.id = jel.journal_entry_id
        join accounts a on a.id = jel.account_id
        join account_groups ag on ag.id = a.account_group_id
        where je.organization_id = :organizationId
          and je.status = 'posted'
          and je.deleted_at is null
          and a.account_type in ('income', 'expense')
          and je.posting_date between cast(:startDate as date) and cast(:endDate as date)
          and (:clientId is null or jel.party_id = cast(:clientId as uuid))
        group by a.account_type, ag.name, a.id, a.account_code, a.name
        order by a.account_type, a.account_code
      `,
      { organizationId, ...window },
    );
    const lines: Array<DbRow & { amount: number }> = rows.map((row) => ({
      ...row,
      amount: String(row.accountType) === 'income'
        ? round(toNumber(row.credit) - toNumber(row.debit))
        : round(toNumber(row.debit) - toNumber(row.credit)),
    }));
    const revenue = round(lines.filter((row) => String(row.accountType) === 'income').reduce((sum, row) => sum + row.amount, 0));
    const expenses = round(lines.filter((row) => String(row.accountType) === 'expense').reduce((sum, row) => sum + row.amount, 0));
    return {
      period: { startDate: window.startDate, endDate: window.endDate },
      lines,
      totals: {
        revenue,
        expenses,
        netProfit: round(revenue - expenses),
      },
    };
  }

  static async balanceSheet(organizationId: string, query: Record<string, unknown> = {}) {
    const window = parseWindow(query);
    const rows = await queryRows<DbRow>(
      `
        with movements as (
          select
            jel.account_id,
            coalesce(sum(jel.base_debit_amount), 0) as debit,
            coalesce(sum(jel.base_credit_amount), 0) as credit
          from journal_entry_lines jel
          join journal_entries je on je.id = jel.journal_entry_id
          where je.organization_id = :organizationId
            and je.status = 'posted'
            and je.deleted_at is null
            and je.posting_date <= cast(:endDate as date)
            and (:clientId is null or jel.party_id = cast(:clientId as uuid))
          group by jel.account_id
        )
        select
          a.account_type as "accountType",
          ag.name as "groupName",
          a.id as "accountId",
          a.account_code as "accountCode",
          a.name as "accountName",
          a.normal_balance as "normalBalance",
          coalesce(m.debit, 0) as debit,
          coalesce(m.credit, 0) as credit
        from accounts a
        join account_groups ag on ag.id = a.account_group_id
        left join movements m on m.account_id = a.id
        where a.organization_id = :organizationId
          and a.account_type in ('asset', 'liability', 'equity')
          and a.deleted_at is null
        order by a.account_type, a.account_code
      `,
      { organizationId, ...window },
    );
    const lines: Array<DbRow & { amount: number }> = rows.map((row) => ({ ...row, amount: displayBalance(row) }));
    const pnl = await this.profitAndLoss(organizationId, query);
    const totalAssets = round(lines.filter((row) => String(row.accountType) === 'asset').reduce((sum, row) => sum + toNumber(row.amount), 0));
    const liabilities = round(lines.filter((row) => String(row.accountType) === 'liability').reduce((sum, row) => sum + toNumber(row.amount), 0));
    const equityBeforeProfit = round(lines.filter((row) => String(row.accountType) === 'equity').reduce((sum, row) => sum + toNumber(row.amount), 0));
    const equity = round(equityBeforeProfit + pnl.totals.netProfit);
    return {
      asOfDate: window.endDate,
      lines,
      currentPeriodProfit: pnl.totals.netProfit,
      totals: {
        assets: totalAssets,
        liabilities,
        equity,
        liabilitiesAndEquity: round(liabilities + equity),
        isBalanced: totalAssets === round(liabilities + equity),
      },
    };
  }

  static async cashFlow(organizationId: string, query: Record<string, unknown> = {}) {
    const window = parseWindow(query);
    const rows = await queryRows<DbRow>(
      `
        select
          je.posting_date as date,
          coalesce(v.voucher_no, je.entry_no) as reference,
          a.id as "accountId",
          a.account_code as "accountCode",
          a.name as "accountName",
          jel.description,
          jel.base_debit_amount as inflow,
          jel.base_credit_amount as outflow
        from journal_entry_lines jel
        join journal_entries je on je.id = jel.journal_entry_id
        left join vouchers v on v.id = je.voucher_id
        join accounts a on a.id = jel.account_id
        where je.organization_id = :organizationId
          and je.status = 'posted'
          and je.deleted_at is null
          and a.control_type in ('cash', 'bank')
          and je.posting_date between cast(:startDate as date) and cast(:endDate as date)
          and (:clientId is null or jel.party_id = cast(:clientId as uuid))
        order by je.posting_date desc, reference desc
        limit :limit
      `,
      { organizationId, ...window },
    );
    const inflow = round(rows.reduce((sum, row) => sum + toNumber(row.inflow), 0));
    const outflow = round(rows.reduce((sum, row) => sum + toNumber(row.outflow), 0));
    return {
      period: { startDate: window.startDate, endDate: window.endDate },
      rows,
      totals: { operatingInflow: inflow, operatingOutflow: outflow, netCashMovement: round(inflow - outflow) },
    };
  }

  static async outstanding(organizationId: string, partyType: 'customer' | 'vendor', query: Record<string, unknown> = {}) {
    const window = parseWindow(query);
    const rows = await queryRows<DbRow>(
      `
        select
          jel.party_id as "partyId",
          case
            when :partyType = 'customer' then coalesce(c.display_name, clients.name)
            else coalesce(v.vendor_name, v.business_name)
          end as "partyName",
          coalesce(sum(jel.base_debit_amount), 0) as debit,
          coalesce(sum(jel.base_credit_amount), 0) as credit,
          max(je.posting_date) as "lastTransactionDate"
        from journal_entry_lines jel
        join journal_entries je on je.id = jel.journal_entry_id
        left join customers c on c.client_id = jel.party_id and :partyType = 'customer'
        left join clients on clients.id = c.client_id
        left join vendors v on v.id = jel.party_id and :partyType = 'vendor'
        where je.organization_id = :organizationId
          and je.status = 'posted'
          and je.deleted_at is null
          and jel.party_type = :partyType
          and jel.party_id is not null
          and je.posting_date <= cast(:endDate as date)
          and (:clientId is null or jel.party_id = cast(:clientId as uuid))
        group by jel.party_id, c.display_name, clients.name, v.vendor_name, v.business_name
        order by abs(coalesce(sum(jel.base_debit_amount - jel.base_credit_amount), 0)) desc
        limit :limit
      `,
      { organizationId, partyType, ...window },
    );

    const balances = rows.map((row) => {
      const balance = partyType === 'customer'
        ? round(toNumber(row.debit) - toNumber(row.credit))
        : round(toNumber(row.credit) - toNumber(row.debit));
      return { ...row, balance };
    });

    return { asOfDate: window.endDate, partyType, rows: balances };
  }

  static async getSettings(organizationId: string) {
    const settings = await this.getSettingsForOrg(organizationId);
    const accounts = await queryRows<DbRow>(
      `
        select
          a.id,
          a.account_code as "accountCode",
          a.name,
          a.control_type as "controlType"
        from accounts a
        where a.organization_id = :organizationId
          and a.deleted_at is null
          and a.control_type is not null
        order by a.account_code
      `,
      { organizationId },
    );
    return { settings, controlAccounts: accounts };
  }

  static async postSalesInvoice(organizationId: string, userId: string, invoiceId: string): Promise<PostedDocumentResult> {
    return sequelize.transaction(async (transaction) => {
      const existing = await this.findPostedSourceJournal(organizationId, 'billing', 'invoice', invoiceId, transaction);
      if (existing) return existing;
      const settings = await this.getSettingsForOrg(organizationId, transaction);
      this.assertSettingAccounts(settings, ['receivableControlAccountId', 'salesRevenueAccountId']);

      const invoice = await queryOne<DbRow>(
        `
          select
            i.id,
            i.invoice_number as "invoiceNumber",
            i.invoice_date as "invoiceDate",
            i.client_id as "clientId",
            i.branch_id as "branchId",
            i.cost_center_id as "costCenterId",
            i.subtotal,
            i.discount_amount as "discountAmount",
            i.cgst_amount as "cgstAmount",
            i.sgst_amount as "sgstAmount",
            i.igst_amount as "igstAmount",
            i.round_off as "roundOff",
            i.total_amount as "totalAmount",
            i.status
          from invoices i
          where i.organization_id = :organizationId
            and i.id = cast(:invoiceId as uuid)
            and i.deleted_at is null
          for update
        `,
        { organizationId, invoiceId },
        transaction,
      );
      if (!invoice) throw new AppError('Invoice not found', 404);
      if (String(invoice.status) === 'cancelled') throw new AppError('Cancelled invoices cannot be posted', 400);

      const invoiceDate = dateOnly(String(invoice.invoiceDate));
      const taxable = round(toNumber(invoice.subtotal) - toNumber(invoice.discountAmount));
      const total = money(invoice.totalAmount);
      const partyId = String(invoice.clientId);
      const common = { partyType: 'customer' as PartyType, partyId, referenceType: 'invoice', referenceId: invoiceId };
      const lines: AccountingLineInput[] = [
        lineInput(String(settings.receivableControlAccountId), total, 0, `Receivable for ${String(invoice.invoiceNumber)}`, common),
        lineInput(String(settings.salesRevenueAccountId), 0, taxable, `Revenue for ${String(invoice.invoiceNumber)}`, common),
      ];

      await this.addOutputTaxLine(organizationId, lines, 'cgst', toNumber(invoice.cgstAmount), common, transaction);
      await this.addOutputTaxLine(organizationId, lines, 'sgst', toNumber(invoice.sgstAmount), common, transaction);
      await this.addOutputTaxLine(organizationId, lines, 'igst', toNumber(invoice.igstAmount), common, transaction);
      this.addRoundingLine(lines, settings, toNumber(invoice.roundOff), common);

      const result = await this.createVoucherInsideTransaction(organizationId, userId, {
        voucherType: 'sales_invoice',
        voucherDate: invoiceDate,
        status: 'posted',
        narration: `Sales invoice ${String(invoice.invoiceNumber)}`,
        branchId: String(invoice.branchId ?? settings.defaultBranchId ?? ''),
        costCenterId: stringOrNull(invoice.costCenterId),
        sourceModule: 'billing',
        sourceType: 'invoice',
        sourceId: invoiceId,
        partyType: 'customer',
        partyId,
        idempotencyKey: `billing:invoice:${invoiceId}:post`,
        isSystemGenerated: true,
        lines,
      }, transaction);

      await execute(
        `
          update invoices
          set posting_status = 'posted',
              voucher_id = :voucherId,
              journal_entry_id = :journalEntryId,
              fiscal_year_id = :fiscalYearId,
              branch_id = coalesce(branch_id, cast(:branchId as uuid)),
              updated_at = now()
          where organization_id = :organizationId
            and id = cast(:invoiceId as uuid)
        `,
        {
          organizationId,
          invoiceId,
          voucherId: result.voucherId,
          journalEntryId: result.journalEntryId,
          fiscalYearId: result.fiscalYearId,
          branchId: result.branchId,
        },
        transaction,
      );
      await this.refreshAccountBalances(organizationId, transaction);
      return result;
    });
  }

  static async postCustomerPayment(organizationId: string, userId: string, paymentId: string): Promise<PostedDocumentResult> {
    return sequelize.transaction(async (transaction) => {
      const existing = await this.findPostedSourceJournal(organizationId, 'billing', 'payment', paymentId, transaction);
      if (existing) return existing;
      const settings = await this.getSettingsForOrg(organizationId, transaction);
      this.assertSettingAccounts(settings, ['receivableControlAccountId']);

      const payment = await queryOne<DbRow>(
        `
          select
            p.id,
            p.invoice_id as "invoiceId",
            p.client_id as "clientId",
            p.amount,
            p.payment_date as "paymentDate",
            p.payment_mode as "paymentMode",
            p.reference_number as "referenceNumber",
            p.branch_id as "branchId",
            p.bank_account_id as "bankAccountId"
          from payments p
          where p.organization_id = :organizationId
            and p.id = cast(:paymentId as uuid)
            and p.deleted_at is null
          for update
        `,
        { organizationId, paymentId },
        transaction,
      );
      if (!payment) throw new AppError('Payment not found', 404);

      const bankOrCashAccountId = await this.resolveMoneyAccount(organizationId, settings, stringOrNull(payment.paymentMode), stringOrNull(payment.bankAccountId), transaction);
      const amount = money(payment.amount);
      const partyId = String(payment.clientId);
      const common = { partyType: 'customer' as PartyType, partyId, referenceType: 'payment', referenceId: paymentId };
      const result = await this.createVoucherInsideTransaction(organizationId, userId, {
        voucherType: 'receipt',
        voucherDate: dateOnly(String(payment.paymentDate)),
        status: 'posted',
        narration: `Receipt ${stringOrNull(payment.referenceNumber) ?? paymentId}`,
        branchId: stringOrNull(payment.branchId) ?? settings.defaultBranchId,
        sourceModule: 'billing',
        sourceType: 'payment',
        sourceId: paymentId,
        partyType: 'customer',
        partyId,
        idempotencyKey: `billing:payment:${paymentId}:post`,
        isSystemGenerated: true,
        lines: [
          lineInput(bankOrCashAccountId, amount, 0, 'Money received', common),
          lineInput(String(settings.receivableControlAccountId), 0, amount, 'Receivable settled', common),
        ],
      }, transaction);

      await execute(
        `
          update payments
          set posting_status = 'posted',
              voucher_id = :voucherId,
              journal_entry_id = :journalEntryId,
              bank_account_id = coalesce(bank_account_id, :bankAccountId),
              branch_id = coalesce(branch_id, cast(:branchId as uuid)),
              updated_at = now()
          where organization_id = :organizationId
            and id = cast(:paymentId as uuid)
        `,
        {
          organizationId,
          paymentId,
          voucherId: result.voucherId,
          journalEntryId: result.journalEntryId,
          bankAccountId: await this.defaultBankAccountId(organizationId, transaction),
          branchId: result.branchId,
        },
        transaction,
      );
      await this.refreshAccountBalances(organizationId, transaction);
      return result;
    });
  }

  static async postVendorBill(organizationId: string, userId: string, billId: string): Promise<PostedDocumentResult> {
    return sequelize.transaction(async (transaction) => {
      const existing = await this.findPostedSourceJournal(organizationId, 'vendors', 'vendor_bill', billId, transaction);
      if (existing) return existing;
      const settings = await this.getSettingsForOrg(organizationId, transaction);
      this.assertSettingAccounts(settings, ['payableControlAccountId', 'purchaseAccountId']);

      const bill = await queryOne<DbRow>(
        `
          select
            vb.id,
            vb.bill_number as "billNumber",
            vb.vendor_id as "vendorId",
            vb.invoice_date as "invoiceDate",
            vb.subtotal,
            vb.tax_amount as "taxAmount",
            vb.total_amount as "totalAmount",
            vb.status,
            v.branch_id as "branchId"
          from vendor_bills vb
          join vendors v on v.id = vb.vendor_id
          where vb.organization_id = :organizationId
            and vb.id = cast(:billId as uuid)
            and vb.deleted_at is null
          for update
        `,
        { organizationId, billId },
        transaction,
      );
      if (!bill) throw new AppError('Vendor bill not found', 404);
      if (String(bill.status) === 'cancelled') throw new AppError('Cancelled vendor bills cannot be posted', 400);

      const partyId = String(bill.vendorId);
      const common = { partyType: 'vendor' as PartyType, partyId, referenceType: 'vendor_bill', referenceId: billId };
      const taxAccountId = await this.findTaxAccount(organizationId, 'igst', 'input', transaction);
      const lines = [
        lineInput(String(settings.purchaseAccountId), money(bill.subtotal), 0, `Purchase ${String(bill.billNumber)}`, common),
      ];
      if (toNumber(bill.taxAmount) > 0 && taxAccountId) {
        lines.push(lineInput(taxAccountId.accountId, money(bill.taxAmount), 0, `Input GST ${String(bill.billNumber)}`, {
          ...common,
          taxId: taxAccountId.taxId,
          gstComponent: 'igst',
        }));
      }
      lines.push(lineInput(String(settings.payableControlAccountId), 0, money(bill.totalAmount), `Payable for ${String(bill.billNumber)}`, common));

      const result = await this.createVoucherInsideTransaction(organizationId, userId, {
        voucherType: 'purchase_invoice',
        voucherDate: dateOnly(String(bill.invoiceDate)),
        status: 'posted',
        narration: `Vendor bill ${String(bill.billNumber)}`,
        branchId: stringOrNull(bill.branchId) ?? settings.defaultBranchId,
        sourceModule: 'vendors',
        sourceType: 'vendor_bill',
        sourceId: billId,
        partyType: 'vendor',
        partyId,
        idempotencyKey: `vendors:vendor_bill:${billId}:post`,
        isSystemGenerated: true,
        lines,
      }, transaction);

      await execute(
        `
          update vendor_bills
          set status = case when status = 'draft' then 'pending' else status end,
              updated_at = now()
          where organization_id = :organizationId
            and id = cast(:billId as uuid)
        `,
        { organizationId, billId },
        transaction,
      );
      await this.upsertPurchaseWrapper(organizationId, userId, billId, result, bill, transaction);
      await this.refreshAccountBalances(organizationId, transaction);
      return result;
    });
  }

  static async postVendorPayment(organizationId: string, userId: string, paymentId: string): Promise<PostedDocumentResult> {
    return sequelize.transaction(async (transaction) => {
      const existing = await this.findPostedSourceJournal(organizationId, 'vendors', 'vendor_payment', paymentId, transaction);
      if (existing) return existing;
      const settings = await this.getSettingsForOrg(organizationId, transaction);
      this.assertSettingAccounts(settings, ['payableControlAccountId']);

      const payment = await queryOne<DbRow>(
        `
          select
            vp.id,
            vp.vendor_id as "vendorId",
            vp.bill_id as "billId",
            vp.amount,
            vp.payment_date as "paymentDate",
            vp.payment_method as "paymentMethod",
            vp.reference_number as "referenceNumber",
            vp.branch_id as "branchId",
            vp.bank_account_id as "bankAccountId"
          from vendor_payments vp
          where vp.organization_id = :organizationId
            and vp.id = cast(:paymentId as uuid)
          for update
        `,
        { organizationId, paymentId },
        transaction,
      );
      if (!payment) throw new AppError('Vendor payment not found', 404);
      const bankOrCashAccountId = await this.resolveMoneyAccount(organizationId, settings, stringOrNull(payment.paymentMethod), stringOrNull(payment.bankAccountId), transaction);
      const amount = money(payment.amount);
      const partyId = String(payment.vendorId);
      const common = { partyType: 'vendor' as PartyType, partyId, referenceType: 'vendor_payment', referenceId: paymentId };
      const result = await this.createVoucherInsideTransaction(organizationId, userId, {
        voucherType: 'payment',
        voucherDate: dateOnly(String(payment.paymentDate)),
        status: 'posted',
        narration: `Vendor payment ${stringOrNull(payment.referenceNumber) ?? paymentId}`,
        branchId: stringOrNull(payment.branchId) ?? settings.defaultBranchId,
        sourceModule: 'vendors',
        sourceType: 'vendor_payment',
        sourceId: paymentId,
        partyType: 'vendor',
        partyId,
        idempotencyKey: `vendors:vendor_payment:${paymentId}:post`,
        isSystemGenerated: true,
        lines: [
          lineInput(String(settings.payableControlAccountId), amount, 0, 'Payable settled', common),
          lineInput(bankOrCashAccountId, 0, amount, 'Money paid', common),
        ],
      }, transaction);

      await execute(
        `
          update vendor_payments
          set posting_status = 'posted',
              voucher_id = :voucherId,
              journal_entry_id = :journalEntryId,
              bank_account_id = coalesce(bank_account_id, :bankAccountId),
              branch_id = coalesce(branch_id, cast(:branchId as uuid)),
              updated_at = now()
          where organization_id = :organizationId
            and id = cast(:paymentId as uuid)
        `,
        {
          organizationId,
          paymentId,
          voucherId: result.voucherId,
          journalEntryId: result.journalEntryId,
          bankAccountId: await this.defaultBankAccountId(organizationId, transaction),
          branchId: result.branchId,
        },
        transaction,
      );
      await this.refreshAccountBalances(organizationId, transaction);
      return result;
    });
  }

  private static async createVoucherInsideTransaction(
    organizationId: string,
    userId: string,
    input: CreateVoucherInput,
    transaction: Transaction,
  ): Promise<PostedDocumentResult & { fiscalYearId: string; branchId: string | null }> {
    const normalized = this.normalizeVoucherInput(input);
    const settings = await this.getSettingsForOrg(organizationId, transaction);
    const branchId = normalized.branchId || settings.defaultBranchId;
    const fiscalYear = await this.resolveFiscalYear(organizationId, normalized.voucherDate, transaction);
    await this.assertPeriodOpen(organizationId, fiscalYear.id, branchId, normalized.voucherDate, transaction);
    await this.assertAccountsBelongToOrg(organizationId, normalized.lines.map((line) => line.accountId), transaction);

    const totalDebit = round(normalized.lines.reduce((sum, line) => sum + money(line.debit ?? line.debitAmount), 0));
    const totalCredit = round(normalized.lines.reduce((sum, line) => sum + money(line.credit ?? line.creditAmount), 0));
    if (normalized.lines.length < 2 || totalDebit <= 0 || totalCredit <= 0 || totalDebit !== totalCredit) {
      throw new AppError(`Journal is not balanced. Debit ${totalDebit.toFixed(2)}, credit ${totalCredit.toFixed(2)}`, 400);
    }

    if (normalized.idempotencyKey) {
      const existing = await queryOne<DbRow>(
        `
          select je.id as "journalEntryId", je.entry_no as "entryNo", v.id as "voucherId", v.voucher_no as "voucherNo", je.status
          from journal_entries je
          join vouchers v on v.id = je.voucher_id
          where je.organization_id = :organizationId
            and je.idempotency_key = :idempotencyKey
            and je.deleted_at is null
          limit 1
        `,
        { organizationId, idempotencyKey: normalized.idempotencyKey },
        transaction,
      );
      if (existing) {
        return {
          voucherId: String(existing.voucherId),
          journalEntryId: String(existing.journalEntryId),
          voucherNo: String(existing.voucherNo),
          entryNo: String(existing.entryNo),
          status: String(existing.status),
          alreadyPosted: true,
          fiscalYearId: fiscalYear.id,
          branchId,
        };
      }
    }

    const voucherNo = await this.nextVoucherNo(organizationId, normalized.voucherType, fiscalYear.id, transaction);
    const entryNo = await this.nextEntryNo(organizationId, fiscalYear.id, transaction);
    const status = normalized.status ?? 'posted';
    const now = new Date();
    const voucher = await queryOne<DbRow>(
      `
        insert into vouchers (
          organization_id, fiscal_year_id, branch_id, cost_center_id, voucher_type,
          voucher_no, voucher_date, source_module, source_type, source_id,
          party_type, party_id, total_debit, total_credit, narration,
          status, approval_status, submitted_by, posted_by, posted_at, created_by
        )
        values (
          :organizationId, :fiscalYearId, cast(:branchId as uuid), cast(:costCenterId as uuid), :voucherType,
          :voucherNo, :voucherDate, :sourceModule, :sourceType, cast(:sourceId as uuid),
          :partyType, cast(:partyId as uuid), :totalDebit, :totalCredit, :narration,
          :status, :approvalStatus, :userId, :postedBy, :postedAt, :userId
        )
        returning id, voucher_no as "voucherNo"
      `,
      {
        organizationId,
        fiscalYearId: fiscalYear.id,
        branchId,
        costCenterId: normalized.costCenterId ?? null,
        voucherType: normalized.voucherType,
        voucherNo,
        voucherDate: normalized.voucherDate,
        sourceModule: normalized.sourceModule ?? 'accounting',
        sourceType: normalized.sourceType ?? normalized.voucherType,
        sourceId: normalized.sourceId ?? null,
        partyType: normalized.partyType ?? 'none',
        partyId: normalized.partyId ?? null,
        totalDebit,
        totalCredit,
        narration: normalized.narration ?? null,
        status,
        approvalStatus: status === 'pending_approval' ? 'pending' : status === 'approved' || status === 'posted' ? 'approved' : 'not_required',
        userId,
        postedBy: status === 'posted' ? userId : null,
        postedAt: status === 'posted' ? now : null,
      },
      transaction,
    );
    if (!voucher) throw new AppError('Voucher could not be created', 500);

    const journal = await queryOne<DbRow>(
      `
        insert into journal_entries (
          organization_id, fiscal_year_id, branch_id, voucher_id, entry_no,
          entry_date, posting_date, source_module, source_type, source_id,
          narration, currency_code, exchange_rate, total_debit, total_credit,
          status, is_system_generated, idempotency_key, posted_by, posted_at, created_by
        )
        values (
          :organizationId, :fiscalYearId, cast(:branchId as uuid), :voucherId, :entryNo,
          :entryDate, :postingDate, :sourceModule, :sourceType, cast(:sourceId as uuid),
          :narration, :currencyCode, 1, :totalDebit, :totalCredit,
          :status, :isSystemGenerated, :idempotencyKey, :postedBy, :postedAt, :userId
        )
        returning id, entry_no as "entryNo"
      `,
      {
        organizationId,
        fiscalYearId: fiscalYear.id,
        branchId,
        voucherId: voucher.id,
        entryNo,
        entryDate: normalized.voucherDate,
        postingDate: normalized.voucherDate,
        sourceModule: normalized.sourceModule ?? 'accounting',
        sourceType: normalized.sourceType ?? normalized.voucherType,
        sourceId: normalized.sourceId ?? null,
        narration: normalized.narration ?? null,
        currencyCode: settings.baseCurrencyCode || 'INR',
        totalDebit,
        totalCredit,
        status,
        isSystemGenerated: normalized.isSystemGenerated ?? true,
        idempotencyKey: normalized.idempotencyKey ?? null,
        postedBy: status === 'posted' ? userId : null,
        postedAt: status === 'posted' ? now : null,
        userId,
      },
      transaction,
    );
    if (!journal) throw new AppError('Journal entry could not be created', 500);

    for (let index = 0; index < normalized.lines.length; index += 1) {
      await this.insertJournalLine(organizationId, String(journal.id), branchId, normalized.costCenterId ?? null, index + 1, normalized.lines[index], settings.baseCurrencyCode, transaction);
    }

    return {
      voucherId: String(voucher.id),
      journalEntryId: String(journal.id),
      voucherNo: String(voucher.voucherNo),
      entryNo: String(journal.entryNo),
      status,
      fiscalYearId: fiscalYear.id,
      branchId,
    };
  }

  private static normalizeVoucherInput(input: CreateVoucherInput): CreateVoucherInput {
    if (!input || !input.voucherType || !input.voucherDate || !Array.isArray(input.lines)) {
      throw new AppError('Voucher type, date, and journal lines are required', 400);
    }
    if (!Object.prototype.hasOwnProperty.call(voucherPrefixes, input.voucherType)) {
      throw new AppError('Invalid voucher type', 400);
    }
    const status = input.status ?? 'draft';
    if (!['draft', 'pending_approval', 'approved', 'posted'].includes(status)) {
      throw new AppError('Invalid voucher status', 400);
    }
    return { ...input, status };
  }

  private static async insertJournalLine(
    organizationId: string,
    journalEntryId: string,
    branchId: string | null,
    costCenterId: string | null,
    lineNo: number,
    line: AccountingLineInput,
    currencyCode: string,
    transaction: Transaction,
  ): Promise<void> {
    const debit = money(line.debit ?? line.debitAmount);
    const credit = money(line.credit ?? line.creditAmount);
    if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
      throw new AppError(`Line ${lineNo} must contain either debit or credit`, 400);
    }
    await execute(
      `
        insert into journal_entry_lines (
          organization_id, journal_entry_id, line_no, account_id, branch_id,
          cost_center_id, party_type, party_id, tax_id, debit_amount,
          credit_amount, currency_code, exchange_rate, base_debit_amount,
          base_credit_amount, description, reference_type, reference_id,
          gst_component
        )
        values (
          :organizationId, :journalEntryId, :lineNo, cast(:accountId as uuid), cast(:branchId as uuid),
          cast(:costCenterId as uuid), :partyType, cast(:partyId as uuid), cast(:taxId as uuid), :debit,
          :credit, :currencyCode, 1, :debit, :credit, :description,
          :referenceType, cast(:referenceId as uuid), :gstComponent
        )
      `,
      {
        organizationId,
        journalEntryId,
        lineNo,
        accountId: line.accountId,
        branchId,
        costCenterId,
        partyType: line.partyType ?? 'none',
        partyId: line.partyId ?? null,
        taxId: line.taxId ?? null,
        debit,
        credit,
        currencyCode: currencyCode || 'INR',
        description: line.description ?? null,
        referenceType: line.referenceType ?? null,
        referenceId: line.referenceId ?? null,
        gstComponent: line.gstComponent ?? 'none',
      },
      transaction,
    );
  }

  private static async resolveFiscalYear(organizationId: string, postingDate: string, transaction: Transaction): Promise<FiscalYearRow> {
    const row = await queryOne<FiscalYearRow>(
      `
        select
          id,
          name,
          start_date as "startDate",
          end_date as "endDate",
          status
        from fiscal_years
        where organization_id = :organizationId
          and cast(:postingDate as date) between start_date and end_date
          and deleted_at is null
        order by start_date desc
        limit 1
      `,
      { organizationId, postingDate },
      transaction,
    );
    if (!row) throw new AppError(`No fiscal year is configured for ${postingDate}`, 400);
    if (['hard_locked', 'closed', 'closing'].includes(row.status)) {
      throw new AppError(`Fiscal year ${row.name} is ${row.status}`, 409);
    }
    return row;
  }

  private static async assertPeriodOpen(
    organizationId: string,
    fiscalYearId: string,
    branchId: string | null,
    postingDate: string,
    transaction: Transaction,
  ): Promise<void> {
    const lock = await queryOne<DbRow>(
      `
        select lock_type as "lockType", reason
        from period_locks
        where organization_id = :organizationId
          and fiscal_year_id = :fiscalYearId
          and status = 'active'
          and lock_type in ('hard', 'full')
          and cast(:postingDate as date) between period_start and period_end
          and (branch_id is null or branch_id = cast(:branchId as uuid))
        limit 1
      `,
      { organizationId, fiscalYearId, branchId, postingDate },
      transaction,
    );
    if (lock) throw new AppError(`Accounting period is ${String(lock.lockType)} locked`, 409);
  }

  private static async resolveAccountGroup(
    organizationId: string,
    accountType: AccountType,
    accountGroupId?: string | null,
    accountGroupCode?: string | null,
    transaction?: Transaction,
  ) {
    const group = await queryOne<DbRow>(
      `
        select id
        from account_groups
        where organization_id = :organizationId
          and deleted_at is null
          and group_type = :accountType
          and (
            (:accountGroupId is not null and id = cast(:accountGroupId as uuid))
            or (:accountGroupId is null and :accountGroupCode is not null and code = :accountGroupCode)
            or (:accountGroupId is null and :accountGroupCode is null)
          )
        order by case when parent_id is null then 1 else 0 end, sort_order asc, code asc
        limit 1
      `,
      { organizationId, accountType, accountGroupId: accountGroupId ?? null, accountGroupCode: accountGroupCode ?? null },
      transaction,
    );
    if (!group) throw new AppError(`No ${accountType} account group is configured`, 400);
    return group;
  }

  private static async assertAccountsBelongToOrg(organizationId: string, accountIds: string[], transaction: Transaction): Promise<void> {
    const uniqueIds = Array.from(new Set(accountIds));
    if (uniqueIds.length === 0) throw new AppError('At least one account is required', 400);
    const rows = await queryRows<DbRow>(
      `
        select id
        from accounts
        where organization_id = :organizationId
          and deleted_at is null
          and id in (:accountIds)
      `,
      { organizationId, accountIds: uniqueIds },
      transaction,
    );
    if (rows.length !== uniqueIds.length) throw new AppError('One or more accounts are invalid for this organization', 400);
  }

  private static async nextVoucherNo(organizationId: string, voucherType: VoucherType, fiscalYearId: string, transaction: Transaction): Promise<string> {
    const row = await queryOne<DbRow>(
      `
        select count(*)::int + 1 as next
        from vouchers
        where organization_id = :organizationId
          and voucher_type = :voucherType
          and fiscal_year_id = :fiscalYearId
      `,
      { organizationId, voucherType, fiscalYearId },
      transaction,
    );
    return `${voucherPrefixes[voucherType]}-${String(toNumber(row?.next)).padStart(5, '0')}`;
  }

  private static async nextEntryNo(organizationId: string, fiscalYearId: string, transaction: Transaction): Promise<string> {
    const row = await queryOne<DbRow>(
      `
        select count(*)::int + 1 as next
        from journal_entries
        where organization_id = :organizationId
          and fiscal_year_id = :fiscalYearId
      `,
      { organizationId, fiscalYearId },
      transaction,
    );
    return `JE-${String(toNumber(row?.next)).padStart(5, '0')}`;
  }

  private static async getSettingsForOrg(organizationId: string, transaction?: Transaction): Promise<SettingsRow> {
    const row = await queryOne<SettingsRow>(
      `
        select
          id,
          default_branch_id as "defaultBranchId",
          receivable_control_account_id as "receivableControlAccountId",
          payable_control_account_id as "payableControlAccountId",
          sales_revenue_account_id as "salesRevenueAccountId",
          purchase_account_id as "purchaseAccountId",
          inventory_account_id as "inventoryAccountId",
          cogs_account_id as "cogsAccountId",
          cash_account_id as "cashAccountId",
          bank_charges_account_id as "bankChargesAccountId",
          rounding_account_id as "roundingAccountId",
          retained_earnings_account_id as "retainedEarningsAccountId",
          base_currency_code as "baseCurrencyCode"
        from accounting_settings
        where organization_id = :organizationId
        limit 1
      `,
      { organizationId },
      transaction,
    );
    if (!row) throw new AppError('Accounting settings are not configured. Run the accounting foundation seed first.', 400);
    return row;
  }

  private static assertSettingAccounts(settings: SettingsRow, keys: Array<keyof SettingsRow>): void {
    const missing = keys.filter((key) => !settings[key]);
    if (missing.length) throw new AppError(`Accounting setting missing: ${missing.join(', ')}`, 400);
  }

  private static async resolveMoneyAccount(
    organizationId: string,
    settings: SettingsRow,
    method: string | null,
    bankAccountId: string | null,
    transaction: Transaction,
  ): Promise<string> {
    if (method === 'cash') {
      if (!settings.cashAccountId) throw new AppError('Cash account is not configured', 400);
      return settings.cashAccountId;
    }
    if (bankAccountId) {
      const row = await queryOne<DbRow>(
        `
          select account_id as "accountId"
          from bank_accounts
          where organization_id = :organizationId
            and id = cast(:bankAccountId as uuid)
            and deleted_at is null
          limit 1
        `,
        { organizationId, bankAccountId },
        transaction,
      );
      if (row?.accountId) return String(row.accountId);
    }
    const row = await queryOne<DbRow>(
      `
        select account_id as "accountId"
        from bank_accounts
        where organization_id = :organizationId
          and deleted_at is null
          and status = 'active'
        order by is_default desc, created_at asc
        limit 1
      `,
      { organizationId },
      transaction,
    );
    if (!row?.accountId) throw new AppError('Default bank account is not configured', 400);
    return String(row.accountId);
  }

  private static async defaultBankAccountId(organizationId: string, transaction: Transaction): Promise<string | null> {
    const row = await queryOne<DbRow>(
      `
        select id
        from bank_accounts
        where organization_id = :organizationId
          and deleted_at is null
          and status = 'active'
        order by is_default desc, created_at asc
        limit 1
      `,
      { organizationId },
      transaction,
    );
    return row?.id ? String(row.id) : null;
  }

  private static async findTaxAccount(
    organizationId: string,
    component: 'cgst' | 'sgst' | 'igst' | 'cess',
    direction: 'input' | 'output',
    transaction: Transaction,
  ): Promise<{ taxId: string; accountId: string } | null> {
    const row = await queryOne<DbRow>(
      `
        select
          id as "taxId",
          coalesce(payable_account_id, receivable_account_id) as "accountId"
        from taxes
        where organization_id = :organizationId
          and tax_component = :component
          and tax_type = :taxType
          and is_active = true
          and deleted_at is null
        order by rate asc, effective_from desc
        limit 1
      `,
      { organizationId, component, taxType: direction === 'input' ? 'gst_input' : 'gst_output' },
      transaction,
    );
    if (!row?.taxId || !row?.accountId) return null;
    return { taxId: String(row.taxId), accountId: String(row.accountId) };
  }

  private static async addOutputTaxLine(
    organizationId: string,
    lines: AccountingLineInput[],
    component: 'cgst' | 'sgst' | 'igst',
    amount: number,
    common: Partial<AccountingLineInput>,
    transaction: Transaction,
  ): Promise<void> {
    if (amount <= 0) return;
    const taxAccount = await this.findTaxAccount(organizationId, component, 'output', transaction);
    if (!taxAccount) throw new AppError(`Output ${component.toUpperCase()} account is not configured`, 400);
    lines.push(lineInput(taxAccount.accountId, 0, money(amount), `Output ${component.toUpperCase()}`, {
      ...common,
      taxId: taxAccount.taxId,
      gstComponent: component,
    }));
  }

  private static addRoundingLine(lines: AccountingLineInput[], settings: SettingsRow, roundOff: number, common: Partial<AccountingLineInput>): void {
    if (!settings.roundingAccountId || roundOff === 0) return;
    if (roundOff > 0) {
      lines.push(lineInput(settings.roundingAccountId, 0, money(roundOff), 'Rounding adjustment', common));
    } else {
      lines.push(lineInput(settings.roundingAccountId, money(Math.abs(roundOff)), 0, 'Rounding adjustment', common));
    }
  }

  private static async findPostedSourceJournal(
    organizationId: string,
    sourceModule: string,
    sourceType: string,
    sourceId: string,
    transaction: Transaction,
  ): Promise<PostedDocumentResult | null> {
    const row = await queryOne<DbRow>(
      `
        select
          v.id as "voucherId",
          v.voucher_no as "voucherNo",
          je.id as "journalEntryId",
          je.entry_no as "entryNo",
          je.status
        from journal_entries je
        join vouchers v on v.id = je.voucher_id
        where je.organization_id = :organizationId
          and je.source_module = :sourceModule
          and je.source_type = :sourceType
          and je.source_id = cast(:sourceId as uuid)
          and je.status = 'posted'
          and je.deleted_at is null
        limit 1
      `,
      { organizationId, sourceModule, sourceType, sourceId },
      transaction,
    );
    if (!row) return null;
    return {
      voucherId: String(row.voucherId),
      journalEntryId: String(row.journalEntryId),
      voucherNo: String(row.voucherNo),
      entryNo: String(row.entryNo),
      status: String(row.status),
      alreadyPosted: true,
    };
  }

  private static async upsertPurchaseWrapper(
    organizationId: string,
    userId: string,
    billId: string,
    result: PostedDocumentResult & { fiscalYearId: string; branchId: string | null },
    bill: DbRow,
    transaction: Transaction,
  ): Promise<void> {
    await execute(
      `
        insert into purchases (
          organization_id, branch_id, fiscal_year_id, vendor_id, vendor_bill_id,
          purchase_no, supplier_invoice_no, purchase_date, subtotal,
          taxable_amount, igst_amount, total_amount, amount_paid,
          balance_due, status, approval_status, posting_status,
          voucher_id, journal_entry_id, created_by
        )
        values (
          :organizationId, cast(:branchId as uuid), :fiscalYearId, cast(:vendorId as uuid), cast(:billId as uuid),
          :purchaseNo, :supplierInvoiceNo, :purchaseDate, :subtotal,
          :subtotal, :taxAmount, :totalAmount, 0,
          :totalAmount, 'posted', 'approved', 'posted',
          :voucherId, :journalEntryId, :userId
        )
        on conflict (organization_id, purchase_no)
        do update set
          posting_status = 'posted',
          voucher_id = excluded.voucher_id,
          journal_entry_id = excluded.journal_entry_id,
          updated_at = now()
      `,
      {
        organizationId,
        branchId: result.branchId,
        fiscalYearId: result.fiscalYearId,
        vendorId: bill.vendorId,
        billId,
        purchaseNo: `VB-${String(billId).slice(0, 8).toUpperCase()}`,
        supplierInvoiceNo: String(bill.billNumber),
        purchaseDate: dateOnly(String(bill.invoiceDate)),
        subtotal: money(bill.subtotal),
        taxAmount: money(bill.taxAmount),
        totalAmount: money(bill.totalAmount),
        voucherId: result.voucherId,
        journalEntryId: result.journalEntryId,
        userId,
      },
      transaction,
    );
  }

  private static async refreshAccountBalances(organizationId: string, transaction: Transaction): Promise<void> {
    await execute(
      `
        with movement as (
          select
            jel.account_id,
            coalesce(sum(jel.base_debit_amount), 0) as debit,
            coalesce(sum(jel.base_credit_amount), 0) as credit
          from journal_entry_lines jel
          join journal_entries je on je.id = jel.journal_entry_id
          where je.organization_id = :organizationId
            and je.status = 'posted'
            and je.deleted_at is null
          group by jel.account_id
        )
        update accounts a
        set current_balance = round(
              (
                case
                  when a.opening_balance_type = a.normal_balance then a.opening_balance
                  else -a.opening_balance
                end
              )
              +
              (
                case when a.normal_balance = 'credit'
                  then coalesce(m.credit, 0) - coalesce(m.debit, 0)
                  else coalesce(m.debit, 0) - coalesce(m.credit, 0)
                end
              ),
              2
            ),
            updated_at = now()
        from movement m
        where a.organization_id = :organizationId
          and a.id = m.account_id
      `,
      { organizationId },
      transaction,
    );
  }
}

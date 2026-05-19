import { CommonModule } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

type AccountingView =
  | 'overview'
  | 'chart'
  | 'journals'
  | 'reports'
  | 'ledgers'
  | 'outstanding';

interface AccountRow {
  code: string;
  name: string;
  type: string;
  balance: number;
  normal: 'Dr' | 'Cr';
}

interface JournalRow {
  voucher: string;
  date: string;
  narration: string;
  debit: string;
  credit: string;
  amount: number;
  status: 'Draft' | 'Posted' | 'Review';
}

interface ReportTile {
  title: string;
  description: string;
  icon: string;
  metric: string;
}

@Component({
  selector: 'app-accounting-finance',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <section class="accounting-shell">
      <header class="accounting-header">
        <div>
          <p class="eyebrow">Client ledger workspace</p>
          <h1>Accounting & Finance</h1>
          <p>Double-entry books, vouchers, financial statements, and outstanding control for this client.</p>
        </div>
        <div class="header-actions">
          <button type="button">
            <mat-icon>add</mat-icon>
            Journal Entry
          </button>
          <button type="button">
            <mat-icon>file_download</mat-icon>
            Export
          </button>
        </div>
      </header>

      <nav class="accounting-tabs" aria-label="Accounting module sections">
        @for (view of views; track view.id) {
          <button
            type="button"
            [class.active]="activeView() === view.id"
            (click)="activeView.set(view.id)"
          >
            <mat-icon>{{ view.icon }}</mat-icon>
            <span>{{ view.label }}</span>
          </button>
        }
      </nav>

      @if (activeView() === 'overview') {
        <section class="metric-grid">
          @for (metric of metrics; track metric.label) {
            <article class="metric-card">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <small>{{ metric.helper }}</small>
            </article>
          }
        </section>

        <section class="two-column">
          <article class="panel">
            <div class="panel-header">
              <div>
                <span>Engine</span>
                <h2>Double-entry accounting engine</h2>
              </div>
              <mat-icon>account_balance</mat-icon>
            </div>
            <div class="engine-flow">
              @for (step of engineSteps; track step.title) {
                <div>
                  <strong>{{ step.title }}</strong>
                  <span>{{ step.copy }}</span>
                </div>
              }
            </div>
          </article>

          <article class="panel">
            <div class="panel-header">
              <div>
                <span>Control</span>
                <h2>Outstanding payables & receivables</h2>
              </div>
              <mat-icon>receipt_long</mat-icon>
            </div>
            <div class="aging-grid">
              @for (bucket of agingBuckets; track bucket.label) {
                <div>
                  <span>{{ bucket.label }}</span>
                  <strong>{{ bucket.value }}</strong>
                  <small>{{ bucket.count }} items</small>
                </div>
              }
            </div>
          </article>
        </section>
      } @else if (activeView() === 'chart') {
        <section class="panel">
          <div class="panel-header">
            <div>
              <span>Customizable master</span>
              <h2>Chart of Accounts</h2>
            </div>
            <button type="button" class="small-action">
              <mat-icon>add</mat-icon>
              Account
            </button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Normal</th>
                  <th class="right">Balance</th>
                </tr>
              </thead>
              <tbody>
                @for (account of accounts; track account.code) {
                  <tr>
                    <td>{{ account.code }}</td>
                    <td><strong>{{ account.name }}</strong></td>
                    <td>{{ account.type }}</td>
                    <td>{{ account.normal }}</td>
                    <td class="right">{{ account.balance | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      } @else if (activeView() === 'journals') {
        <section class="panel">
          <div class="panel-header">
            <div>
              <span>Vouchers</span>
              <h2>Journal Entries</h2>
            </div>
            <select [(ngModel)]="journalStatusFilter">
              <option value="">All status</option>
              <option value="Draft">Draft</option>
              <option value="Review">Review</option>
              <option value="Posted">Posted</option>
            </select>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Voucher</th>
                  <th>Date</th>
                  <th>Narration</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Status</th>
                  <th class="right">Amount</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of filteredJournals(); track entry.voucher) {
                  <tr>
                    <td>{{ entry.voucher }}</td>
                    <td>{{ entry.date | date:'MMM d, y' }}</td>
                    <td><strong>{{ entry.narration }}</strong></td>
                    <td>{{ entry.debit }}</td>
                    <td>{{ entry.credit }}</td>
                    <td><span class="status-pill">{{ entry.status }}</span></td>
                    <td class="right">{{ entry.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      } @else if (activeView() === 'reports') {
        <section class="report-grid">
          @for (report of reports; track report.title) {
            <article class="report-card">
              <mat-icon>{{ report.icon }}</mat-icon>
              <div>
                <h2>{{ report.title }}</h2>
                <p>{{ report.description }}</p>
                <strong>{{ report.metric }}</strong>
              </div>
            </article>
          }
        </section>
      } @else if (activeView() === 'ledgers') {
        <section class="two-column">
          <article class="panel">
            <div class="panel-header">
              <div>
                <span>Ledger reports</span>
                <h2>Day Book</h2>
              </div>
              <mat-icon>calendar_month</mat-icon>
            </div>
            <div class="entry-list">
              @for (entry of dayBook; track entry.ref) {
                <div>
                  <span>{{ entry.ref }}</span>
                  <strong>{{ entry.title }}</strong>
                  <small>{{ entry.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</small>
                </div>
              }
            </div>
          </article>

          <article class="panel">
            <div class="panel-header">
              <div>
                <span>Account movement</span>
                <h2>Ledger Snapshot</h2>
              </div>
              <mat-icon>menu_book</mat-icon>
            </div>
            <div class="entry-list">
              @for (ledger of ledgerSnapshot; track ledger.account) {
                <div>
                  <span>{{ ledger.account }}</span>
                  <strong>{{ ledger.movement }}</strong>
                  <small>{{ ledger.balance | currency:'INR':'symbol-narrow':'1.0-0' }}</small>
                </div>
              }
            </div>
          </article>
        </section>
      } @else {
        <section class="panel">
          <div class="panel-header">
            <div>
              <span>Aging control</span>
              <h2>Payables & Receivables</h2>
            </div>
            <mat-icon>payments</mat-icon>
          </div>
          <div class="outstanding-grid">
            @for (row of outstandingRows; track row.party) {
              <article>
                <div>
                  <strong>{{ row.party }}</strong>
                  <span>{{ row.type }}</span>
                </div>
                <small>{{ row.age }}</small>
                <b>{{ row.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</b>
              </article>
            }
          </div>
        </section>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100%;
    }

    .accounting-shell {
      display: flex;
      flex-direction: column;
      gap: 18px;
      min-height: 100%;
      padding: 4px 0 24px;
    }

    .accounting-header,
    .panel,
    .metric-card,
    .report-card {
      border: 1px solid rgb(226 232 240);
      border-radius: 8px;
      background: white;
    }

    :host-context(.dark) .accounting-header,
    :host-context(.dark) .panel,
    :host-context(.dark) .metric-card,
    :host-context(.dark) .report-card {
      border-color: rgb(30 41 59);
      background: rgb(15 23 42);
    }

    .accounting-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 20px;
    }

    .eyebrow,
    .panel-header span {
      margin: 0 0 4px;
      color: rgb(100 116 139);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .accounting-header h1,
    .panel-header h2,
    .report-card h2 {
      margin: 0;
      color: rgb(15 23 42);
      font-weight: 800;
    }

    :host-context(.dark) .accounting-header h1,
    :host-context(.dark) .panel-header h2,
    :host-context(.dark) .report-card h2 {
      color: white;
    }

    .accounting-header h1 {
      font-size: 28px;
      line-height: 1.1;
    }

    .accounting-header p,
    .report-card p {
      margin: 6px 0 0;
      color: rgb(100 116 139);
      font-size: 14px;
      line-height: 1.5;
    }

    .header-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .header-actions button,
    .small-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      border: 1px solid rgb(203 213 225);
      border-radius: 8px;
      background: white;
      color: rgb(15 23 42);
      padding: 0 12px;
      font-size: 13px;
      font-weight: 750;
    }

    .header-actions button:first-child {
      border-color: rgb(37 99 235);
      background: rgb(37 99 235);
      color: white;
    }

    .accounting-tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 2px;
    }

    .accounting-tabs button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;
      min-height: 40px;
      border: 1px solid rgb(226 232 240);
      border-radius: 8px;
      background: white;
      color: rgb(71 85 105);
      padding: 0 12px;
      font-size: 13px;
      font-weight: 750;
    }

    .accounting-tabs button.active {
      border-color: rgb(37 99 235);
      background: rgb(239 246 255);
      color: rgb(29 78 216);
    }

    .metric-grid,
    .report-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .metric-card {
      padding: 16px;
    }

    .metric-card span {
      color: rgb(100 116 139);
      font-size: 12px;
      font-weight: 750;
    }

    .metric-card strong {
      display: block;
      margin-top: 8px;
      color: rgb(15 23 42);
      font-size: 24px;
      font-weight: 850;
    }

    .metric-card small {
      color: rgb(100 116 139);
      font-size: 12px;
    }

    .two-column {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .panel {
      padding: 18px;
    }

    .panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .panel-header mat-icon {
      color: rgb(37 99 235);
    }

    .engine-flow,
    .aging-grid,
    .outstanding-grid,
    .entry-list {
      display: grid;
      gap: 10px;
    }

    .engine-flow {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .engine-flow div,
    .aging-grid div,
    .entry-list div,
    .outstanding-grid article {
      border: 1px solid rgb(226 232 240);
      border-radius: 8px;
      padding: 12px;
    }

    .engine-flow strong,
    .aging-grid strong,
    .entry-list strong,
    .outstanding-grid strong,
    .outstanding-grid b {
      display: block;
      color: rgb(15 23 42);
      font-size: 14px;
      font-weight: 800;
    }

    .engine-flow span,
    .aging-grid span,
    .entry-list span,
    .outstanding-grid span,
    .entry-list small,
    .aging-grid small,
    .outstanding-grid small {
      color: rgb(100 116 139);
      font-size: 12px;
    }

    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      min-width: 760px;
      border-collapse: collapse;
    }

    th,
    td {
      border-bottom: 1px solid rgb(226 232 240);
      padding: 12px;
      text-align: left;
      font-size: 13px;
    }

    th {
      color: rgb(100 116 139);
      font-size: 11px;
      font-weight: 850;
      text-transform: uppercase;
    }

    td {
      color: rgb(71 85 105);
    }

    td strong {
      color: rgb(15 23 42);
    }

    .right {
      text-align: right;
    }

    .status-pill {
      display: inline-flex;
      border-radius: 999px;
      background: rgb(239 246 255);
      color: rgb(29 78 216);
      padding: 4px 9px;
      font-size: 11px;
      font-weight: 800;
    }

    .report-card {
      display: flex;
      gap: 14px;
      padding: 18px;
    }

    .report-card mat-icon {
      color: rgb(37 99 235);
    }

    .report-card strong {
      display: block;
      margin-top: 10px;
      color: rgb(15 23 42);
    }

    .outstanding-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .outstanding-grid article {
      display: grid;
      grid-template-columns: 1fr auto auto;
      align-items: center;
      gap: 12px;
    }

    @media (max-width: 1100px) {
      .metric-grid,
      .report-grid,
      .engine-flow {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .two-column {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .accounting-header {
        flex-direction: column;
      }

      .metric-grid,
      .report-grid,
      .engine-flow,
      .outstanding-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class AccountingFinanceComponent {
  clientId = input<string>('');

  activeView = signal<AccountingView>('overview');
  journalStatusFilter = '';

  views: Array<{ id: AccountingView; label: string; icon: string }> = [
    { id: 'overview', label: 'Overview', icon: 'dashboard' },
    { id: 'chart', label: 'Chart of Accounts', icon: 'account_tree' },
    { id: 'journals', label: 'Journals', icon: 'post_add' },
    { id: 'reports', label: 'Reports', icon: 'query_stats' },
    { id: 'ledgers', label: 'Ledgers', icon: 'menu_book' },
    { id: 'outstanding', label: 'Outstanding', icon: 'payments' },
  ];

  metrics = [
    { label: 'Receivables', value: 'INR 8.4L', helper: '32 open invoices' },
    { label: 'Payables', value: 'INR 5.1L', helper: '18 vendor bills' },
    { label: 'Cash Position', value: 'INR 12.8L', helper: 'Bank + cash ledgers' },
    { label: 'Review Items', value: '11', helper: 'Draft vouchers and unreconciled rows' },
  ];

  engineSteps = [
    { title: 'Voucher', copy: 'Capture journal, payment, receipt, purchase, and sales entries.' },
    { title: 'Posting', copy: 'Debit and credit effects are balanced before ledger posting.' },
    { title: 'Ledger', copy: 'Account-wise movement feeds day book and ledger reports.' },
    { title: 'Statements', copy: 'Trial balance drives P&L, balance sheet, and cash flow.' },
  ];

  agingBuckets = [
    { label: '0-30 days', value: 'INR 2.6L', count: 14 },
    { label: '31-60 days', value: 'INR 1.9L', count: 9 },
    { label: '61-90 days', value: 'INR 86K', count: 4 },
    { label: '90+ days', value: 'INR 3.0L', count: 7 },
  ];

  accounts: AccountRow[] = [
    { code: '1000', name: 'Cash in Hand', type: 'Asset', normal: 'Dr', balance: 145000 },
    { code: '1100', name: 'Bank Accounts', type: 'Asset', normal: 'Dr', balance: 1135000 },
    { code: '1200', name: 'Accounts Receivable', type: 'Asset', normal: 'Dr', balance: 840000 },
    { code: '2000', name: 'Accounts Payable', type: 'Liability', normal: 'Cr', balance: 510000 },
    { code: '4000', name: 'Sales Revenue', type: 'Income', normal: 'Cr', balance: 2240000 },
    { code: '5000', name: 'Direct Expenses', type: 'Expense', normal: 'Dr', balance: 690000 },
  ];

  journals: JournalRow[] = [
    { voucher: 'JV-0007', date: '2026-05-19', narration: 'GST input adjustment', debit: 'Input CGST', credit: 'GST Payable', amount: 42000, status: 'Review' },
    { voucher: 'RC-0018', date: '2026-05-18', narration: 'Customer receipt against INV-1042', debit: 'Bank Accounts', credit: 'Accounts Receivable', amount: 128000, status: 'Posted' },
    { voucher: 'PY-0011', date: '2026-05-17', narration: 'Vendor payment for logistics bill', debit: 'Accounts Payable', credit: 'Bank Accounts', amount: 76000, status: 'Posted' },
    { voucher: 'JV-0008', date: '2026-05-16', narration: 'Month-end depreciation provision', debit: 'Depreciation', credit: 'Accumulated Depreciation', amount: 31000, status: 'Draft' },
  ];

  reports: ReportTile[] = [
    { title: 'Profit & Loss Statement', description: 'Revenue, direct costs, operating expenses, and net profit for the selected period.', icon: 'stacked_line_chart', metric: 'Net profit INR 4.8L' },
    { title: 'Balance Sheet', description: 'Assets, liabilities, and equity generated from posted ledger balances.', icon: 'account_balance', metric: 'Assets INR 28.6L' },
    { title: 'Cash Flow Statement', description: 'Cash movement from operations, investing, and financing activities.', icon: 'waterfall_chart', metric: 'Net inflow INR 2.1L' },
    { title: 'Trial Balance', description: 'Debit and credit control report before finalization.', icon: 'fact_check', metric: 'Balanced' },
  ];

  dayBook = [
    { ref: 'RC-0018', title: 'Receipt from customer', amount: 128000 },
    { ref: 'PY-0011', title: 'Payment to vendor', amount: 76000 },
    { ref: 'JV-0007', title: 'GST input adjustment', amount: 42000 },
    { ref: 'CN-0004', title: 'Credit note posted', amount: 18000 },
  ];

  ledgerSnapshot = [
    { account: 'Bank Accounts', movement: '8 debits, 5 credits', balance: 1135000 },
    { account: 'Accounts Receivable', movement: '32 open invoices', balance: 840000 },
    { account: 'Accounts Payable', movement: '18 vendor bills', balance: 510000 },
    { account: 'Sales Revenue', movement: '46 posted invoices', balance: 2240000 },
  ];

  outstandingRows = [
    { party: 'Aarav Traders', type: 'Receivable', age: '42 days', amount: 186000 },
    { party: 'Mitra Logistics', type: 'Payable', age: '18 days', amount: 76000 },
    { party: 'Shree Retail LLP', type: 'Receivable', age: '91 days', amount: 244000 },
    { party: 'Payroll Accrual', type: 'Payable', age: 'Current', amount: 318000 },
    { party: 'Blue Peak Services', type: 'Receivable', age: '27 days', amount: 98000 },
    { party: 'Vendor GST Hold', type: 'Payable', age: '63 days', amount: 116000 },
  ];

  filteredJournals(): JournalRow[] {
    if (!this.journalStatusFilter) return this.journals;
    return this.journals.filter((journal) => journal.status === this.journalStatusFilter);
  }
}

import { CommonModule } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

type AccountingView =
  | 'dashboard'
  | 'engine'
  | 'chart'
  | 'journals'
  | 'vouchers'
  | 'sales'
  | 'purchases'
  | 'receivables'
  | 'payables'
  | 'banking'
  | 'gst'
  | 'reports'
  | 'pnl'
  | 'balance'
  | 'trial'
  | 'ledger'
  | 'cashflow'
  | 'budgeting'
  | 'branches'
  | 'audit'
  | 'permissions'
  | 'settings';

type VoucherStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Posted' | 'Locked';
type AccountNature = 'Asset' | 'Liability' | 'Income' | 'Expense' | 'Equity';

interface MenuGroup {
  title: string;
  items: Array<{
    id: AccountingView;
    label: string;
    icon: string;
  }>;
}

interface MetricCard {
  label: string;
  value: string;
  helper: string;
  tone: 'blue' | 'green' | 'amber' | 'rose' | 'slate';
}

interface AccountRow {
  code: string;
  account: string;
  parent: string;
  nature: AccountNature;
  opening: number;
  balance: number;
  normal: 'Dr' | 'Cr';
}

interface VoucherRow {
  number: string;
  type: string;
  date: string;
  narration: string;
  debit: string;
  credit: string;
  amount: number;
  status: VoucherStatus;
  linkedModule: string;
  attachment: string;
  recurring: string;
}

interface TransactionRow {
  date: string;
  ref: string;
  party: string;
  type: string;
  amount: number;
  status: string;
}

interface AgingRow {
  bucket: string;
  receivable: number;
  payable: number;
  items: number;
}

interface OutstandingRow {
  party: string;
  ref: string;
  dueDate: string;
  age: string;
  amount: number;
  paid: number;
  owner: string;
  status: string;
}

interface ReportTile {
  title: string;
  view: AccountingView;
  description: string;
  metric: string;
  icon: string;
}

interface TrialRow {
  ledger: string;
  debit: number;
  credit: number;
  status: 'Balanced' | 'Review';
}

@Component({
  selector: 'app-accounting-finance',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <section class="accounting-shell">
      <header class="accounting-header">
        <div>
          <p class="eyebrow">Client accounting workspace</p>
          <h1>Accounting & Finance</h1>
          <p>Books, vouchers, statutory reports, banking, budgets, and audit control for this client.</p>
        </div>
        <div class="header-actions">
          <button type="button" class="primary-action" (click)="activeView.set('vouchers')">
            <mat-icon>add</mat-icon>
            Voucher
          </button>
          <button type="button" (click)="activeView.set('reports')">
            <mat-icon>file_download</mat-icon>
            Export
          </button>
        </div>
      </header>

      <div class="accounting-layout">
        <aside class="accounting-menu" aria-label="Accounting menu">
          @for (group of menuGroups; track group.title) {
            <section>
              <h2>{{ group.title }}</h2>
              @for (item of group.items; track item.id) {
                <button
                  type="button"
                  [class.active]="activeView() === item.id"
                  (click)="activeView.set(item.id)"
                >
                  <mat-icon>{{ item.icon }}</mat-icon>
                  <span>{{ item.label }}</span>
                </button>
              }
            </section>
          }
        </aside>

        <main class="accounting-content">
          @if (activeView() === 'dashboard') {
            <section class="metric-grid">
              @for (metric of dashboardMetrics; track metric.label) {
                <article class="metric-card" [class]="metric.tone">
                  <span>{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                  <small>{{ metric.helper }}</small>
                </article>
              }
            </section>

            <section class="content-grid two-one">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Monthly cash flow</span>
                    <h2>Inflow and outflow</h2>
                  </div>
                  <button type="button" class="icon-button" (click)="activeView.set('cashflow')" aria-label="Open cash flow">
                    <mat-icon>open_in_new</mat-icon>
                  </button>
                </div>
                <div class="cashflow-chart">
                  @for (month of monthlyCashFlow; track month.month) {
                    <div class="cashflow-bar">
                      <div class="bar-stack">
                        <span class="bar-in" [style.height.%]="month.inHeight"></span>
                        <span class="bar-out" [style.height.%]="month.outHeight"></span>
                      </div>
                      <strong>{{ month.month }}</strong>
                      <small>{{ month.net | currency:'INR':'symbol-narrow':'1.0-0' }}</small>
                    </div>
                  }
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>GST summary</span>
                    <h2>Tax position</h2>
                  </div>
                  <mat-icon>percent</mat-icon>
                </div>
                <div class="summary-list compact">
                  @for (tax of gstSummary; track tax.label) {
                    <div>
                      <span>{{ tax.label }}</span>
                      <strong>{{ tax.value }}</strong>
                    </div>
                  }
                </div>
              </article>
            </section>

            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Recent transactions</span>
                  <h2>Latest ledger activity</h2>
                </div>
                <button type="button" class="small-action" (click)="activeView.set('ledger')">
                  <mat-icon>menu_book</mat-icon>
                  Ledger
                </button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ref</th>
                      <th>Party</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th class="right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of recentTransactions; track row.ref) {
                      <tr>
                        <td>{{ row.date | date:'MMM d, y' }}</td>
                        <td>{{ row.ref }}</td>
                        <td><strong>{{ row.party }}</strong></td>
                        <td>{{ row.type }}</td>
                        <td><span class="status-pill">{{ row.status }}</span></td>
                        <td class="right">{{ row.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'engine') {
            <section class="content-grid one-one">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Double-entry engine</span>
                    <h2>Transaction posting model</h2>
                  </div>
                  <mat-icon>sync_alt</mat-icon>
                </div>
                <div class="posting-card">
                  <span>Office Rent Paid</span>
                  <div>
                    <strong>Debit -> Rent Expense</strong>
                    <strong>Credit -> Bank Account</strong>
                  </div>
                  <b>{{ 55000 | currency:'INR':'symbol-narrow':'1.0-0' }}</b>
                </div>
                <div class="control-grid">
                  @for (control of engineControls; track control.label) {
                    <div>
                      <mat-icon>{{ control.icon }}</mat-icon>
                      <span>{{ control.label }}</span>
                      <strong>{{ control.state }}</strong>
                    </div>
                  }
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Audit-safe flow</span>
                    <h2>Posting lifecycle</h2>
                  </div>
                  <mat-icon>verified_user</mat-icon>
                </div>
                <div class="timeline">
                  @for (step of postingLifecycle; track step.title) {
                    <div>
                      <span>{{ step.order }}</span>
                      <strong>{{ step.title }}</strong>
                      <small>{{ step.owner }}</small>
                    </div>
                  }
                </div>
              </article>
            </section>
          } @else if (activeView() === 'chart') {
            <section class="content-grid group-grid">
              @for (group of accountGroups; track group.name) {
                <article class="mini-card">
                  <mat-icon>{{ group.icon }}</mat-icon>
                  <span>{{ group.name }}</span>
                  <strong>{{ group.value }}</strong>
                  <small>{{ group.accounts }} accounts</small>
                </article>
              }
            </section>

            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Chart of accounts</span>
                  <h2>Customizable account hierarchy</h2>
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
                      <th>Parent</th>
                      <th>Group</th>
                      <th>Normal</th>
                      <th class="right">Opening</th>
                      <th class="right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (account of accounts; track account.code) {
                      <tr>
                        <td>{{ account.code }}</td>
                        <td><strong>{{ account.account }}</strong></td>
                        <td>{{ account.parent }}</td>
                        <td>{{ account.nature }}</td>
                        <td>{{ account.normal }}</td>
                        <td class="right">{{ account.opening | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ account.balance | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'journals' || activeView() === 'vouchers') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Journal entries & vouchers</span>
                  <h2>Voucher register</h2>
                </div>
                <div class="filter-row">
                  <select [(ngModel)]="voucherStatusFilter" aria-label="Voucher status">
                    <option value="">All status</option>
                    <option value="Draft">Draft</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="Posted">Posted</option>
                    <option value="Locked">Locked</option>
                  </select>
                  <button type="button" class="small-action">
                    <mat-icon>add</mat-icon>
                    New
                  </button>
                </div>
              </div>

              <div class="voucher-types">
                @for (type of voucherTypes; track type.name) {
                  <button type="button">
                    <mat-icon>{{ type.icon }}</mat-icon>
                    <span>{{ type.name }}</span>
                  </button>
                }
              </div>

              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Voucher</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Narration</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      <th>Linked</th>
                      <th>Status</th>
                      <th class="right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (voucher of filteredVouchers(); track voucher.number) {
                      <tr>
                        <td>{{ voucher.number }}</td>
                        <td>{{ voucher.date | date:'MMM d, y' }}</td>
                        <td>{{ voucher.type }}</td>
                        <td><strong>{{ voucher.narration }}</strong></td>
                        <td>{{ voucher.debit }}</td>
                        <td>{{ voucher.credit }}</td>
                        <td>{{ voucher.linkedModule }}</td>
                        <td><span class="status-pill">{{ voucher.status }}</span></td>
                        <td class="right">{{ voucher.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'sales') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Sales</span>
                  <h2>Customer invoice accounting</h2>
                </div>
                <mat-icon>point_of_sale</mat-icon>
              </div>
              <div class="split-list">
                @for (sale of salesRows; track sale.ref) {
                  <article>
                    <span>{{ sale.ref }}</span>
                    <strong>{{ sale.party }}</strong>
                    <small>{{ sale.status }}</small>
                    <b>{{ sale.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</b>
                  </article>
                }
              </div>
            </section>
          } @else if (activeView() === 'purchases') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Purchases</span>
                  <h2>Vendor bill accounting</h2>
                </div>
                <mat-icon>shopping_cart</mat-icon>
              </div>
              <div class="split-list">
                @for (purchase of purchaseRows; track purchase.ref) {
                  <article>
                    <span>{{ purchase.ref }}</span>
                    <strong>{{ purchase.party }}</strong>
                    <small>{{ purchase.status }}</small>
                    <b>{{ purchase.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</b>
                  </article>
                }
              </div>
            </section>
          } @else if (activeView() === 'receivables') {
            <section class="content-grid two-one">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Outstanding receivables</span>
                    <h2>Customer dues</h2>
                  </div>
                  <mat-icon>account_balance_wallet</mat-icon>
                </div>
                <div class="aging-grid">
                  @for (bucket of agingBuckets; track bucket.bucket) {
                    <div>
                      <span>{{ bucket.bucket }}</span>
                      <strong>{{ bucket.receivable | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                      <small>{{ bucket.items }} items</small>
                    </div>
                  }
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Follow-up queue</span>
                    <h2>Due reminders</h2>
                  </div>
                  <mat-icon>notifications_active</mat-icon>
                </div>
                <div class="summary-list compact">
                  <div><span>Statements ready</span><strong>18</strong></div>
                  <div><span>Partial payments</span><strong>7</strong></div>
                  <div><span>Overdue calls</span><strong>11</strong></div>
                </div>
              </article>
            </section>
            <section class="panel">
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Invoice</th>
                      <th>Due date</th>
                      <th>Age</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th class="right">Paid</th>
                      <th class="right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of receivableRows; track row.ref) {
                      <tr>
                        <td><strong>{{ row.party }}</strong></td>
                        <td>{{ row.ref }}</td>
                        <td>{{ row.dueDate | date:'MMM d, y' }}</td>
                        <td>{{ row.age }}</td>
                        <td>{{ row.owner }}</td>
                        <td><span class="status-pill">{{ row.status }}</span></td>
                        <td class="right">{{ row.paid | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ row.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'payables') {
            <section class="content-grid two-one">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Outstanding payables</span>
                    <h2>Vendor dues</h2>
                  </div>
                  <mat-icon>payments</mat-icon>
                </div>
                <div class="aging-grid">
                  @for (bucket of agingBuckets; track bucket.bucket) {
                    <div>
                      <span>{{ bucket.bucket }}</span>
                      <strong>{{ bucket.payable | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                      <small>{{ bucket.items }} items</small>
                    </div>
                  }
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Payment planning</span>
                    <h2>Due alerts</h2>
                  </div>
                  <mat-icon>event_available</mat-icon>
                </div>
                <div class="summary-list compact">
                  <div><span>Scheduled payments</span><strong>9</strong></div>
                  <div><span>Vendor statements</span><strong>14</strong></div>
                  <div><span>Approval pending</span><strong>5</strong></div>
                </div>
              </article>
            </section>
            <section class="panel">
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Bill</th>
                      <th>Due date</th>
                      <th>Age</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th class="right">Paid</th>
                      <th class="right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of payableRows; track row.ref) {
                      <tr>
                        <td><strong>{{ row.party }}</strong></td>
                        <td>{{ row.ref }}</td>
                        <td>{{ row.dueDate | date:'MMM d, y' }}</td>
                        <td>{{ row.age }}</td>
                        <td>{{ row.owner }}</td>
                        <td><span class="status-pill">{{ row.status }}</span></td>
                        <td class="right">{{ row.paid | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ row.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'banking') {
            <section class="content-grid one-one">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Bank reconciliation</span>
                    <h2>Statement matching</h2>
                  </div>
                  <button type="button" class="small-action">
                    <mat-icon>upload_file</mat-icon>
                    Import
                  </button>
                </div>
                <div class="summary-list">
                  @for (bank of bankingRows; track bank.account) {
                    <div>
                      <span>{{ bank.account }}</span>
                      <strong>{{ bank.balance }}</strong>
                      <small>{{ bank.matched }} matched, {{ bank.unmatched }} unmatched</small>
                    </div>
                  }
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Unmatched alerts</span>
                    <h2>Reconciliation queue</h2>
                  </div>
                  <mat-icon>rule</mat-icon>
                </div>
                <div class="split-list">
                  @for (alert of reconciliationAlerts; track alert.ref) {
                    <article>
                      <span>{{ alert.ref }}</span>
                      <strong>{{ alert.title }}</strong>
                      <small>{{ alert.status }}</small>
                      <b>{{ alert.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</b>
                    </article>
                  }
                </div>
              </article>
            </section>
          } @else if (activeView() === 'gst') {
            <section class="content-grid group-grid">
              @for (tax of taxCards; track tax.label) {
                <article class="mini-card">
                  <mat-icon>{{ tax.icon }}</mat-icon>
                  <span>{{ tax.label }}</span>
                  <strong>{{ tax.value }}</strong>
                  <small>{{ tax.helper }}</small>
                </article>
              }
            </section>
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>GST & taxation</span>
                  <h2>Return reports and tax ledgers</h2>
                </div>
                <mat-icon>receipt_long</mat-icon>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Report</th>
                      <th>Period</th>
                      <th>HSN/SAC Rows</th>
                      <th>Input Credit</th>
                      <th>Status</th>
                      <th class="right">Tax Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of gstRows; track row.report) {
                      <tr>
                        <td><strong>{{ row.report }}</strong></td>
                        <td>{{ row.period }}</td>
                        <td>{{ row.hsn }}</td>
                        <td>{{ row.credit }}</td>
                        <td><span class="status-pill">{{ row.status }}</span></td>
                        <td class="right">{{ row.payable }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'reports') {
            <section class="report-grid">
              @for (report of reportTiles; track report.title) {
                <article class="report-card">
                  <mat-icon>{{ report.icon }}</mat-icon>
                  <div>
                    <h2>{{ report.title }}</h2>
                    <p>{{ report.description }}</p>
                    <strong>{{ report.metric }}</strong>
                  </div>
                  <button type="button" class="icon-button" (click)="activeView.set(report.view)" [attr.aria-label]="'Open ' + report.title">
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                </article>
              }
            </section>
          } @else if (activeView() === 'pnl') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Profit & loss statement</span>
                  <h2>Revenue, expenses, and net profit</h2>
                </div>
                <div class="filter-row">
                  <select [(ngModel)]="reportPeriod" aria-label="Report period">
                    <option>Monthly</option>
                    <option>Quarterly</option>
                    <option>Financial Year</option>
                    <option>Branch-wise</option>
                  </select>
                  <button type="button" class="small-action">
                    <mat-icon>download</mat-icon>
                    PDF
                  </button>
                </div>
              </div>
              <div class="statement-list">
                @for (row of pnlRows; track row.label) {
                  <div [class.total-row]="row.total">
                    <span>{{ row.label }}</span>
                    <strong>{{ row.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                  </div>
                }
              </div>
            </section>
          } @else if (activeView() === 'balance') {
            <section class="content-grid one-one">
              @for (section of balanceSections; track section.title) {
                <article class="panel">
                  <div class="panel-header">
                    <div>
                      <span>{{ section.subtitle }}</span>
                      <h2>{{ section.title }}</h2>
                    </div>
                    <strong class="panel-total">{{ section.total | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                  </div>
                  <div class="statement-list">
                    @for (row of section.rows; track row.label) {
                      <div>
                        <span>{{ row.label }}</span>
                        <strong>{{ row.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                      </div>
                    }
                  </div>
                </article>
              }
            </section>
          } @else if (activeView() === 'trial') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Trial balance</span>
                  <h2>Debit and credit validation</h2>
                </div>
                <div class="validation-badge">
                  <mat-icon>check_circle</mat-icon>
                  Balanced
                </div>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ledger</th>
                      <th>Status</th>
                      <th class="right">Debit</th>
                      <th class="right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of trialRows; track row.ledger) {
                      <tr>
                        <td><strong>{{ row.ledger }}</strong></td>
                        <td><span class="status-pill">{{ row.status }}</span></td>
                        <td class="right">{{ row.debit | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ row.credit | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'ledger') {
            <section class="content-grid one-one">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Day book</span>
                    <h2>Daily transaction listing</h2>
                  </div>
                  <button type="button" class="small-action">
                    <mat-icon>print</mat-icon>
                    Print
                  </button>
                </div>
                <div class="split-list">
                  @for (entry of dayBookRows; track entry.ref) {
                    <article>
                      <span>{{ entry.ref }}</span>
                      <strong>{{ entry.title }}</strong>
                      <small>{{ entry.date | date:'MMM d, y' }}</small>
                      <b>{{ entry.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</b>
                    </article>
                  }
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Ledger</span>
                    <h2>Account history</h2>
                  </div>
                  <mat-icon>menu_book</mat-icon>
                </div>
                <div class="summary-list">
                  @for (ledger of ledgerRows; track ledger.account) {
                    <div>
                      <span>{{ ledger.account }}</span>
                      <strong>{{ ledger.balance | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                      <small>{{ ledger.opening }} opening, {{ ledger.closing }} closing</small>
                    </div>
                  }
                </div>
              </article>
            </section>
          } @else if (activeView() === 'cashflow') {
            <section class="content-grid one-one">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Cash flow statement</span>
                    <h2>Operating, investing, and financing</h2>
                  </div>
                  <mat-icon>waterfall_chart</mat-icon>
                </div>
                <div class="statement-list">
                  @for (row of cashFlowRows; track row.label) {
                    <div [class.total-row]="row.total">
                      <span>{{ row.label }}</span>
                      <strong>{{ row.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                    </div>
                  }
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Cash forecast</span>
                    <h2>Daily movement</h2>
                  </div>
                  <mat-icon>timeline</mat-icon>
                </div>
                <div class="cashflow-chart tall">
                  @for (month of monthlyCashFlow; track month.month) {
                    <div class="cashflow-bar">
                      <div class="bar-stack">
                        <span class="bar-in" [style.height.%]="month.inHeight"></span>
                        <span class="bar-out" [style.height.%]="month.outHeight"></span>
                      </div>
                      <strong>{{ month.month }}</strong>
                      <small>{{ month.net | currency:'INR':'symbol-narrow':'1.0-0' }}</small>
                    </div>
                  }
                </div>
              </article>
            </section>
          } @else if (activeView() === 'budgeting') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Budget management</span>
                  <h2>Budget vs actual</h2>
                </div>
                <mat-icon>pie_chart</mat-icon>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Limit</th>
                      <th>Actual</th>
                      <th>Variance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of budgetRows; track row.department) {
                      <tr>
                        <td><strong>{{ row.department }}</strong></td>
                        <td>{{ row.limit | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td>{{ row.actual | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td>{{ row.variance | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td><span class="status-pill">{{ row.status }}</span></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'branches') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Multi-branch accounting</span>
                  <h2>Branch-wise books</h2>
                </div>
                <mat-icon>corporate_fare</mat-icon>
              </div>
              <div class="branch-grid">
                @for (branch of branchRows; track branch.name) {
                  <article>
                    <span>{{ branch.name }}</span>
                    <strong>{{ branch.balance | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                    <small>{{ branch.transactions }} transactions</small>
                    <b>{{ branch.status }}</b>
                  </article>
                }
              </div>
            </section>
          } @else if (activeView() === 'audit') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Audit & compliance</span>
                  <h2>Transaction history</h2>
                </div>
                <mat-icon>history</mat-icon>
              </div>
              <div class="timeline audit-list">
                @for (log of auditRows; track log.time) {
                  <div>
                    <span>{{ log.time }}</span>
                    <strong>{{ log.action }}</strong>
                    <small>{{ log.user }} - {{ log.detail }}</small>
                  </div>
                }
              </div>
            </section>
          } @else if (activeView() === 'permissions') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>User roles & permissions</span>
                  <h2>Accounting access matrix</h2>
                </div>
                <mat-icon>admin_panel_settings</mat-icon>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Books</th>
                      <th>Vouchers</th>
                      <th>Reports</th>
                      <th>Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (role of roleRows; track role.role) {
                      <tr>
                        <td><strong>{{ role.role }}</strong></td>
                        <td>{{ role.books }}</td>
                        <td>{{ role.vouchers }}</td>
                        <td>{{ role.reports }}</td>
                        <td>{{ role.audit }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Accounting settings</span>
                  <h2>Templates, locks, and numbering</h2>
                </div>
                <mat-icon>settings</mat-icon>
              </div>
              <div class="settings-grid">
                @for (setting of settingRows; track setting.label) {
                  <article>
                    <mat-icon>{{ setting.icon }}</mat-icon>
                    <span>{{ setting.label }}</span>
                    <strong>{{ setting.value }}</strong>
                  </article>
                }
              </div>
            </section>
          }
        </main>
      </div>
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
      gap: 16px;
      min-height: 100%;
      padding: 4px 0 24px;
      color: rgb(15 23 42);
    }

    .accounting-header,
    .accounting-menu,
    .panel,
    .metric-card,
    .mini-card,
    .report-card {
      border: 1px solid rgb(226 232 240);
      border-radius: 8px;
      background: white;
    }

    :host-context(.dark) .accounting-shell {
      color: rgb(226 232 240);
    }

    :host-context(.dark) .accounting-header,
    :host-context(.dark) .accounting-menu,
    :host-context(.dark) .panel,
    :host-context(.dark) .metric-card,
    :host-context(.dark) .mini-card,
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
    .panel-header > div > span,
    .accounting-menu h2 {
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
    :host-context(.dark) .report-card h2,
    :host-context(.dark) td strong,
    :host-context(.dark) .metric-card strong,
    :host-context(.dark) .mini-card strong,
    :host-context(.dark) .statement-list strong,
    :host-context(.dark) .summary-list strong,
    :host-context(.dark) .split-list strong,
    :host-context(.dark) .split-list b {
      color: white;
    }

    .accounting-header h1 {
      font-size: 28px;
      line-height: 1.12;
    }

    .accounting-header p,
    .report-card p {
      margin: 6px 0 0;
      color: rgb(100 116 139);
      font-size: 14px;
      line-height: 1.5;
    }

    .header-actions,
    .filter-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }

    button,
    select {
      font: inherit;
    }

    .header-actions button,
    .small-action,
    .icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 38px;
      border: 1px solid rgb(203 213 225);
      border-radius: 8px;
      background: white;
      color: rgb(15 23 42);
      padding: 0 12px;
      font-size: 13px;
      font-weight: 750;
      cursor: pointer;
    }

    :host-context(.dark) .header-actions button,
    :host-context(.dark) .small-action,
    :host-context(.dark) .icon-button,
    :host-context(.dark) select,
    :host-context(.dark) .voucher-types button,
    :host-context(.dark) .accounting-menu button {
      border-color: rgb(51 65 85);
      background: rgb(15 23 42);
      color: rgb(226 232 240);
    }

    .header-actions .primary-action {
      border-color: rgb(37 99 235);
      background: rgb(37 99 235);
      color: white;
    }

    .icon-button {
      width: 38px;
      padding: 0;
    }

    select {
      min-height: 38px;
      border: 1px solid rgb(203 213 225);
      border-radius: 8px;
      background: white;
      color: rgb(15 23 42);
      padding: 0 34px 0 12px;
      font-size: 13px;
      font-weight: 700;
    }

    .accounting-layout {
      display: grid;
      grid-template-columns: 248px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }

    .accounting-menu {
      position: sticky;
      top: 12px;
      max-height: calc(100vh - 132px);
      overflow: auto;
      padding: 10px;
    }

    .accounting-menu section + section {
      margin-top: 16px;
    }

    .accounting-menu h2 {
      padding: 8px 8px 4px;
    }

    .accounting-menu button {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-height: 38px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: rgb(71 85 105);
      padding: 0 10px;
      text-align: left;
      font-size: 13px;
      font-weight: 750;
      cursor: pointer;
    }

    .accounting-menu button.active {
      border-color: rgb(191 219 254);
      background: rgb(239 246 255);
      color: rgb(29 78 216);
    }

    :host-context(.dark) .accounting-menu button.active {
      border-color: rgb(30 64 175);
      background: rgb(30 41 59);
      color: rgb(147 197 253);
    }

    .accounting-content {
      display: grid;
      gap: 14px;
      min-width: 0;
    }

    .metric-grid,
    .content-grid,
    .report-grid,
    .settings-grid,
    .branch-grid {
      display: grid;
      gap: 12px;
    }

    .metric-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .content-grid.two-one {
      grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
    }

    .content-grid.one-one {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .group-grid,
    .report-grid,
    .settings-grid,
    .branch-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .metric-card,
    .mini-card,
    .report-card,
    .panel {
      padding: 16px;
    }

    .metric-card span,
    .mini-card span,
    .summary-list span,
    .statement-list span,
    .split-list span,
    .posting-card span,
    .control-grid span,
    .cashflow-bar strong {
      color: rgb(100 116 139);
      font-size: 12px;
      font-weight: 750;
    }

    .metric-card strong {
      display: block;
      margin-top: 8px;
      color: rgb(15 23 42);
      font-size: 23px;
      font-weight: 850;
      line-height: 1.15;
    }

    .metric-card small,
    .mini-card small,
    .summary-list small,
    .split-list small,
    .timeline small,
    .ledger-note {
      color: rgb(100 116 139);
      font-size: 12px;
      line-height: 1.4;
    }

    .metric-card.green {
      border-top-color: rgb(34 197 94);
    }

    .metric-card.blue {
      border-top-color: rgb(37 99 235);
    }

    .metric-card.amber {
      border-top-color: rgb(245 158 11);
    }

    .metric-card.rose {
      border-top-color: rgb(244 63 94);
    }

    .panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }

    .panel-header mat-icon,
    .mini-card mat-icon,
    .report-card mat-icon {
      color: rgb(37 99 235);
    }

    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      min-width: 820px;
      border-collapse: collapse;
    }

    th,
    td {
      border-bottom: 1px solid rgb(226 232 240);
      padding: 12px;
      text-align: left;
      font-size: 13px;
      vertical-align: middle;
    }

    :host-context(.dark) th,
    :host-context(.dark) td {
      border-color: rgb(30 41 59);
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

    :host-context(.dark) td {
      color: rgb(203 213 225);
    }

    td strong {
      color: rgb(15 23 42);
    }

    .right {
      text-align: right;
    }

    .status-pill,
    .validation-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      background: rgb(239 246 255);
      color: rgb(29 78 216);
      padding: 4px 9px;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
    }

    .cashflow-chart {
      display: grid;
      grid-template-columns: repeat(6, minmax(56px, 1fr));
      gap: 14px;
      align-items: end;
      min-height: 220px;
    }

    .cashflow-chart.tall {
      min-height: 300px;
    }

    .cashflow-bar {
      display: grid;
      gap: 6px;
      text-align: center;
    }

    .bar-stack {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 4px;
      height: 150px;
      border-bottom: 1px solid rgb(203 213 225);
      padding: 0 4px;
    }

    .cashflow-chart.tall .bar-stack {
      height: 220px;
    }

    .bar-stack span {
      display: block;
      width: 14px;
      min-height: 8px;
      border-radius: 6px 6px 0 0;
    }

    .bar-in {
      background: rgb(22 163 74);
    }

    .bar-out {
      background: rgb(244 63 94);
    }

    .summary-list,
    .statement-list,
    .timeline,
    .split-list,
    .aging-grid,
    .control-grid,
    .voucher-types {
      display: grid;
      gap: 10px;
    }

    .summary-list div,
    .statement-list div,
    .timeline div,
    .split-list article,
    .aging-grid div,
    .control-grid div,
    .posting-card,
    .settings-grid article,
    .branch-grid article {
      border: 1px solid rgb(226 232 240);
      border-radius: 8px;
      padding: 12px;
    }

    :host-context(.dark) .summary-list div,
    :host-context(.dark) .statement-list div,
    :host-context(.dark) .timeline div,
    :host-context(.dark) .split-list article,
    :host-context(.dark) .aging-grid div,
    :host-context(.dark) .control-grid div,
    :host-context(.dark) .posting-card,
    :host-context(.dark) .settings-grid article,
    :host-context(.dark) .branch-grid article {
      border-color: rgb(30 41 59);
    }

    .summary-list div,
    .statement-list div,
    .split-list article,
    .branch-grid article {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px 12px;
    }

    .summary-list.compact div {
      grid-template-columns: 1fr;
    }

    .summary-list strong,
    .statement-list strong,
    .split-list strong,
    .split-list b,
    .mini-card strong,
    .posting-card strong,
    .posting-card b,
    .aging-grid strong,
    .settings-grid strong,
    .branch-grid strong,
    .panel-total {
      color: rgb(15 23 42);
      font-weight: 850;
    }

    .total-row {
      border-color: rgb(37 99 235) !important;
      background: rgb(239 246 255);
    }

    :host-context(.dark) .total-row {
      background: rgb(30 41 59);
    }

    .posting-card {
      display: grid;
      gap: 10px;
      margin-bottom: 12px;
    }

    .posting-card div {
      display: grid;
      gap: 6px;
    }

    .control-grid,
    .aging-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .control-grid div {
      display: grid;
      gap: 6px;
    }

    .control-grid mat-icon {
      color: rgb(22 163 74);
    }

    .timeline div {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr);
      gap: 2px 10px;
      align-items: start;
    }

    .timeline span {
      grid-row: span 2;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 999px;
      background: rgb(239 246 255);
      color: rgb(29 78 216);
      font-size: 12px;
      font-weight: 850;
    }

    .audit-list span {
      width: auto;
      min-width: 64px;
      border-radius: 8px;
      padding: 0 8px;
    }

    .mini-card {
      display: grid;
      gap: 8px;
    }

    .voucher-types {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-bottom: 14px;
    }

    .voucher-types button {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      border: 1px solid rgb(226 232 240);
      border-radius: 8px;
      background: white;
      color: rgb(71 85 105);
      padding: 0 10px;
      font-size: 13px;
      font-weight: 750;
      cursor: pointer;
    }

    .report-card {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 14px;
      align-items: start;
    }

    .report-card strong {
      display: block;
      margin-top: 10px;
      color: rgb(15 23 42);
    }

    .settings-grid article,
    .branch-grid article {
      display: grid;
      gap: 8px;
    }

    .settings-grid mat-icon {
      color: rgb(37 99 235);
    }

    @media (max-width: 1280px) {
      .metric-grid,
      .group-grid,
      .report-grid,
      .settings-grid,
      .branch-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .voucher-types,
      .control-grid,
      .aging-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 960px) {
      .accounting-layout {
        grid-template-columns: 1fr;
      }

      .accounting-menu {
        position: static;
        max-height: none;
      }

      .accounting-menu section {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 4px;
      }

      .accounting-menu section + section {
        margin-top: 8px;
      }

      .accounting-menu h2 {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        min-height: 38px;
      }

      .accounting-menu button {
        flex: 0 0 auto;
        width: auto;
      }

      .content-grid.two-one,
      .content-grid.one-one {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .accounting-header,
      .panel-header {
        flex-direction: column;
      }

      .metric-grid,
      .group-grid,
      .report-grid,
      .settings-grid,
      .branch-grid,
      .voucher-types,
      .control-grid,
      .aging-grid {
        grid-template-columns: 1fr;
      }

      .cashflow-chart {
        grid-template-columns: repeat(3, minmax(58px, 1fr));
      }

      .report-card {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .report-card .icon-button {
        grid-column: 1 / -1;
        width: 100%;
      }
    }
  `],
})
export class AccountingFinanceComponent {
  clientId = input<string>('');

  activeView = signal<AccountingView>('dashboard');
  voucherStatusFilter = '';
  reportPeriod = 'Monthly';

  menuGroups: MenuGroup[] = [
    {
      title: 'Accounting Menu',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'engine', label: 'Double Entry', icon: 'sync_alt' },
        { id: 'chart', label: 'Chart of Accounts', icon: 'account_tree' },
        { id: 'journals', label: 'Journal Entries', icon: 'post_add' },
        { id: 'vouchers', label: 'Vouchers', icon: 'receipt_long' },
        { id: 'sales', label: 'Sales', icon: 'point_of_sale' },
        { id: 'purchases', label: 'Purchases', icon: 'shopping_cart' },
        { id: 'receivables', label: 'Receivables', icon: 'account_balance_wallet' },
        { id: 'payables', label: 'Payables', icon: 'payments' },
        { id: 'banking', label: 'Banking', icon: 'account_balance' },
        { id: 'gst', label: 'GST & Taxes', icon: 'percent' },
      ],
    },
    {
      title: 'Reports',
      items: [
        { id: 'reports', label: 'Report Center', icon: 'analytics' },
        { id: 'pnl', label: 'P&L', icon: 'stacked_line_chart' },
        { id: 'balance', label: 'Balance Sheet', icon: 'balance' },
        { id: 'trial', label: 'Trial Balance', icon: 'fact_check' },
        { id: 'ledger', label: 'Ledger', icon: 'menu_book' },
        { id: 'cashflow', label: 'Cash Flow', icon: 'waterfall_chart' },
      ],
    },
    {
      title: 'Advanced',
      items: [
        { id: 'budgeting', label: 'Budgeting', icon: 'pie_chart' },
        { id: 'branches', label: 'Branches', icon: 'corporate_fare' },
        { id: 'audit', label: 'Audit Logs', icon: 'history' },
        { id: 'permissions', label: 'Permissions', icon: 'admin_panel_settings' },
        { id: 'settings', label: 'Settings', icon: 'settings' },
      ],
    },
  ];

  dashboardMetrics: MetricCard[] = [
    { label: 'Total Revenue', value: 'INR 22.4L', helper: 'Current financial year', tone: 'green' },
    { label: 'Total Expenses', value: 'INR 17.6L', helper: 'Direct + operating', tone: 'rose' },
    { label: 'Net Profit', value: 'INR 4.8L', helper: '21.4% margin', tone: 'blue' },
    { label: 'Bank Balance', value: 'INR 11.35L', helper: '3 bank ledgers', tone: 'slate' },
    { label: 'Cash in Hand', value: 'INR 1.45L', helper: '2 cash ledgers', tone: 'amber' },
    { label: 'Receivables', value: 'INR 8.4L', helper: '32 open invoices', tone: 'blue' },
    { label: 'Payables', value: 'INR 5.1L', helper: '18 vendor bills', tone: 'amber' },
    { label: 'GST Payable', value: 'INR 1.26L', helper: 'After input credit', tone: 'rose' },
  ];

  monthlyCashFlow = [
    { month: 'Dec', inflow: 1180000, outflow: 890000, net: 290000, inHeight: 78, outHeight: 58 },
    { month: 'Jan', inflow: 1320000, outflow: 1040000, net: 280000, inHeight: 84, outHeight: 66 },
    { month: 'Feb', inflow: 1260000, outflow: 980000, net: 280000, inHeight: 80, outHeight: 62 },
    { month: 'Mar', inflow: 1510000, outflow: 1180000, net: 330000, inHeight: 94, outHeight: 74 },
    { month: 'Apr', inflow: 1420000, outflow: 1110000, net: 310000, inHeight: 88, outHeight: 70 },
    { month: 'May', inflow: 1640000, outflow: 1210000, net: 430000, inHeight: 100, outHeight: 76 },
  ];

  gstSummary = [
    { label: 'Output GST', value: 'INR 2.84L' },
    { label: 'Input credit', value: 'INR 1.58L' },
    { label: 'Net payable', value: 'INR 1.26L' },
    { label: 'Return status', value: 'Ready' },
  ];

  recentTransactions: TransactionRow[] = [
    { date: '2026-05-19', ref: 'RC-0018', party: 'Aarav Traders', type: 'Receipt', amount: 128000, status: 'Posted' },
    { date: '2026-05-18', ref: 'PY-0011', party: 'Mitra Logistics', type: 'Payment', amount: 76000, status: 'Posted' },
    { date: '2026-05-17', ref: 'JV-0007', party: 'GST Ledger', type: 'Journal', amount: 42000, status: 'Pending Approval' },
    { date: '2026-05-16', ref: 'CN-0004', party: 'Shree Retail LLP', type: 'Credit Note', amount: 18000, status: 'Approved' },
  ];

  engineControls = [
    { label: 'Auto balancing', state: 'Enabled', icon: 'balance' },
    { label: 'Real-time ledger updates', state: 'Enabled', icon: 'published_with_changes' },
    { label: 'Voucher linking', state: 'Required', icon: 'dataset_linked' },
    { label: 'Audit-safe transactions', state: 'Immutable', icon: 'verified_user' },
    { label: 'Reversal entries', state: 'Allowed', icon: 'undo' },
    { label: 'Transaction locking', state: 'After approval', icon: 'lock' },
  ];

  postingLifecycle = [
    { order: '01', title: 'Draft', owner: 'Data Entry Operator' },
    { order: '02', title: 'Validation', owner: 'System checks debit and credit totals' },
    { order: '03', title: 'Approval', owner: 'Accountant or CA' },
    { order: '04', title: 'Posting', owner: 'Ledger and reports update' },
    { order: '05', title: 'Locking', owner: 'Audit trail preserved' },
  ];

  accountGroups = [
    { name: 'Assets', value: 'INR 28.6L', accounts: 18, icon: 'account_balance_wallet' },
    { name: 'Liabilities', value: 'INR 13.4L', accounts: 12, icon: 'payments' },
    { name: 'Income', value: 'INR 22.4L', accounts: 9, icon: 'trending_up' },
    { name: 'Expenses', value: 'INR 17.6L', accounts: 21, icon: 'trending_down' },
    { name: 'Equity', value: 'INR 15.2L', accounts: 4, icon: 'assured_workload' },
  ];

  accounts: AccountRow[] = [
    { code: '1000', account: 'Cash in Hand', parent: 'Current Assets', nature: 'Asset', normal: 'Dr', opening: 90000, balance: 145000 },
    { code: '1100', account: 'Bank Accounts', parent: 'Current Assets', nature: 'Asset', normal: 'Dr', opening: 980000, balance: 1135000 },
    { code: '1200', account: 'Accounts Receivable', parent: 'Current Assets', nature: 'Asset', normal: 'Dr', opening: 670000, balance: 840000 },
    { code: '2000', account: 'Accounts Payable', parent: 'Current Liabilities', nature: 'Liability', normal: 'Cr', opening: 390000, balance: 510000 },
    { code: '2200', account: 'GST Payable', parent: 'Statutory Liabilities', nature: 'Liability', normal: 'Cr', opening: 84000, balance: 126000 },
    { code: '3000', account: 'Owner Capital', parent: 'Equity', nature: 'Equity', normal: 'Cr', opening: 1520000, balance: 1520000 },
    { code: '4000', account: 'Sales Revenue', parent: 'Operating Income', nature: 'Income', normal: 'Cr', opening: 0, balance: 2240000 },
    { code: '5100', account: 'Rent Expense', parent: 'Operating Expenses', nature: 'Expense', normal: 'Dr', opening: 0, balance: 330000 },
  ];

  voucherTypes = [
    { name: 'Payment Voucher', icon: 'payments' },
    { name: 'Receipt Voucher', icon: 'receipt' },
    { name: 'Contra Voucher', icon: 'swap_horiz' },
    { name: 'Journal Voucher', icon: 'post_add' },
    { name: 'Sales Voucher', icon: 'point_of_sale' },
    { name: 'Purchase Voucher', icon: 'shopping_cart' },
    { name: 'Debit Note', icon: 'remove_circle_outline' },
    { name: 'Credit Note', icon: 'add_circle_outline' },
  ];

  vouchers: VoucherRow[] = [
    { number: 'RC-0018', type: 'Receipt Voucher', date: '2026-05-19', narration: 'Customer receipt against INV-1042', debit: 'Bank Accounts', credit: 'Accounts Receivable', amount: 128000, status: 'Posted', linkedModule: 'Invoice', attachment: 'Yes', recurring: 'No' },
    { number: 'PY-0011', type: 'Payment Voucher', date: '2026-05-18', narration: 'Vendor payment for logistics bill', debit: 'Accounts Payable', credit: 'Bank Accounts', amount: 76000, status: 'Posted', linkedModule: 'Purchase', attachment: 'Yes', recurring: 'No' },
    { number: 'JV-0007', type: 'Journal Voucher', date: '2026-05-17', narration: 'GST input adjustment', debit: 'Input CGST', credit: 'GST Payable', amount: 42000, status: 'Pending Approval', linkedModule: 'GST', attachment: 'No', recurring: 'No' },
    { number: 'JV-0008', type: 'Journal Voucher', date: '2026-05-16', narration: 'Month-end depreciation provision', debit: 'Depreciation', credit: 'Accumulated Depreciation', amount: 31000, status: 'Draft', linkedModule: 'Fixed Assets', attachment: 'No', recurring: 'Monthly' },
    { number: 'CN-0004', type: 'Credit Note', date: '2026-05-15', narration: 'Rate difference credit note', debit: 'Sales Revenue', credit: 'Accounts Receivable', amount: 18000, status: 'Approved', linkedModule: 'Sales', attachment: 'Yes', recurring: 'No' },
  ];

  salesRows = [
    { ref: 'INV-1042', party: 'Aarav Traders', amount: 248000, status: 'Partially paid' },
    { ref: 'INV-1043', party: 'Shree Retail LLP', amount: 244000, status: '91 days overdue' },
    { ref: 'INV-1044', party: 'Blue Peak Services', amount: 98000, status: 'Due in 4 days' },
    { ref: 'INV-1045', party: 'Meera Foods', amount: 176000, status: 'Posted to receivables' },
  ];

  purchaseRows = [
    { ref: 'BILL-3308', party: 'Mitra Logistics', amount: 76000, status: 'Scheduled' },
    { ref: 'BILL-3311', party: 'Office Space LLP', amount: 55000, status: 'Recurring rent' },
    { ref: 'BILL-3315', party: 'Vendor GST Hold', amount: 116000, status: 'Input review' },
    { ref: 'BILL-3316', party: 'Payroll Accrual', amount: 318000, status: 'Approval pending' },
  ];

  agingBuckets: AgingRow[] = [
    { bucket: '0-30 days', receivable: 260000, payable: 210000, items: 14 },
    { bucket: '31-60 days', receivable: 190000, payable: 96000, items: 9 },
    { bucket: '61-90 days', receivable: 86000, payable: 116000, items: 4 },
    { bucket: '90+ days', receivable: 304000, payable: 88000, items: 7 },
  ];

  receivableRows: OutstandingRow[] = [
    { party: 'Aarav Traders', ref: 'INV-1042', dueDate: '2026-04-07', age: '42 days', amount: 186000, paid: 62000, owner: 'Riya', status: 'Follow-up' },
    { party: 'Shree Retail LLP', ref: 'INV-1043', dueDate: '2026-02-17', age: '91 days', amount: 244000, paid: 0, owner: 'Kabir', status: 'Escalated' },
    { party: 'Blue Peak Services', ref: 'INV-1044', dueDate: '2026-05-23', age: 'Current', amount: 98000, paid: 0, owner: 'Riya', status: 'Reminder ready' },
  ];

  payableRows: OutstandingRow[] = [
    { party: 'Mitra Logistics', ref: 'BILL-3308', dueDate: '2026-05-01', age: '18 days', amount: 76000, paid: 0, owner: 'Nikhil', status: 'Scheduled' },
    { party: 'Payroll Accrual', ref: 'BILL-3316', dueDate: '2026-05-30', age: 'Current', amount: 318000, paid: 0, owner: 'Nikhil', status: 'Approval pending' },
    { party: 'Vendor GST Hold', ref: 'BILL-3315', dueDate: '2026-03-17', age: '63 days', amount: 116000, paid: 0, owner: 'Asha', status: 'Tax review' },
  ];

  bankingRows = [
    { account: 'HDFC Current Account', balance: 'INR 8.84L', matched: 126, unmatched: 7 },
    { account: 'ICICI Collection Account', balance: 'INR 2.12L', matched: 82, unmatched: 3 },
    { account: 'Petty Cash', balance: 'INR 1.45L', matched: 18, unmatched: 1 },
  ];

  reconciliationAlerts = [
    { ref: 'BANK-8841', title: 'Unmatched NEFT receipt', amount: 64000, status: 'Customer mapping needed' },
    { ref: 'BANK-8846', title: 'Bank charge missing voucher', amount: 1180, status: 'Create journal' },
    { ref: 'BANK-8852', title: 'Duplicate payment candidate', amount: 76000, status: 'Review' },
  ];

  taxCards = [
    { label: 'CGST', value: 'INR 68K', helper: 'Output tax', icon: 'looks_one' },
    { label: 'SGST', value: 'INR 68K', helper: 'Output tax', icon: 'looks_two' },
    { label: 'IGST', value: 'INR 1.48L', helper: 'Output tax', icon: 'looks_3' },
    { label: 'Input Credit', value: 'INR 1.58L', helper: 'Available ITC', icon: 'redeem' },
  ];

  gstRows = [
    { report: 'GSTR-1', period: 'May 2026', hsn: '42', credit: '-', status: 'Ready', payable: 'INR 2.84L' },
    { report: 'GSTR-3B', period: 'May 2026', hsn: '42', credit: 'INR 1.58L', status: 'Draft', payable: 'INR 1.26L' },
    { report: 'GST Ledger', period: 'FY 2026-27', hsn: 'All', credit: 'INR 1.58L', status: 'Open', payable: 'INR 1.26L' },
  ];

  reportTiles: ReportTile[] = [
    { title: 'Profit & Loss Statement', view: 'pnl', description: 'Revenue, direct expenses, operating expenses, and net profit.', metric: 'Net profit INR 4.8L', icon: 'stacked_line_chart' },
    { title: 'Balance Sheet', view: 'balance', description: 'Assets, liabilities, capital, and comparative balances.', metric: 'Assets INR 28.6L', icon: 'balance' },
    { title: 'Cash Flow Statement', view: 'cashflow', description: 'Operating, investing, financing, and daily cash movement.', metric: 'Net inflow INR 4.3L', icon: 'waterfall_chart' },
    { title: 'Trial Balance', view: 'trial', description: 'Ledger-wise debit and credit validation.', metric: 'Balanced', icon: 'fact_check' },
    { title: 'Day Book & Ledger', view: 'ledger', description: 'Daily transaction list, running balance, and voucher filters.', metric: '214 entries', icon: 'menu_book' },
    { title: 'GST Reports', view: 'gst', description: 'GST returns, HSN/SAC codes, tax summary, and tax ledger.', metric: 'Return ready', icon: 'percent' },
  ];

  pnlRows = [
    { label: 'Revenue', amount: 2240000 },
    { label: 'Direct expenses', amount: -890000 },
    { label: 'Gross profit', amount: 1350000, total: true },
    { label: 'Operating expenses', amount: -870000 },
    { label: 'Net profit', amount: 480000, total: true },
  ];

  balanceSections = [
    {
      title: 'Assets',
      subtitle: 'Drill-down available',
      total: 2860000,
      rows: [
        { label: 'Bank and cash', amount: 1280000 },
        { label: 'Accounts receivable', amount: 840000 },
        { label: 'Fixed assets', amount: 740000 },
      ],
    },
    {
      title: 'Liabilities and Capital',
      subtitle: 'Comparative years',
      total: 2860000,
      rows: [
        { label: 'Accounts payable', amount: 510000 },
        { label: 'GST payable', amount: 126000 },
        { label: 'Capital and reserves', amount: 2224000 },
      ],
    },
  ];

  trialRows: TrialRow[] = [
    { ledger: 'Cash in Hand', debit: 145000, credit: 0, status: 'Balanced' },
    { ledger: 'Bank Accounts', debit: 1135000, credit: 0, status: 'Balanced' },
    { ledger: 'Accounts Receivable', debit: 840000, credit: 0, status: 'Balanced' },
    { ledger: 'Accounts Payable', debit: 0, credit: 510000, status: 'Balanced' },
    { ledger: 'Sales Revenue', debit: 0, credit: 2240000, status: 'Balanced' },
    { ledger: 'Operating Expenses', debit: 870000, credit: 0, status: 'Balanced' },
  ];

  dayBookRows = [
    { ref: 'RC-0018', title: 'Receipt from customer', date: '2026-05-19', amount: 128000 },
    { ref: 'PY-0011', title: 'Payment to vendor', date: '2026-05-18', amount: 76000 },
    { ref: 'JV-0007', title: 'GST input adjustment', date: '2026-05-17', amount: 42000 },
    { ref: 'CN-0004', title: 'Credit note posted', date: '2026-05-15', amount: 18000 },
  ];

  ledgerRows = [
    { account: 'Bank Accounts', balance: 1135000, opening: 'INR 9.8L', closing: 'INR 11.35L' },
    { account: 'Accounts Receivable', balance: 840000, opening: 'INR 6.7L', closing: 'INR 8.4L' },
    { account: 'Accounts Payable', balance: 510000, opening: 'INR 3.9L', closing: 'INR 5.1L' },
    { account: 'Sales Revenue', balance: 2240000, opening: 'INR 0', closing: 'INR 22.4L' },
  ];

  cashFlowRows = [
    { label: 'Operating activities', amount: 510000 },
    { label: 'Investing activities', amount: -60000 },
    { label: 'Financing activities', amount: -20000 },
    { label: 'Net cash movement', amount: 430000, total: true },
  ];

  budgetRows = [
    { department: 'Operations', limit: 650000, actual: 590000, variance: 60000, status: 'Within limit' },
    { department: 'Sales', limit: 420000, actual: 438000, variance: -18000, status: 'Over limit' },
    { department: 'Administration', limit: 310000, actual: 276000, variance: 34000, status: 'Within limit' },
    { department: 'Compliance', limit: 180000, actual: 162000, variance: 18000, status: 'Within limit' },
  ];

  branchRows = [
    { name: 'Mumbai', balance: 1480000, transactions: 118, status: 'Books open' },
    { name: 'Delhi', balance: 720000, transactions: 74, status: 'Books open' },
    { name: 'Bengaluru', balance: 660000, transactions: 61, status: 'Consolidated' },
    { name: 'Inter-branch', balance: 0, transactions: 12, status: 'Balanced' },
  ];

  auditRows = [
    { time: '10:42', action: 'Voucher locked', user: 'CA Neha', detail: 'RC-0018 posted and locked' },
    { time: '10:14', action: 'Attachment added', user: 'Riya', detail: 'Vendor bill uploaded for PY-0011' },
    { time: '09:38', action: 'Reversal prepared', user: 'Nikhil', detail: 'JV-0006 reversal entry created' },
    { time: '09:02', action: 'Soft delete restored', user: 'Admin', detail: 'Draft voucher restored for review' },
  ];

  roleRows = [
    { role: 'Super Admin', books: 'Full', vouchers: 'Full', reports: 'Full', audit: 'Full' },
    { role: 'Accountant', books: 'Manage', vouchers: 'Create/Post', reports: 'View/Export', audit: 'View' },
    { role: 'CA', books: 'Review', vouchers: 'Approve/Lock', reports: 'Full', audit: 'Full' },
    { role: 'Data Entry Operator', books: 'Limited', vouchers: 'Draft', reports: 'None', audit: 'Own activity' },
    { role: 'Branch Manager', books: 'Branch only', vouchers: 'Approve branch', reports: 'Branch only', audit: 'Branch activity' },
    { role: 'Auditor', books: 'Read-only', vouchers: 'Read-only', reports: 'Export', audit: 'Full' },
    { role: 'Client/User', books: 'Summary', vouchers: 'None', reports: 'Shared only', audit: 'None' },
  ];

  settingRows = [
    { label: 'Voucher numbering', value: 'Auto by type', icon: 'tag' },
    { label: 'Default templates', value: 'India GST', icon: 'article' },
    { label: 'Opening balances', value: 'Editable until lock', icon: 'account_tree' },
    { label: 'Transaction lock', value: 'After approval', icon: 'lock' },
    { label: 'Recurring vouchers', value: 'Monthly enabled', icon: 'event_repeat' },
    { label: 'Export formats', value: 'PDF and Excel', icon: 'download' },
    { label: 'Soft delete recovery', value: '90 days', icon: 'restore' },
    { label: 'Branch consolidation', value: 'Enabled', icon: 'corporate_fare' },
  ];

  filteredVouchers(): VoucherRow[] {
    if (!this.voucherStatusFilter) return this.vouchers;
    return this.vouchers.filter((voucher) => voucher.status === this.voucherStatusFilter);
  }
}

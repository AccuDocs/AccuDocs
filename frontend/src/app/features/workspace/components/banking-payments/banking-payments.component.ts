import { CommonModule } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

type BankingView =
  | 'dashboard'
  | 'accounts'
  | 'sync'
  | 'reconciliation'
  | 'cheques'
  | 'upi'
  | 'gateways'
  | 'cash'
  | 'transfers'
  | 'reminders'
  | 'reports'
  | 'settings';

type BankStatus = 'Active' | 'Inactive';
type ReconciliationStatus = 'Matched' | 'Suggested' | 'Unmatched' | 'Ignored';
type ChequeStatus = 'Pending' | 'Cleared' | 'Deposited' | 'Bounced' | 'Cancelled';
type TransferStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Reversed';

interface MenuItem {
  id: BankingView;
  label: string;
  icon: string;
}

interface MetricCard {
  label: string;
  value: string;
  helper: string;
  tone: 'blue' | 'green' | 'amber' | 'rose' | 'slate';
}

interface BankAccount {
  id: string;
  bank: string;
  accountName: string;
  accountType: string;
  group: string;
  branch: string;
  ifsc: string;
  openingBalance: number;
  balance: number;
  status: BankStatus;
  health: string;
  lastSync: string;
}

interface BankTransaction {
  id: string;
  date: string;
  bank: string;
  narration: string;
  mode: string;
  amount: number;
  direction: 'Inflow' | 'Outflow';
  status: string;
}

interface ReconciliationRow {
  id: string;
  bankEntry: string;
  ledgerEntry: string;
  amount: number;
  confidence: string;
  status: ReconciliationStatus;
}

interface ChequeEntry {
  number: string;
  party: string;
  bank: string;
  date: string;
  amount: number;
  status: ChequeStatus;
}

interface GatewayTransaction {
  ref: string;
  gateway: string;
  invoice: string;
  customer: string;
  amount: number;
  status: string;
  settlement: string;
}

interface UpiCollection {
  ref: string;
  payer: string;
  app: string;
  amount: number;
  status: string;
}

interface ReminderRow {
  ref: string;
  party: string;
  channel: string;
  dueType: string;
  nextRun: string;
  status: string;
}

interface CashEntry {
  ref: string;
  type: string;
  branch: string;
  amount: number;
  status: string;
}

interface TransferRow {
  ref: string;
  mode: string;
  beneficiary: string;
  utr: string;
  amount: number;
  status: TransferStatus;
}

@Component({
  selector: 'app-banking-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <section class="banking-shell">
      <header class="banking-header">
        <div>
          <p class="eyebrow">Client treasury workspace</p>
          <h1>Banking & Payments</h1>
          <p>Bank accounts, sync, reconciliation, UPI collections, gateways, cheques, cash, transfers, and payment reminders.</p>
        </div>
        <div class="header-actions">
          <button type="button" class="primary-action" (click)="addBankAccount()">
            <mat-icon>account_balance</mat-icon>
            Bank Account
          </button>
          <button type="button" (click)="exportCurrentView()">
            <mat-icon>file_download</mat-icon>
            Export
          </button>
        </div>
      </header>

      @if (actionMessage()) {
        <section class="action-banner" role="status" aria-live="polite">
          <mat-icon>{{ actionIcon() }}</mat-icon>
          <div>
            <strong>{{ actionTitle() }}</strong>
            <span>{{ actionMessage() }}</span>
          </div>
          <button type="button" class="icon-button" (click)="clearAction()" aria-label="Dismiss message">
            <mat-icon>close</mat-icon>
          </button>
        </section>
      }

      <div class="banking-layout">
        <aside class="banking-menu" aria-label="Banking menu">
          <h2>Banking & Payments</h2>
          @for (item of menuItems; track item.id) {
            <button type="button" [class.active]="activeView() === item.id" (click)="openView(item.id)">
              <mat-icon>{{ item.icon }}</mat-icon>
              <span>{{ item.label }}</span>
            </button>
          }
        </aside>

        <main class="banking-content">
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
                    <span>Payment trends</span>
                    <h2>Cash flow graph</h2>
                  </div>
                  <button type="button" class="icon-button" (click)="openView('reports')" aria-label="Open reports">
                    <mat-icon>open_in_new</mat-icon>
                  </button>
                </div>
                <div class="trend-chart">
                  @for (month of paymentTrends; track month.month) {
                    <div class="trend-bar">
                      <div>
                        <span class="inflow" [style.height.%]="month.inflowHeight"></span>
                        <span class="outflow" [style.height.%]="month.outflowHeight"></span>
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
                    <span>Bank-wise balances</span>
                    <h2>Health indicators</h2>
                  </div>
                  <mat-icon>monitor_heart</mat-icon>
                </div>
                <div class="summary-list compact">
                  @for (account of bankAccounts; track account.id) {
                    <div>
                      <span>{{ account.bank }}</span>
                      <strong>{{ account.balance | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                      <small>{{ account.health }} - {{ account.lastSync }}</small>
                    </div>
                  }
                </div>
              </article>
            </section>

            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Recent bank activity</span>
                  <h2>Today and latest transactions</h2>
                </div>
                <button type="button" class="small-action" (click)="openView('reconciliation')">
                  <mat-icon>rule</mat-icon>
                  Reconcile
                </button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Bank</th>
                      <th>Narration</th>
                      <th>Mode</th>
                      <th>Status</th>
                      <th class="right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (tx of bankTransactions; track tx.id) {
                      <tr>
                        <td>{{ tx.date | date:'MMM d, y' }}</td>
                        <td>{{ tx.bank }}</td>
                        <td><strong>{{ tx.narration }}</strong></td>
                        <td>{{ tx.mode }}</td>
                        <td><span class="status-pill">{{ tx.status }}</span></td>
                        <td class="right">{{ tx.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'accounts') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Bank account management</span>
                  <h2>Multiple bank, wallet, UPI, and cash accounts</h2>
                </div>
                <button type="button" class="small-action" (click)="addBankAccount()">
                  <mat-icon>add</mat-icon>
                  Account
                </button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Bank</th>
                      <th>Account</th>
                      <th>Type</th>
                      <th>Branch</th>
                      <th>IFSC</th>
                      <th>Status</th>
                      <th class="right">Opening</th>
                      <th class="right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (account of bankAccounts; track account.id) {
                      <tr>
                        <td><strong>{{ account.bank }}</strong></td>
                        <td>{{ account.accountName }}</td>
                        <td>{{ account.accountType }} / {{ account.group }}</td>
                        <td>{{ account.branch }}</td>
                        <td>{{ account.ifsc }}</td>
                        <td><span class="status-pill">{{ account.status }}</span></td>
                        <td class="right">{{ account.openingBalance | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                        <td class="right">{{ account.balance | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'sync') {
            <section class="content-grid one-one">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Bank account sync</span>
                    <h2>Auto import and statement upload</h2>
                  </div>
                  <button type="button" class="small-action" (click)="importStatement()">
                    <mat-icon>upload_file</mat-icon>
                    Import
                  </button>
                </div>
                <div class="summary-list">
                  @for (source of syncSources; track source.label) {
                    <div>
                      <span>{{ source.label }}</span>
                      <strong>{{ source.status }}</strong>
                      <small>{{ source.detail }}</small>
                    </div>
                  }
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Automation</span>
                    <h2>Duplicate detection and ledger mapping</h2>
                  </div>
                  <button type="button" class="small-action" (click)="runAutoSync()">
                    <mat-icon>sync</mat-icon>
                    Run Sync
                  </button>
                </div>
                <div class="automation-grid">
                  @for (item of automationItems; track item.label) {
                    <article>
                      <mat-icon>{{ item.icon }}</mat-icon>
                      <span>{{ item.label }}</span>
                      <strong>{{ item.value }}</strong>
                    </article>
                  }
                </div>
              </article>
            </section>
          } @else if (activeView() === 'reconciliation') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Bank reconciliation</span>
                  <h2>Statement entries vs ERP ledger entries</h2>
                </div>
                <div class="header-actions">
                  <button type="button" class="small-action" (click)="matchTransaction()">
                    <mat-icon>join_inner</mat-icon>
                    Match
                  </button>
                  <button type="button" class="small-action" (click)="createLedgerEntry()">
                    <mat-icon>post_add</mat-icon>
                    Entry
                  </button>
                </div>
              </div>
              <div class="recon-grid">
                @for (row of reconciliationRows; track row.id) {
                  <article>
                    <div>
                      <span>Bank statement</span>
                      <strong>{{ row.bankEntry }}</strong>
                    </div>
                    <mat-icon>compare_arrows</mat-icon>
                    <div>
                      <span>ERP ledger</span>
                      <strong>{{ row.ledgerEntry }}</strong>
                    </div>
                    <b>{{ row.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</b>
                    <small>{{ row.confidence }} match</small>
                    <span class="status-pill">{{ row.status }}</span>
                  </article>
                }
              </div>
            </section>
          } @else if (activeView() === 'cheques') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Cheque management</span>
                  <h2>Issue, receive, print, and track cheques</h2>
                </div>
                <div class="header-actions">
                  <button type="button" class="small-action" (click)="issueCheque()">
                    <mat-icon>add_card</mat-icon>
                    Issue
                  </button>
                  <button type="button" class="small-action" (click)="printCheque()">
                    <mat-icon>print</mat-icon>
                    Print
                  </button>
                </div>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Cheque</th>
                      <th>Party</th>
                      <th>Bank</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th class="right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (cheque of cheques; track cheque.number) {
                      <tr>
                        <td>{{ cheque.number }}</td>
                        <td><strong>{{ cheque.party }}</strong></td>
                        <td>{{ cheque.bank }}</td>
                        <td>{{ cheque.date | date:'MMM d, y' }}</td>
                        <td><span class="status-pill">{{ cheque.status }}</span></td>
                        <td class="right">{{ cheque.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'upi') {
            <section class="content-grid two-one">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>UPI collections</span>
                    <h2>Dynamic QR and collect requests</h2>
                  </div>
                  <button type="button" class="small-action" (click)="generateUpiQr()">
                    <mat-icon>qr_code_2</mat-icon>
                    QR
                  </button>
                </div>
                <div class="upi-preview">
                  <div class="qr-box">
                    <mat-icon>qr_code_2</mat-icon>
                    <span>{{ activeUpiRef }}</span>
                  </div>
                  <div>
                    <strong>accudocs.client&#64;upi</strong>
                    <span>Google Pay, PhonePe, Paytm, BHIM</span>
                  </div>
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Customer tracking</span>
                    <h2>Auto verification queue</h2>
                  </div>
                  <mat-icon>verified</mat-icon>
                </div>
                <div class="summary-list compact">
                  @for (upi of upiCollections; track upi.ref) {
                    <div>
                      <span>{{ upi.payer }} - {{ upi.app }}</span>
                      <strong>{{ upi.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                      <small>{{ upi.status }}</small>
                    </div>
                  }
                </div>
              </article>
            </section>
          } @else if (activeView() === 'gateways') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Online payment gateway</span>
                  <h2>Razorpay, PayU, Cashfree, and Stripe</h2>
                </div>
                <button type="button" class="small-action" (click)="createPaymentLink()">
                  <mat-icon>link</mat-icon>
                  Link
                </button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Gateway</th>
                      <th>Invoice</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Settlement</th>
                      <th class="right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (payment of gatewayTransactions; track payment.ref) {
                      <tr>
                        <td>{{ payment.ref }}</td>
                        <td>{{ payment.gateway }}</td>
                        <td>{{ payment.invoice }}</td>
                        <td><strong>{{ payment.customer }}</strong></td>
                        <td><span class="status-pill">{{ payment.status }}</span></td>
                        <td>{{ payment.settlement }}</td>
                        <td class="right">{{ payment.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'cash') {
            <section class="content-grid one-one">
              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Cash management</span>
                    <h2>Petty cash, receipts, and daily closing</h2>
                  </div>
                  <button type="button" class="small-action" (click)="recordCashEntry()">
                    <mat-icon>add</mat-icon>
                    Cash Entry
                  </button>
                </div>
                <div class="summary-list">
                  @for (cash of cashEntries; track cash.ref) {
                    <div>
                      <span>{{ cash.ref }} - {{ cash.type }}</span>
                      <strong>{{ cash.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</strong>
                      <small>{{ cash.branch }} - {{ cash.status }}</small>
                    </div>
                  }
                </div>
              </article>

              <article class="panel">
                <div class="panel-header">
                  <div>
                    <span>Denomination closing</span>
                    <h2>Daily cash report</h2>
                  </div>
                  <mat-icon>calculate</mat-icon>
                </div>
                <div class="denomination-grid">
                  @for (note of denominations; track note.label) {
                    <div>
                      <span>{{ note.label }}</span>
                      <strong>{{ note.count }}</strong>
                      <small>{{ note.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</small>
                    </div>
                  }
                </div>
              </article>
            </section>
          } @else if (activeView() === 'transfers') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>NEFT / RTGS / IMPS tracking</span>
                  <h2>Fund transfers and approval proof</h2>
                </div>
                <button type="button" class="small-action" (click)="createTransfer()">
                  <mat-icon>send</mat-icon>
                  Transfer
                </button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Mode</th>
                      <th>Beneficiary</th>
                      <th>UTR</th>
                      <th>Status</th>
                      <th class="right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (transfer of transfers; track transfer.ref) {
                      <tr>
                        <td>{{ transfer.ref }}</td>
                        <td>{{ transfer.mode }}</td>
                        <td><strong>{{ transfer.beneficiary }}</strong></td>
                        <td>{{ transfer.utr }}</td>
                        <td><span class="status-pill">{{ transfer.status }}</span></td>
                        <td class="right">{{ transfer.amount | currency:'INR':'symbol-narrow':'1.0-0' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          } @else if (activeView() === 'reminders') {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Payment reminder automation</span>
                  <h2>Email, SMS, WhatsApp, and push reminders</h2>
                </div>
                <button type="button" class="small-action" (click)="sendReminder()">
                  <mat-icon>notifications_active</mat-icon>
                  Send
                </button>
              </div>
              <div class="automation-grid">
                @for (reminder of reminders; track reminder.ref) {
                  <article>
                    <mat-icon>campaign</mat-icon>
                    <span>{{ reminder.dueType }}</span>
                    <strong>{{ reminder.party }}</strong>
                    <small>{{ reminder.channel }} - {{ reminder.nextRun }} - {{ reminder.status }}</small>
                  </article>
                }
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
                  <button type="button" class="icon-button" (click)="exportCurrentView(report.view)" [attr.aria-label]="'Export ' + report.title">
                    <mat-icon>file_download</mat-icon>
                  </button>
                </article>
              }
            </section>
          } @else {
            <section class="panel">
              <div class="panel-header">
                <div>
                  <span>Settings and future upgrades</span>
                  <h2>API banking, virtual accounts, payouts, and treasury</h2>
                </div>
                <button type="button" class="small-action" (click)="saveSettings()">
                  <mat-icon>save</mat-icon>
                  Save
                </button>
              </div>
              <div class="settings-grid">
                @for (setting of settings; track setting.label) {
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

    .banking-shell {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-height: 100%;
      padding: 4px 0 24px;
      color: rgb(15 23 42);
    }

    .banking-header,
    .banking-menu,
    .panel,
    .metric-card,
    .report-card {
      border: 1px solid rgb(226 232 240);
      border-radius: 8px;
      background: white;
    }

    :host-context(.dark) .banking-shell {
      color: rgb(226 232 240);
    }

    :host-context(.dark) .banking-header,
    :host-context(.dark) .banking-menu,
    :host-context(.dark) .panel,
    :host-context(.dark) .metric-card,
    :host-context(.dark) .report-card {
      border-color: rgb(30 41 59);
      background: rgb(15 23 42);
    }

    .banking-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 20px;
    }

    .eyebrow,
    .panel-header span,
    .banking-menu h2 {
      margin: 0 0 4px;
      color: rgb(100 116 139);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .banking-header h1,
    .panel-header h2,
    .report-card h2 {
      margin: 0;
      color: rgb(15 23 42);
      font-weight: 850;
    }

    :host-context(.dark) .banking-header h1,
    :host-context(.dark) .panel-header h2,
    :host-context(.dark) .report-card h2,
    :host-context(.dark) td strong,
    :host-context(.dark) .metric-card strong,
    :host-context(.dark) .summary-list strong,
    :host-context(.dark) .automation-grid strong,
    :host-context(.dark) .upi-preview strong {
      color: white;
    }

    .banking-header h1 {
      font-size: 28px;
      line-height: 1.12;
    }

    .banking-header p,
    .report-card p {
      margin: 6px 0 0;
      color: rgb(100 116 139);
      font-size: 14px;
      line-height: 1.5;
    }

    .header-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }

    button {
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

    .header-actions .primary-action {
      border-color: rgb(37 99 235);
      background: rgb(37 99 235);
      color: white;
    }

    .icon-button {
      width: 38px;
      padding: 0;
    }

    .action-banner {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
      border: 1px solid rgb(191 219 254);
      border-radius: 8px;
      background: rgb(239 246 255);
      color: rgb(29 78 216);
      padding: 12px;
    }

    .action-banner div {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .action-banner strong {
      font-size: 13px;
      font-weight: 850;
    }

    .action-banner span {
      color: rgb(51 65 85);
      font-size: 13px;
      line-height: 1.4;
    }

    .banking-layout {
      display: grid;
      grid-template-columns: 236px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }

    .banking-menu {
      position: sticky;
      top: 12px;
      display: grid;
      gap: 6px;
      max-height: calc(100vh - 132px);
      overflow: auto;
      padding: 10px;
    }

    .banking-menu h2 {
      padding: 8px 8px 4px;
    }

    .banking-menu button {
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

    .banking-menu button.active {
      border-color: rgb(191 219 254);
      background: rgb(239 246 255);
      color: rgb(29 78 216);
    }

    .banking-content,
    .summary-list,
    .automation-grid,
    .recon-grid,
    .settings-grid,
    .denomination-grid {
      display: grid;
      gap: 12px;
    }

    .metric-grid,
    .content-grid,
    .report-grid {
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

    .report-grid,
    .settings-grid,
    .automation-grid,
    .denomination-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .metric-card,
    .panel,
    .report-card {
      padding: 16px;
    }

    .metric-card span,
    .summary-list span,
    .automation-grid span,
    .denomination-grid span,
    .upi-preview span,
    .recon-grid span {
      color: rgb(100 116 139);
      font-size: 12px;
      font-weight: 750;
    }

    .metric-card strong {
      display: block;
      margin-top: 8px;
      color: rgb(15 23 42);
      font-size: 22px;
      font-weight: 850;
      line-height: 1.15;
    }

    .metric-card small,
    .summary-list small,
    .automation-grid small,
    .denomination-grid small,
    .recon-grid small {
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
    .report-card mat-icon,
    .automation-grid mat-icon {
      color: rgb(37 99 235);
    }

    .trend-chart {
      display: grid;
      grid-template-columns: repeat(6, minmax(56px, 1fr));
      gap: 14px;
      align-items: end;
      min-height: 220px;
    }

    .trend-bar {
      display: grid;
      gap: 6px;
      text-align: center;
    }

    .trend-bar > div {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 4px;
      height: 150px;
      border-bottom: 1px solid rgb(203 213 225);
      padding: 0 4px;
    }

    .trend-bar span.inflow,
    .trend-bar span.outflow {
      display: block;
      width: 14px;
      min-height: 8px;
      border-radius: 6px 6px 0 0;
    }

    .inflow {
      background: rgb(22 163 74);
    }

    .outflow {
      background: rgb(244 63 94);
    }

    .summary-list div,
    .automation-grid article,
    .denomination-grid div,
    .recon-grid article,
    .upi-preview,
    .settings-grid article {
      border: 1px solid rgb(226 232 240);
      border-radius: 8px;
      padding: 12px;
    }

    .summary-list div {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 4px 12px;
      align-items: center;
    }

    .summary-list.compact div {
      grid-template-columns: 1fr;
    }

    .summary-list strong,
    .automation-grid strong,
    .denomination-grid strong,
    .upi-preview strong,
    .settings-grid strong,
    .recon-grid strong,
    .recon-grid b {
      color: rgb(15 23 42);
      font-weight: 850;
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
      align-items: center;
      border-radius: 999px;
      background: rgb(239 246 255);
      color: rgb(29 78 216);
      padding: 4px 9px;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
    }

    .recon-grid article {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto auto auto;
      align-items: center;
      gap: 10px;
    }

    .upi-preview {
      display: grid;
      grid-template-columns: 128px minmax(0, 1fr);
      gap: 14px;
      align-items: center;
    }

    .qr-box {
      display: grid;
      place-items: center;
      gap: 6px;
      min-height: 128px;
      border: 1px dashed rgb(147 197 253);
      border-radius: 8px;
      background: rgb(248 250 252);
    }

    .qr-box mat-icon {
      font-size: 54px;
      width: 54px;
      height: 54px;
      color: rgb(37 99 235);
    }

    .automation-grid article,
    .settings-grid article,
    .denomination-grid div {
      display: grid;
      gap: 8px;
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

    :host-context(.dark) .header-actions button,
    :host-context(.dark) .small-action,
    :host-context(.dark) .icon-button,
    :host-context(.dark) .banking-menu button {
      border-color: rgb(51 65 85);
      background: rgb(15 23 42);
      color: rgb(226 232 240);
    }

    :host-context(.dark) .banking-menu button.active,
    :host-context(.dark) .action-banner {
      border-color: rgb(30 64 175);
      background: rgb(30 41 59);
      color: rgb(147 197 253);
    }

    :host-context(.dark) .summary-list div,
    :host-context(.dark) .automation-grid article,
    :host-context(.dark) .denomination-grid div,
    :host-context(.dark) .recon-grid article,
    :host-context(.dark) .upi-preview,
    :host-context(.dark) .settings-grid article,
    :host-context(.dark) th,
    :host-context(.dark) td {
      border-color: rgb(30 41 59);
    }

    :host-context(.dark) td {
      color: rgb(203 213 225);
    }

    @media (max-width: 1180px) {
      .metric-grid,
      .report-grid,
      .settings-grid,
      .automation-grid,
      .denomination-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .content-grid.two-one,
      .content-grid.one-one {
        grid-template-columns: 1fr;
      }

      .recon-grid article {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 900px) {
      .banking-layout {
        grid-template-columns: 1fr;
      }

      .banking-menu {
        position: static;
        display: flex;
        max-height: none;
        overflow-x: auto;
      }

      .banking-menu h2,
      .banking-menu button {
        flex: 0 0 auto;
        width: auto;
      }
    }

    @media (max-width: 700px) {
      .banking-header,
      .panel-header {
        flex-direction: column;
      }

      .metric-grid,
      .report-grid,
      .settings-grid,
      .automation-grid,
      .denomination-grid {
        grid-template-columns: 1fr;
      }

      .trend-chart {
        grid-template-columns: repeat(3, minmax(56px, 1fr));
      }

      .upi-preview,
      .report-card {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class BankingPaymentsComponent {
  clientId = input<string>('');

  activeView = signal<BankingView>('dashboard');
  actionTitle = signal('');
  actionMessage = signal('');
  actionIcon = signal('check_circle');
  activeUpiRef = 'UPI-QR-001';

  private bankSequence = 4;
  private transactionSequence = 1012;
  private chequeSequence = 300112;
  private transferSequence = 8811;
  private reminderSequence = 71;

  menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'accounts', label: 'Bank Accounts', icon: 'account_balance' },
    { id: 'sync', label: 'Bank Sync', icon: 'sync' },
    { id: 'reconciliation', label: 'Reconciliation', icon: 'rule' },
    { id: 'cheques', label: 'Cheque Management', icon: 'receipt_long' },
    { id: 'upi', label: 'UPI Collections', icon: 'qr_code_2' },
    { id: 'gateways', label: 'Payment Gateway', icon: 'credit_card' },
    { id: 'cash', label: 'Cash Management', icon: 'payments' },
    { id: 'transfers', label: 'Fund Transfers', icon: 'send' },
    { id: 'reminders', label: 'Payment Reminders', icon: 'notifications_active' },
    { id: 'reports', label: 'Reports', icon: 'analytics' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  dashboardMetrics: MetricCard[] = [
    { label: 'Total Bank Balance', value: 'INR 32.8L', helper: 'Across 4 active accounts', tone: 'blue' },
    { label: 'Cash in Hand', value: 'INR 1.45L', helper: 'Petty cash and branch cash', tone: 'amber' },
    { label: 'Pending Payments', value: 'INR 6.2L', helper: '13 approvals waiting', tone: 'rose' },
    { label: 'Pending Collections', value: 'INR 9.7L', helper: '28 customer follow-ups', tone: 'green' },
    { label: "Today's Transactions", value: '42', helper: 'Bank + cash + gateway', tone: 'slate' },
    { label: 'Unreconciled Entries', value: '16', helper: '7 high-confidence matches', tone: 'amber' },
    { label: 'Upcoming Cheques', value: '9', helper: '3 post-dated this week', tone: 'blue' },
    { label: 'Failed Payments', value: '3', helper: 'Webhook retry pending', tone: 'rose' },
  ];

  paymentTrends = [
    { month: 'Dec', inflowHeight: 72, outflowHeight: 48, net: 310000 },
    { month: 'Jan', inflowHeight: 82, outflowHeight: 58, net: 420000 },
    { month: 'Feb', inflowHeight: 68, outflowHeight: 52, net: 260000 },
    { month: 'Mar', inflowHeight: 92, outflowHeight: 69, net: 510000 },
    { month: 'Apr', inflowHeight: 86, outflowHeight: 74, net: 330000 },
    { month: 'May', inflowHeight: 100, outflowHeight: 79, net: 620000 },
  ];

  bankAccounts: BankAccount[] = [
    { id: 'BA-001', bank: 'HDFC Bank', accountName: 'Main Current Account', accountType: 'Current', group: 'Business', branch: 'Ahmedabad CG Road', ifsc: 'HDFC0000123', openingBalance: 1850000, balance: 2180000, status: 'Active', health: 'Healthy', lastSync: 'Today 09:20' },
    { id: 'BA-002', bank: 'ICICI Bank', accountName: 'Collection Account', accountType: 'Current', group: 'Collections', branch: 'Mumbai BKC', ifsc: 'ICIC0000456', openingBalance: 720000, balance: 884000, status: 'Active', health: 'Needs reconciliation', lastSync: 'Today 08:55' },
    { id: 'BA-003', bank: 'Petty Cash', accountName: 'Head Office Cash', accountType: 'Cash', group: 'Cash', branch: 'Head Office', ifsc: '-', openingBalance: 90000, balance: 145000, status: 'Active', health: 'Closing pending', lastSync: 'Manual' },
    { id: 'BA-004', bank: 'UPI Wallet', accountName: 'accudocs.client@upi', accountType: 'UPI', group: 'Wallets', branch: 'Virtual', ifsc: '-', openingBalance: 0, balance: 71000, status: 'Active', health: 'Healthy', lastSync: 'Today 10:10' },
  ];

  bankTransactions: BankTransaction[] = [
    { id: 'BT-1007', date: '2026-05-19', bank: 'HDFC Bank', narration: 'NEFT from Aarav Traders', mode: 'NEFT', amount: 128000, direction: 'Inflow', status: 'Matched' },
    { id: 'BT-1008', date: '2026-05-19', bank: 'ICICI Bank', narration: 'Razorpay settlement', mode: 'Gateway', amount: 86000, direction: 'Inflow', status: 'Suggested' },
    { id: 'BT-1009', date: '2026-05-18', bank: 'HDFC Bank', narration: 'Vendor payout Mitra Logistics', mode: 'IMPS', amount: 76000, direction: 'Outflow', status: 'Matched' },
    { id: 'BT-1010', date: '2026-05-18', bank: 'Petty Cash', narration: 'Office supplies cash expense', mode: 'Cash', amount: 4200, direction: 'Outflow', status: 'Unreconciled' },
  ];

  syncSources = [
    { label: 'CSV bank statement', status: 'Ready', detail: 'CSV parser mapped 12 columns' },
    { label: 'XLSX statement', status: 'Ready', detail: 'Duplicate detection enabled' },
    { label: 'PDF statement', status: 'Queued', detail: 'OCR statement extraction planned' },
    { label: 'API bank sync', status: 'Future', detail: 'ICICI, Axis, Yes Bank API hooks' },
    { label: 'Daily scheduler', status: 'Enabled', detail: 'Runs every morning' },
  ];

  automationItems = [
    { label: 'Auto ledger mapping', value: '82% confident', icon: 'auto_awesome' },
    { label: 'Duplicate detection', value: '4 candidates', icon: 'content_copy' },
    { label: 'Suspicious alerts', value: '2 flagged', icon: 'warning' },
    { label: 'Cash forecasting', value: '14-day view', icon: 'timeline' },
    { label: 'Smart suggestions', value: '7 matches', icon: 'psychology' },
    { label: 'API banking', value: 'Future-ready', icon: 'api' },
  ];

  reconciliationRows: ReconciliationRow[] = [
    { id: 'REC-001', bankEntry: 'NEFT Aarav Traders', ledgerEntry: 'INV-1042 receipt', amount: 128000, confidence: '98%', status: 'Suggested' },
    { id: 'REC-002', bankEntry: 'Gateway settlement', ledgerEntry: 'Razorpay batch RZP-771', amount: 86000, confidence: '92%', status: 'Suggested' },
    { id: 'REC-003', bankEntry: 'Bank charge', ledgerEntry: 'No ledger entry', amount: 1180, confidence: '0%', status: 'Unmatched' },
    { id: 'REC-004', bankEntry: 'Vendor payout', ledgerEntry: 'BILL-3308 payment', amount: 76000, confidence: '100%', status: 'Matched' },
  ];

  cheques: ChequeEntry[] = [
    { number: 'CHQ-300101', party: 'Mitra Logistics', bank: 'HDFC Bank', date: '2026-05-23', amount: 76000, status: 'Pending' },
    { number: 'CHQ-300102', party: 'Office Space LLP', bank: 'HDFC Bank', date: '2026-05-30', amount: 55000, status: 'Deposited' },
    { number: 'CHQ-300103', party: 'Shree Retail LLP', bank: 'ICICI Bank', date: '2026-05-12', amount: 244000, status: 'Bounced' },
  ];

  upiCollections: UpiCollection[] = [
    { ref: 'UPI-991', payer: 'Blue Peak Services', app: 'PhonePe', amount: 98000, status: 'Verified' },
    { ref: 'UPI-992', payer: 'Meera Foods', app: 'Google Pay', amount: 42000, status: 'Awaiting bank confirmation' },
    { ref: 'UPI-993', payer: 'Aarav Traders', app: 'BHIM', amount: 18000, status: 'Customer opened QR' },
  ];

  gatewayTransactions: GatewayTransaction[] = [
    { ref: 'RZP-771', gateway: 'Razorpay', invoice: 'INV-1044', customer: 'Blue Peak Services', amount: 98000, status: 'Captured', settlement: 'T+2' },
    { ref: 'CSF-118', gateway: 'Cashfree', invoice: 'INV-1045', customer: 'Meera Foods', amount: 176000, status: 'Link sent', settlement: 'Pending' },
    { ref: 'PAYU-440', gateway: 'PayU', invoice: 'INV-1043', customer: 'Shree Retail LLP', amount: 244000, status: 'Failed', settlement: 'Retry' },
  ];

  reminders: ReminderRow[] = [
    { ref: 'REM-061', party: 'Aarav Traders', channel: 'WhatsApp', dueType: 'Invoice due reminder', nextRun: 'Today 17:00', status: 'Scheduled' },
    { ref: 'REM-062', party: 'Shree Retail LLP', channel: 'Email + SMS', dueType: 'Overdue reminder', nextRun: 'Today 18:00', status: 'Escalation' },
    { ref: 'REM-063', party: 'Mitra Logistics', channel: 'Push', dueType: 'Vendor payment reminder', nextRun: 'Tomorrow', status: 'Draft' },
  ];

  cashEntries: CashEntry[] = [
    { ref: 'CASH-501', type: 'Cash receipt', branch: 'Ahmedabad', amount: 28000, status: 'Closed' },
    { ref: 'CASH-502', type: 'Cash expense', branch: 'Ahmedabad', amount: 4200, status: 'Pending approval' },
    { ref: 'CASH-503', type: 'Branch transfer', branch: 'Mumbai', amount: 50000, status: 'In transit' },
  ];

  denominations = [
    { label: 'INR 500', count: 160, amount: 80000 },
    { label: 'INR 200', count: 120, amount: 24000 },
    { label: 'INR 100', count: 210, amount: 21000 },
    { label: 'INR 50', count: 180, amount: 9000 },
    { label: 'Coins', count: 1, amount: 11000 },
  ];

  transfers: TransferRow[] = [
    { ref: 'TRF-8801', mode: 'NEFT', beneficiary: 'Mitra Logistics', utr: 'HDFC251908801', amount: 76000, status: 'Completed' },
    { ref: 'TRF-8802', mode: 'RTGS', beneficiary: 'Office Space LLP', utr: 'HDFC251908802', amount: 255000, status: 'Processing' },
    { ref: 'TRF-8803', mode: 'IMPS', beneficiary: 'Vendor GST Hold', utr: '-', amount: 116000, status: 'Pending' },
  ];

  reports = [
    { title: 'Bank Book', view: 'accounts' as BankingView, description: 'Bank-wise ledger movement with opening and closing balances.', metric: '4 accounts', icon: 'account_balance' },
    { title: 'Reconciliation Report', view: 'reconciliation' as BankingView, description: 'Matched, partial, ignored, and unmatched entries.', metric: '76% reconciled', icon: 'rule' },
    { title: 'Cheque Report', view: 'cheques' as BankingView, description: 'Cheque status timeline and bounce tracking.', metric: '9 upcoming', icon: 'receipt_long' },
    { title: 'Collection Report', view: 'upi' as BankingView, description: 'UPI, gateway, and invoice payment collections.', metric: 'INR 9.7L pending', icon: 'qr_code_2' },
    { title: 'Failed Transactions', view: 'gateways' as BankingView, description: 'Failed payments, webhook retries, and refund status.', metric: '3 failed', icon: 'error' },
    { title: 'Daily Cash Report', view: 'cash' as BankingView, description: 'Cash book, cash flow summary, and branch closing.', metric: 'INR 1.45L cash', icon: 'payments' },
  ];

  settings = [
    { label: 'Virtual accounts', value: 'Future upgrade', icon: 'account_balance_wallet' },
    { label: 'Escrow handling', value: 'Planned', icon: 'lock' },
    { label: 'Vendor payout automation', value: 'Maker-checker enabled', icon: 'approval' },
    { label: 'Bulk salary transfers', value: 'Template ready', icon: 'groups' },
    { label: 'Treasury management', value: 'Enterprise roadmap', icon: 'business_center' },
    { label: 'Webhook integration', value: 'Razorpay/Cashfree ready', icon: 'webhook' },
  ];

  openView(view: BankingView): void {
    this.activeView.set(view);
    this.announce('Section opened', `${this.labelForView(view)} is ready.`);
  }

  clearAction(): void {
    this.actionTitle.set('');
    this.actionMessage.set('');
    this.actionIcon.set('check_circle');
  }

  addBankAccount(): void {
    this.bankSequence += 1;
    const id = `BA-${String(this.bankSequence).padStart(3, '0')}`;
    this.bankAccounts = [
      {
        id,
        bank: 'Axis Bank',
        accountName: `Payment Operations ${this.bankSequence}`,
        accountType: 'Current',
        group: 'Business',
        branch: 'Surat Ring Road',
        ifsc: 'UTIB0000911',
        openingBalance: 0,
        balance: 0,
        status: 'Active',
        health: 'New',
        lastSync: 'Not synced',
      },
      ...this.bankAccounts,
    ];
    this.activeView.set('accounts');
    this.announce('Bank account added', `${id} was added as an active current account.`, 'account_balance');
  }

  importStatement(): void {
    this.transactionSequence += 1;
    this.bankTransactions = [
      {
        id: `BT-${this.transactionSequence}`,
        date: this.today(),
        bank: 'ICICI Bank',
        narration: 'Imported statement entry',
        mode: 'CSV',
        amount: 64000,
        direction: 'Inflow',
        status: 'Unreconciled',
      },
      ...this.bankTransactions,
    ];
    this.reconciliationRows = [
      {
        id: `REC-${this.transactionSequence}`,
        bankEntry: 'Imported statement entry',
        ledgerEntry: 'No ledger entry',
        amount: 64000,
        confidence: '0%',
        status: 'Unmatched',
      },
      ...this.reconciliationRows,
    ];
    this.announce('Statement imported', 'CSV statement rows were imported with duplicate checks and reconciliation alerts.', 'upload_file');
  }

  runAutoSync(): void {
    this.bankAccounts = this.bankAccounts.map((account, index) => index === 0 ? { ...account, lastSync: 'Just now', health: 'Healthy' } : account);
    this.announce('Bank sync completed', 'Daily scheduler fetched transactions and refreshed ledger suggestions.', 'sync');
  }

  matchTransaction(): void {
    let matched = false;
    this.reconciliationRows = this.reconciliationRows.map((row) => {
      if (!matched && row.status !== 'Matched') {
        matched = true;
        return { ...row, status: 'Matched', confidence: '100%' };
      }
      return row;
    });
    this.announce('Transaction matched', matched ? 'A bank entry was matched to the ERP ledger.' : 'All visible transactions are already matched.', 'join_inner');
  }

  createLedgerEntry(): void {
    this.reconciliationRows = this.reconciliationRows.map((row) => row.status === 'Unmatched' ? { ...row, ledgerEntry: 'Bank charges journal', status: 'Suggested', confidence: '88%' } : row);
    this.announce('Ledger entry created', 'A journal suggestion was created for the unmatched bank transaction.', 'post_add');
  }

  issueCheque(): void {
    this.chequeSequence += 1;
    this.cheques = [
      {
        number: `CHQ-${this.chequeSequence}`,
        party: 'New Vendor Payment',
        bank: 'HDFC Bank',
        date: this.today(),
        amount: 50000,
        status: 'Pending',
      },
      ...this.cheques,
    ];
    this.announce('Cheque issued', `CHQ-${this.chequeSequence} was added with pending status.`, 'add_card');
  }

  printCheque(): void {
    this.announce('Cheque print ready', 'Cheque layout and MICR alignment are ready for browser print.', 'print');
    if (typeof window !== 'undefined') {
      window.setTimeout(() => window.print(), 120);
    }
  }

  generateUpiQr(): void {
    const next = this.upiCollections.length + 994;
    this.activeUpiRef = `UPI-QR-${next}`;
    this.upiCollections = [
      { ref: `UPI-${next}`, payer: 'New Customer', app: 'Google Pay', amount: 25000, status: 'QR generated' },
      ...this.upiCollections,
    ];
    this.announce('UPI QR generated', `${this.activeUpiRef} is ready for dynamic collection.`, 'qr_code_2');
  }

  createPaymentLink(): void {
    const next = this.gatewayTransactions.length + 119;
    this.gatewayTransactions = [
      { ref: `RZP-${next}`, gateway: 'Razorpay', invoice: 'INV-DRAFT', customer: 'New Customer', amount: 25000, status: 'Link sent', settlement: 'Pending' },
      ...this.gatewayTransactions,
    ];
    this.announce('Payment link created', `RZP-${next} was created for invoice payment collection.`, 'link');
  }

  recordCashEntry(): void {
    const next = this.cashEntries.length + 504;
    this.cashEntries = [
      { ref: `CASH-${next}`, type: 'Cash receipt', branch: 'Ahmedabad', amount: 12500, status: 'Open closing' },
      ...this.cashEntries,
    ];
    this.announce('Cash entry recorded', `CASH-${next} was added to the cash book.`, 'payments');
  }

  createTransfer(): void {
    this.transferSequence += 1;
    this.transfers = [
      { ref: `TRF-${this.transferSequence}`, mode: 'NEFT', beneficiary: 'New Beneficiary', utr: '-', amount: 45000, status: 'Pending' },
      ...this.transfers,
    ];
    this.announce('Transfer created', `TRF-${this.transferSequence} entered maker-checker approval.`, 'send');
  }

  sendReminder(): void {
    this.reminderSequence += 1;
    this.reminders = [
      { ref: `REM-${this.reminderSequence}`, party: 'New Customer', channel: 'WhatsApp', dueType: 'Invoice due reminder', nextRun: 'Now', status: 'Sent' },
      ...this.reminders,
    ];
    this.announce('Reminder sent', `REM-${this.reminderSequence} was sent and logged.`, 'notifications_active');
  }

  saveSettings(): void {
    this.announce('Settings saved', 'Banking automation settings were saved for this client workspace.', 'save');
  }

  exportCurrentView(view: BankingView = this.activeView()): void {
    this.downloadCsv(`banking-${view}-${this.today()}.csv`, this.exportRowsFor(view));
    this.announce('Export ready', `${this.labelForView(view)} was downloaded as CSV.`, 'file_download');
  }

  private announce(title: string, message: string, icon: string = 'check_circle'): void {
    this.actionTitle.set(title);
    this.actionMessage.set(message);
    this.actionIcon.set(icon);
  }

  private exportRowsFor(view: BankingView): Array<Array<string | number>> {
    switch (view) {
      case 'accounts':
        return [['Bank', 'Account', 'Type', 'Branch', 'IFSC', 'Status', 'Opening', 'Balance'], ...this.bankAccounts.map((row) => [row.bank, row.accountName, row.accountType, row.branch, row.ifsc, row.status, row.openingBalance, row.balance])];
      case 'reconciliation':
        return [['Bank Entry', 'Ledger Entry', 'Amount', 'Confidence', 'Status'], ...this.reconciliationRows.map((row) => [row.bankEntry, row.ledgerEntry, row.amount, row.confidence, row.status])];
      case 'cheques':
        return [['Cheque', 'Party', 'Bank', 'Date', 'Amount', 'Status'], ...this.cheques.map((row) => [row.number, row.party, row.bank, row.date, row.amount, row.status])];
      case 'gateways':
        return [['Ref', 'Gateway', 'Invoice', 'Customer', 'Amount', 'Status', 'Settlement'], ...this.gatewayTransactions.map((row) => [row.ref, row.gateway, row.invoice, row.customer, row.amount, row.status, row.settlement])];
      case 'upi':
        return [['Ref', 'Payer', 'App', 'Amount', 'Status'], ...this.upiCollections.map((row) => [row.ref, row.payer, row.app, row.amount, row.status])];
      case 'cash':
        return [['Ref', 'Type', 'Branch', 'Amount', 'Status'], ...this.cashEntries.map((row) => [row.ref, row.type, row.branch, row.amount, row.status])];
      case 'transfers':
        return [['Ref', 'Mode', 'Beneficiary', 'UTR', 'Amount', 'Status'], ...this.transfers.map((row) => [row.ref, row.mode, row.beneficiary, row.utr, row.amount, row.status])];
      case 'reminders':
        return [['Ref', 'Party', 'Channel', 'Type', 'Next Run', 'Status'], ...this.reminders.map((row) => [row.ref, row.party, row.channel, row.dueType, row.nextRun, row.status])];
      default:
        return [['Metric', 'Value', 'Helper'], ...this.dashboardMetrics.map((row) => [row.label, row.value, row.helper])];
    }
  }

  private downloadCsv(filename: string, rows: Array<Array<string | number>>): void {
    if (typeof document === 'undefined') return;
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private labelForView(view: BankingView): string {
    return this.menuItems.find((item) => item.id === view)?.label ?? 'Banking';
  }
}

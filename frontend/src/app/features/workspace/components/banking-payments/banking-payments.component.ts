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

type BankingForm =
  | 'account'
  | 'statement'
  | 'ledger'
  | 'cheque'
  | 'upi'
  | 'gateway'
  | 'cash'
  | 'transfer'
  | 'reminder';

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

      @if (activeForm(); as form) {
        <section class="data-form-panel" [attr.aria-label]="formTitle()">
          <div class="form-heading">
            <div>
              <span>Data entry</span>
              <h2>{{ formTitle() }}</h2>
              <p>{{ formSubtitle() }}</p>
            </div>
            <button type="button" class="icon-button" (click)="closeForm()" aria-label="Close data entry form">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form class="data-form" (ngSubmit)="submitActiveForm()" #bankingDataForm="ngForm">
            @if (form === 'account') {
              <div class="form-grid">
                <label class="field">
                  <span>Bank name</span>
                  <input name="bankName" [(ngModel)]="bankAccountForm.bank" required />
                </label>
                <label class="field">
                  <span>Account name</span>
                  <input name="accountName" [(ngModel)]="bankAccountForm.accountName" required />
                </label>
                <label class="field">
                  <span>Account type</span>
                  <select name="accountType" [(ngModel)]="bankAccountForm.accountType" required>
                    <option value="Current">Current</option>
                    <option value="Savings">Savings</option>
                    <option value="Cash">Cash</option>
                    <option value="Wallet">Wallet</option>
                    <option value="UPI">UPI</option>
                  </select>
                </label>
                <label class="field">
                  <span>Account group</span>
                  <input name="accountGroup" [(ngModel)]="bankAccountForm.group" required />
                </label>
                <label class="field">
                  <span>Branch</span>
                  <input name="branch" [(ngModel)]="bankAccountForm.branch" required />
                </label>
                <label class="field">
                  <span>IFSC</span>
                  <input name="ifsc" [(ngModel)]="bankAccountForm.ifsc" required />
                </label>
                <label class="field">
                  <span>Opening balance</span>
                  <input type="number" min="0" name="openingBalance" [(ngModel)]="bankAccountForm.openingBalance" required />
                </label>
                <label class="field">
                  <span>Current balance</span>
                  <input type="number" min="0" name="balance" [(ngModel)]="bankAccountForm.balance" required />
                </label>
                <label class="field">
                  <span>Status</span>
                  <select name="bankStatus" [(ngModel)]="bankAccountForm.status" required>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>
            } @else if (form === 'statement') {
              <div class="form-grid">
                <label class="field">
                  <span>Date</span>
                  <input type="date" name="statementDate" [(ngModel)]="statementForm.date" required />
                </label>
                <label class="field">
                  <span>Bank</span>
                  <input name="statementBank" [(ngModel)]="statementForm.bank" required />
                </label>
                <label class="field wide">
                  <span>Narration</span>
                  <input name="statementNarration" [(ngModel)]="statementForm.narration" required />
                </label>
                <label class="field">
                  <span>Source</span>
                  <select name="statementMode" [(ngModel)]="statementForm.mode" required>
                    <option value="CSV">CSV</option>
                    <option value="XLSX">XLSX</option>
                    <option value="PDF">PDF</option>
                    <option value="API Sync">API Sync</option>
                  </select>
                </label>
                <label class="field">
                  <span>Direction</span>
                  <select name="statementDirection" [(ngModel)]="statementForm.direction" required>
                    <option value="Inflow">Inflow</option>
                    <option value="Outflow">Outflow</option>
                  </select>
                </label>
                <label class="field">
                  <span>Amount</span>
                  <input type="number" min="0" name="statementAmount" [(ngModel)]="statementForm.amount" required />
                </label>
              </div>
            } @else if (form === 'ledger') {
              <div class="form-grid">
                <label class="field">
                  <span>Bank statement entry</span>
                  <input name="ledgerBankEntry" [(ngModel)]="ledgerEntryForm.bankEntry" required />
                </label>
                <label class="field">
                  <span>ERP ledger entry</span>
                  <input name="ledgerEntryName" [(ngModel)]="ledgerEntryForm.ledgerEntry" required />
                </label>
                <label class="field">
                  <span>Amount</span>
                  <input type="number" min="0" name="ledgerAmount" [(ngModel)]="ledgerEntryForm.amount" required />
                </label>
              </div>
            } @else if (form === 'cheque') {
              <div class="form-grid">
                <label class="field">
                  <span>Party</span>
                  <input name="chequeParty" [(ngModel)]="chequeForm.party" required />
                </label>
                <label class="field">
                  <span>Bank</span>
                  <input name="chequeBank" [(ngModel)]="chequeForm.bank" required />
                </label>
                <label class="field">
                  <span>Date</span>
                  <input type="date" name="chequeDate" [(ngModel)]="chequeForm.date" required />
                </label>
                <label class="field">
                  <span>Amount</span>
                  <input type="number" min="0" name="chequeAmount" [(ngModel)]="chequeForm.amount" required />
                </label>
                <label class="field">
                  <span>Status</span>
                  <select name="chequeStatus" [(ngModel)]="chequeForm.status" required>
                    <option value="Pending">Pending</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Deposited">Deposited</option>
                    <option value="Bounced">Bounced</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </label>
              </div>
            } @else if (form === 'upi') {
              <div class="form-grid">
                <label class="field">
                  <span>Payer</span>
                  <input name="upiPayer" [(ngModel)]="upiForm.payer" required />
                </label>
                <label class="field">
                  <span>UPI app</span>
                  <select name="upiApp" [(ngModel)]="upiForm.app" required>
                    <option value="Google Pay">Google Pay</option>
                    <option value="PhonePe">PhonePe</option>
                    <option value="Paytm">Paytm</option>
                    <option value="BHIM">BHIM</option>
                  </select>
                </label>
                <label class="field">
                  <span>Amount</span>
                  <input type="number" min="0" name="upiAmount" [(ngModel)]="upiForm.amount" required />
                </label>
              </div>
            } @else if (form === 'gateway') {
              <div class="form-grid">
                <label class="field">
                  <span>Gateway</span>
                  <select name="gatewayName" [(ngModel)]="gatewayForm.gateway" required>
                    <option value="Razorpay">Razorpay</option>
                    <option value="PayU">PayU</option>
                    <option value="Cashfree">Cashfree</option>
                    <option value="Stripe">Stripe</option>
                  </select>
                </label>
                <label class="field">
                  <span>Invoice</span>
                  <input name="gatewayInvoice" [(ngModel)]="gatewayForm.invoice" required />
                </label>
                <label class="field">
                  <span>Customer</span>
                  <input name="gatewayCustomer" [(ngModel)]="gatewayForm.customer" required />
                </label>
                <label class="field">
                  <span>Amount</span>
                  <input type="number" min="0" name="gatewayAmount" [(ngModel)]="gatewayForm.amount" required />
                </label>
                <label class="field">
                  <span>Settlement</span>
                  <select name="gatewaySettlement" [(ngModel)]="gatewayForm.settlement" required>
                    <option value="Pending">Pending</option>
                    <option value="T+1">T+1</option>
                    <option value="T+2">T+2</option>
                    <option value="Retry">Retry</option>
                  </select>
                </label>
              </div>
            } @else if (form === 'cash') {
              <div class="form-grid">
                <label class="field">
                  <span>Entry type</span>
                  <select name="cashType" [(ngModel)]="cashForm.type" required>
                    <option value="Cash receipt">Cash receipt</option>
                    <option value="Cash expense">Cash expense</option>
                    <option value="Branch transfer">Branch transfer</option>
                    <option value="Daily closing">Daily closing</option>
                  </select>
                </label>
                <label class="field">
                  <span>Branch</span>
                  <input name="cashBranch" [(ngModel)]="cashForm.branch" required />
                </label>
                <label class="field">
                  <span>Amount</span>
                  <input type="number" min="0" name="cashAmount" [(ngModel)]="cashForm.amount" required />
                </label>
                <label class="field">
                  <span>Status</span>
                  <input name="cashStatus" [(ngModel)]="cashForm.status" required />
                </label>
              </div>
            } @else if (form === 'transfer') {
              <div class="form-grid">
                <label class="field">
                  <span>Mode</span>
                  <select name="transferMode" [(ngModel)]="transferForm.mode" required>
                    <option value="NEFT">NEFT</option>
                    <option value="RTGS">RTGS</option>
                    <option value="IMPS">IMPS</option>
                  </select>
                </label>
                <label class="field">
                  <span>Beneficiary</span>
                  <input name="transferBeneficiary" [(ngModel)]="transferForm.beneficiary" required />
                </label>
                <label class="field">
                  <span>UTR number</span>
                  <input name="transferUtr" [(ngModel)]="transferForm.utr" />
                </label>
                <label class="field">
                  <span>Amount</span>
                  <input type="number" min="0" name="transferAmount" [(ngModel)]="transferForm.amount" required />
                </label>
                <label class="field">
                  <span>Status</span>
                  <select name="transferStatus" [(ngModel)]="transferForm.status" required>
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                    <option value="Reversed">Reversed</option>
                  </select>
                </label>
              </div>
            } @else if (form === 'reminder') {
              <div class="form-grid">
                <label class="field">
                  <span>Party</span>
                  <input name="reminderParty" [(ngModel)]="reminderForm.party" required />
                </label>
                <label class="field">
                  <span>Channel</span>
                  <select name="reminderChannel" [(ngModel)]="reminderForm.channel" required>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Email">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="Push">Push</option>
                    <option value="Email + SMS">Email + SMS</option>
                  </select>
                </label>
                <label class="field">
                  <span>Reminder type</span>
                  <select name="reminderDueType" [(ngModel)]="reminderForm.dueType" required>
                    <option value="Invoice due reminder">Invoice due reminder</option>
                    <option value="Overdue reminder">Overdue reminder</option>
                    <option value="EMI reminder">EMI reminder</option>
                    <option value="Vendor payment reminder">Vendor payment reminder</option>
                  </select>
                </label>
                <label class="field">
                  <span>Next run</span>
                  <input name="reminderNextRun" [(ngModel)]="reminderForm.nextRun" required />
                </label>
                <label class="field">
                  <span>Status</span>
                  <select name="reminderStatus" [(ngModel)]="reminderForm.status" required>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Sent">Sent</option>
                    <option value="Draft">Draft</option>
                    <option value="Escalation">Escalation</option>
                  </select>
                </label>
              </div>
            }

            <div class="form-actions">
              <button type="submit" class="primary-action" [disabled]="bankingDataForm.invalid">
                <mat-icon>save</mat-icon>
                {{ formSubmitLabel() }}
              </button>
              <button type="button" class="small-action" (click)="closeForm()">
                <mat-icon>close</mat-icon>
                Cancel
              </button>
            </div>
          </form>
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
    .report-card,
    .data-form-panel {
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
    :host-context(.dark) .report-card,
    :host-context(.dark) .data-form-panel {
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
    :host-context(.dark) .form-heading h2,
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
    .primary-action,
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

    .primary-action {
      border-color: rgb(37 99 235);
      background: rgb(37 99 235);
      color: white;
    }

    .primary-action:disabled {
      border-color: rgb(148 163 184);
      background: rgb(148 163 184);
      cursor: not-allowed;
      opacity: 0.75;
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

    .data-form-panel {
      display: grid;
      gap: 14px;
      padding: 16px;
    }

    .form-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .form-heading span {
      margin: 0 0 4px;
      color: rgb(37 99 235);
      font-size: 11px;
      font-weight: 850;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .form-heading h2 {
      margin: 0;
      color: rgb(15 23 42);
      font-size: 18px;
      font-weight: 850;
    }

    .form-heading p {
      margin: 6px 0 0;
      color: rgb(100 116 139);
      font-size: 13px;
      line-height: 1.45;
    }

    .data-form {
      display: grid;
      gap: 14px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .field {
      display: grid;
      gap: 6px;
      min-width: 0;
      color: rgb(51 65 85);
      font-size: 12px;
      font-weight: 800;
    }

    .field.wide {
      grid-column: span 2;
    }

    .field input,
    .field select {
      width: 100%;
      min-height: 40px;
      border: 1px solid rgb(203 213 225);
      border-radius: 8px;
      background: white;
      color: rgb(15 23 42);
      padding: 0 11px;
      font: inherit;
      font-size: 13px;
      font-weight: 650;
      outline: none;
    }

    .field input:focus,
    .field select:focus {
      border-color: rgb(37 99 235);
      box-shadow: 0 0 0 3px rgb(191 219 254);
    }

    .form-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
      padding-top: 2px;
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

    :host-context(.dark) .primary-action {
      border-color: rgb(37 99 235);
      background: rgb(37 99 235);
      color: white;
    }

    :host-context(.dark) .primary-action:disabled {
      border-color: rgb(71 85 105);
      background: rgb(71 85 105);
      color: rgb(203 213 225);
    }

    :host-context(.dark) .field {
      color: rgb(203 213 225);
    }

    :host-context(.dark) .field input,
    :host-context(.dark) .field select {
      border-color: rgb(51 65 85);
      background: rgb(2 6 23);
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
      .denomination-grid,
      .form-grid {
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
      .denomination-grid,
      .form-grid {
        grid-template-columns: 1fr;
      }

      .field.wide {
        grid-column: span 1;
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
  activeForm = signal<BankingForm | null>(null);
  actionTitle = signal('');
  actionMessage = signal('');
  actionIcon = signal('check_circle');
  activeUpiRef = 'UPI-QR-001';

  private bankSequence = 4;
  private transactionSequence = 1012;
  private chequeSequence = 300112;
  private upiSequence = 993;
  private gatewaySequence = 118;
  private cashSequence = 503;
  private transferSequence = 8811;
  private reminderSequence = 71;

  bankAccountForm = {
    bank: 'Axis Bank',
    accountName: 'Payment Operations',
    accountType: 'Current',
    group: 'Business',
    branch: 'Surat Ring Road',
    ifsc: 'UTIB0000911',
    openingBalance: 0,
    balance: 0,
    status: 'Active' as BankStatus,
  };

  statementForm = {
    date: this.today(),
    bank: 'ICICI Bank',
    narration: 'Imported statement entry',
    mode: 'CSV',
    amount: 64000,
    direction: 'Inflow' as 'Inflow' | 'Outflow',
  };

  ledgerEntryForm = {
    bankEntry: 'Bank charge',
    ledgerEntry: 'Bank charges journal',
    amount: 1180,
  };

  chequeForm = {
    party: 'New Vendor Payment',
    bank: 'HDFC Bank',
    date: this.today(),
    amount: 50000,
    status: 'Pending' as ChequeStatus,
  };

  upiForm = {
    payer: 'New Customer',
    app: 'Google Pay',
    amount: 25000,
  };

  gatewayForm = {
    gateway: 'Razorpay',
    invoice: 'INV-DRAFT',
    customer: 'New Customer',
    amount: 25000,
    settlement: 'Pending',
  };

  cashForm = {
    type: 'Cash receipt',
    branch: 'Ahmedabad',
    amount: 12500,
    status: 'Open closing',
  };

  transferForm = {
    mode: 'NEFT',
    beneficiary: 'New Beneficiary',
    utr: '',
    amount: 45000,
    status: 'Pending' as TransferStatus,
  };

  reminderForm = {
    party: 'New Customer',
    channel: 'WhatsApp',
    dueType: 'Invoice due reminder',
    nextRun: 'Now',
    status: 'Scheduled',
  };

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
    this.activeForm.set(null);
    this.announce('Section opened', `${this.labelForView(view)} is ready.`);
  }

  openForm(form: BankingForm): void {
    this.activeForm.set(form);
    this.activeView.set(this.viewForForm(form));
    this.announce('Data entry opened', `${this.formTitle()} form is ready.`, 'edit_note');
  }

  closeForm(): void {
    this.activeForm.set(null);
  }

  clearAction(): void {
    this.actionTitle.set('');
    this.actionMessage.set('');
    this.actionIcon.set('check_circle');
  }

  submitActiveForm(): void {
    switch (this.activeForm()) {
      case 'account':
        this.submitBankAccount();
        break;
      case 'statement':
        this.submitStatementImport();
        break;
      case 'ledger':
        this.submitLedgerEntry();
        break;
      case 'cheque':
        this.submitCheque();
        break;
      case 'upi':
        this.submitUpiCollection();
        break;
      case 'gateway':
        this.submitPaymentLink();
        break;
      case 'cash':
        this.submitCashEntry();
        break;
      case 'transfer':
        this.submitTransfer();
        break;
      case 'reminder':
        this.submitReminder();
        break;
      default:
        break;
    }
  }

  formTitle(): string {
    switch (this.activeForm()) {
      case 'account':
        return 'Bank account entry';
      case 'statement':
        return 'Bank statement import';
      case 'ledger':
        return 'ERP ledger entry';
      case 'cheque':
        return 'Cheque entry';
      case 'upi':
        return 'UPI collection request';
      case 'gateway':
        return 'Payment gateway link';
      case 'cash':
        return 'Cash book entry';
      case 'transfer':
        return 'Fund transfer entry';
      case 'reminder':
        return 'Payment reminder entry';
      default:
        return 'Banking data entry';
    }
  }

  formSubtitle(): string {
    switch (this.activeForm()) {
      case 'account':
        return 'Create current, savings, cash, wallet, or UPI accounts for this client workspace.';
      case 'statement':
        return 'Enter imported statement details and send them into the reconciliation queue.';
      case 'ledger':
        return 'Create a ledger suggestion for unmatched bank statement entries.';
      case 'cheque':
        return 'Capture cheque details with status tracking for issue, deposit, bounce, or cancellation.';
      case 'upi':
        return 'Generate a dynamic UPI collection reference for a customer payment.';
      case 'gateway':
        return 'Create a payment link entry for Razorpay, PayU, Cashfree, or Stripe.';
      case 'cash':
        return 'Record cash receipt, expense, transfer, or daily closing movement.';
      case 'transfer':
        return 'Track NEFT, RTGS, or IMPS transfers with UTR and maker-checker status.';
      case 'reminder':
        return 'Schedule or log collection and vendor payment reminders.';
      default:
        return 'Enter details and save them to the selected banking module.';
    }
  }

  formSubmitLabel(): string {
    switch (this.activeForm()) {
      case 'account':
        return 'Save account';
      case 'statement':
        return 'Import statement';
      case 'ledger':
        return 'Create entry';
      case 'cheque':
        return 'Issue cheque';
      case 'upi':
        return 'Generate QR';
      case 'gateway':
        return 'Create link';
      case 'cash':
        return 'Record cash';
      case 'transfer':
        return 'Create transfer';
      case 'reminder':
        return 'Save reminder';
      default:
        return 'Save';
    }
  }

  addBankAccount(): void {
    this.openForm('account');
  }

  submitBankAccount(): void {
    this.bankSequence += 1;
    const id = `BA-${String(this.bankSequence).padStart(3, '0')}`;
    const bank = this.text(this.bankAccountForm.bank, 'New Bank');
    const accountName = this.text(this.bankAccountForm.accountName, `Payment Operations ${this.bankSequence}`);
    this.bankAccounts = [
      {
        id,
        bank,
        accountName,
        accountType: this.text(this.bankAccountForm.accountType, 'Current'),
        group: this.text(this.bankAccountForm.group, 'Business'),
        branch: this.text(this.bankAccountForm.branch, 'Head Office'),
        ifsc: this.text(this.bankAccountForm.ifsc, '-').toUpperCase(),
        openingBalance: this.amountValue(this.bankAccountForm.openingBalance),
        balance: this.amountValue(this.bankAccountForm.balance),
        status: this.bankAccountForm.status,
        health: 'New',
        lastSync: 'Not synced',
      },
      ...this.bankAccounts,
    ];
    this.activeView.set('accounts');
    this.closeForm();
    this.announce('Bank account saved', `${id} ${bank} was added for ${accountName}.`, 'account_balance');
  }

  importStatement(): void {
    this.openForm('statement');
  }

  submitStatementImport(): void {
    this.transactionSequence += 1;
    const narration = this.text(this.statementForm.narration, 'Imported statement entry');
    const amount = this.amountValue(this.statementForm.amount);
    this.bankTransactions = [
      {
        id: `BT-${this.transactionSequence}`,
        date: this.text(this.statementForm.date, this.today()),
        bank: this.text(this.statementForm.bank, 'Bank statement'),
        narration,
        mode: this.text(this.statementForm.mode, 'CSV'),
        amount,
        direction: this.statementForm.direction,
        status: 'Unreconciled',
      },
      ...this.bankTransactions,
    ];
    this.reconciliationRows = [
      {
        id: `REC-${this.transactionSequence}`,
        bankEntry: narration,
        ledgerEntry: 'No ledger entry',
        amount,
        confidence: '0%',
        status: 'Unmatched',
      },
      ...this.reconciliationRows,
    ];
    this.activeView.set('reconciliation');
    this.closeForm();
    this.announce('Statement imported', `${narration} was imported and queued for reconciliation.`, 'upload_file');
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
    this.openForm('ledger');
  }

  submitLedgerEntry(): void {
    const bankEntry = this.text(this.ledgerEntryForm.bankEntry, 'Bank statement entry');
    const ledgerEntry = this.text(this.ledgerEntryForm.ledgerEntry, 'ERP ledger entry');
    const amount = this.amountValue(this.ledgerEntryForm.amount);
    let updated = false;

    this.reconciliationRows = this.reconciliationRows.map((row) => {
      if (!updated && row.status === 'Unmatched') {
        updated = true;
        return { ...row, bankEntry, ledgerEntry, amount, status: 'Suggested', confidence: '88%' };
      }
      return row;
    });

    if (!updated) {
      this.transactionSequence += 1;
      this.reconciliationRows = [
        {
          id: `REC-${this.transactionSequence}`,
          bankEntry,
          ledgerEntry,
          amount,
          confidence: '88%',
          status: 'Suggested',
        },
        ...this.reconciliationRows,
      ];
    }

    this.activeView.set('reconciliation');
    this.closeForm();
    this.announce('Ledger entry created', `${ledgerEntry} is ready for approval matching.`, 'post_add');
  }

  issueCheque(): void {
    this.openForm('cheque');
  }

  submitCheque(): void {
    this.chequeSequence += 1;
    const chequeNumber = `CHQ-${this.chequeSequence}`;
    this.cheques = [
      {
        number: chequeNumber,
        party: this.text(this.chequeForm.party, 'New Vendor Payment'),
        bank: this.text(this.chequeForm.bank, 'HDFC Bank'),
        date: this.text(this.chequeForm.date, this.today()),
        amount: this.amountValue(this.chequeForm.amount),
        status: this.chequeForm.status,
      },
      ...this.cheques,
    ];
    this.activeView.set('cheques');
    this.closeForm();
    this.announce('Cheque saved', `${chequeNumber} was added with ${this.chequeForm.status.toLowerCase()} status.`, 'add_card');
  }

  printCheque(): void {
    this.announce('Cheque print ready', 'Cheque layout and MICR alignment are ready for browser print.', 'print');
    if (typeof window !== 'undefined') {
      window.setTimeout(() => window.print(), 120);
    }
  }

  generateUpiQr(): void {
    this.openForm('upi');
  }

  submitUpiCollection(): void {
    this.upiSequence += 1;
    this.activeUpiRef = `UPI-QR-${this.upiSequence}`;
    this.upiCollections = [
      {
        ref: `UPI-${this.upiSequence}`,
        payer: this.text(this.upiForm.payer, 'New Customer'),
        app: this.text(this.upiForm.app, 'Google Pay'),
        amount: this.amountValue(this.upiForm.amount),
        status: 'QR generated',
      },
      ...this.upiCollections,
    ];
    this.activeView.set('upi');
    this.closeForm();
    this.announce('UPI QR generated', `${this.activeUpiRef} is ready for dynamic collection.`, 'qr_code_2');
  }

  createPaymentLink(): void {
    this.openForm('gateway');
  }

  submitPaymentLink(): void {
    this.gatewaySequence += 1;
    const gateway = this.text(this.gatewayForm.gateway, 'Razorpay');
    const ref = `${this.gatewayPrefix(gateway)}-${this.gatewaySequence}`;
    this.gatewayTransactions = [
      {
        ref,
        gateway,
        invoice: this.text(this.gatewayForm.invoice, 'INV-DRAFT'),
        customer: this.text(this.gatewayForm.customer, 'New Customer'),
        amount: this.amountValue(this.gatewayForm.amount),
        status: 'Link sent',
        settlement: this.text(this.gatewayForm.settlement, 'Pending'),
      },
      ...this.gatewayTransactions,
    ];
    this.activeView.set('gateways');
    this.closeForm();
    this.announce('Payment link created', `${ref} was created for invoice payment collection.`, 'link');
  }

  recordCashEntry(): void {
    this.openForm('cash');
  }

  submitCashEntry(): void {
    this.cashSequence += 1;
    const ref = `CASH-${this.cashSequence}`;
    this.cashEntries = [
      {
        ref,
        type: this.text(this.cashForm.type, 'Cash receipt'),
        branch: this.text(this.cashForm.branch, 'Head Office'),
        amount: this.amountValue(this.cashForm.amount),
        status: this.text(this.cashForm.status, 'Open closing'),
      },
      ...this.cashEntries,
    ];
    this.activeView.set('cash');
    this.closeForm();
    this.announce('Cash entry recorded', `${ref} was added to the cash book.`, 'payments');
  }

  createTransfer(): void {
    this.openForm('transfer');
  }

  submitTransfer(): void {
    this.transferSequence += 1;
    const ref = `TRF-${this.transferSequence}`;
    this.transfers = [
      {
        ref,
        mode: this.text(this.transferForm.mode, 'NEFT'),
        beneficiary: this.text(this.transferForm.beneficiary, 'New Beneficiary'),
        utr: this.text(this.transferForm.utr, '-'),
        amount: this.amountValue(this.transferForm.amount),
        status: this.transferForm.status,
      },
      ...this.transfers,
    ];
    this.activeView.set('transfers');
    this.closeForm();
    this.announce('Transfer created', `${ref} entered maker-checker approval.`, 'send');
  }

  sendReminder(): void {
    this.openForm('reminder');
  }

  submitReminder(): void {
    this.reminderSequence += 1;
    const ref = `REM-${this.reminderSequence}`;
    this.reminders = [
      {
        ref,
        party: this.text(this.reminderForm.party, 'New Customer'),
        channel: this.text(this.reminderForm.channel, 'WhatsApp'),
        dueType: this.text(this.reminderForm.dueType, 'Invoice due reminder'),
        nextRun: this.text(this.reminderForm.nextRun, 'Now'),
        status: this.text(this.reminderForm.status, 'Scheduled'),
      },
      ...this.reminders,
    ];
    this.activeView.set('reminders');
    this.closeForm();
    this.announce('Reminder saved', `${ref} was saved and logged.`, 'notifications_active');
  }

  saveSettings(): void {
    this.announce('Settings saved', 'Banking automation settings were saved for this client workspace.', 'save');
  }

  exportCurrentView(view: BankingView = this.activeView()): void {
    this.downloadCsv(`banking-${view}-${this.today()}.csv`, this.exportRowsFor(view));
    this.announce('Export ready', `${this.labelForView(view)} was downloaded as CSV.`, 'file_download');
  }

  private viewForForm(form: BankingForm): BankingView {
    switch (form) {
      case 'account':
        return 'accounts';
      case 'statement':
        return 'sync';
      case 'ledger':
        return 'reconciliation';
      case 'cheque':
        return 'cheques';
      case 'upi':
        return 'upi';
      case 'gateway':
        return 'gateways';
      case 'cash':
        return 'cash';
      case 'transfer':
        return 'transfers';
      case 'reminder':
        return 'reminders';
      default:
        return 'dashboard';
    }
  }

  private gatewayPrefix(gateway: string): string {
    switch (gateway) {
      case 'Cashfree':
        return 'CSF';
      case 'PayU':
        return 'PAYU';
      case 'Stripe':
        return 'STR';
      default:
        return 'RZP';
    }
  }

  private text(value: string, fallback: string): string {
    const trimmed = String(value ?? '').trim();
    return trimmed || fallback;
  }

  private amountValue(value: number | string): number {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
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

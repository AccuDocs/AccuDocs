import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowRightOnRectangleSolid,
  heroArrowUpTraySolid,
  heroBanknotesSolid,
  heroBellAlertSolid,
  heroBuildingOffice2Solid,
  heroCalendarDaysSolid,
  heroChatBubbleLeftRightSolid,
  heroCheckCircleSolid,
  heroClipboardDocumentCheckSolid,
  heroClockSolid,
  heroDocumentTextSolid,
  heroExclamationTriangleSolid,
  heroReceiptPercentSolid,
  heroSquares2x2Solid,
} from '@ng-icons/heroicons/solid';
import { AuthService } from '@core/services/auth.service';

type PortalTab = 'overview' | 'documents' | 'tax' | 'billing' | 'messages';

interface PortalNavItem {
  id: PortalTab;
  label: string;
  icon: string;
}

interface PortalMetric {
  label: string;
  value: string;
  caption: string;
  icon: string;
  tone: 'blue' | 'emerald' | 'amber' | 'rose';
}

interface ChecklistItem {
  title: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'review';
}

interface DeadlineItem {
  title: string;
  period: string;
  dueDate: string;
  status: 'upcoming' | 'filed' | 'attention';
}

interface InvoiceItem {
  number: string;
  date: string;
  amount: number;
  status: 'paid' | 'due' | 'overdue';
}

interface MessageItem {
  from: string;
  subject: string;
  body: string;
  time: string;
}

@Component({
  selector: 'app-client-portal',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, FormsModule, NgIconComponent],
  providers: [
    provideIcons({
      heroArrowRightOnRectangleSolid,
      heroArrowUpTraySolid,
      heroBanknotesSolid,
      heroBellAlertSolid,
      heroBuildingOffice2Solid,
      heroCalendarDaysSolid,
      heroChatBubbleLeftRightSolid,
      heroCheckCircleSolid,
      heroClipboardDocumentCheckSolid,
      heroClockSolid,
      heroDocumentTextSolid,
      heroExclamationTriangleSolid,
      heroReceiptPercentSolid,
      heroSquares2x2Solid,
    }),
  ],
  template: `
    <main class="client-portal min-h-screen bg-slate-100 text-slate-950">
      <aside class="portal-rail">
        <div class="brand-block">
          <div class="brand-mark">
            <ng-icon name="heroBuildingOffice2Solid" size="22"></ng-icon>
          </div>
          <div>
            <p class="eyebrow">Client portal</p>
            <h1>AccuDocs</h1>
          </div>
        </div>

        <nav class="portal-nav" aria-label="Client portal navigation">
          @for (item of navItems; track item.id) {
            <button type="button" [class.active]="activeTab() === item.id" (click)="setTab(item.id)">
              <ng-icon [name]="item.icon" size="18"></ng-icon>
              <span>{{ item.label }}</span>
            </button>
          }
        </nav>

        <div class="rail-card">
          <p class="eyebrow">CA firm</p>
          <strong>Siddharth & Associates</strong>
          <span>Support available 10:00 AM - 6:00 PM</span>
        </div>
      </aside>

      <section class="portal-main">
        <header class="portal-topbar">
          <div>
            <p class="eyebrow">Welcome back</p>
            <h2>{{ clientName() }}</h2>
          </div>
          <div class="topbar-actions">
            <span class="status-pill">
              <ng-icon name="heroCheckCircleSolid" size="15"></ng-icon>
              GST active
            </span>
            <button type="button" class="logout-button" (click)="logout()">
              <ng-icon name="heroArrowRightOnRectangleSolid" size="17"></ng-icon>
              Logout
            </button>
          </div>
        </header>

        @if (activeTab() === 'overview') {
          <section class="overview-grid">
            <div class="hero-panel">
              <div>
                <p class="eyebrow">Action center</p>
                <h3>Documents, GST status, invoices, and messages in one client view.</h3>
                <p class="muted">This portal is separate from the CA firm workspace. It is designed only for client users.</p>
              </div>
              <div class="hero-actions">
                <button type="button" class="primary-action" (click)="setTab('documents')">
                  <ng-icon name="heroArrowUpTraySolid" size="18"></ng-icon>
                  Upload document
                </button>
                <button type="button" class="secondary-action" (click)="setTab('billing')">
                  <ng-icon name="heroBanknotesSolid" size="18"></ng-icon>
                  View invoices
                </button>
              </div>
            </div>

            <div class="metrics-grid">
              @for (metric of metrics; track metric.label) {
                <article class="metric-card" [class]="metric.tone">
                  <div>
                    <span>{{ metric.label }}</span>
                    <strong>{{ metric.value }}</strong>
                    <p>{{ metric.caption }}</p>
                  </div>
                  <ng-icon [name]="metric.icon" size="24"></ng-icon>
                </article>
              }
            </div>

            <section class="panel">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Pending checklist</p>
                  <h3>Required from you</h3>
                </div>
                <button type="button" class="text-action" (click)="setTab('documents')">Open documents</button>
              </div>
              <div class="stack-list">
                @for (item of checklist; track item.title) {
                  <div class="list-row">
                    <span class="row-icon" [class.done]="item.status === 'submitted'">
                      <ng-icon [name]="item.status === 'submitted' ? 'heroCheckCircleSolid' : 'heroClockSolid'" size="17"></ng-icon>
                    </span>
                    <div>
                      <strong>{{ item.title }}</strong>
                      <p>Due {{ item.dueDate | date: 'dd MMM yyyy' }}</p>
                    </div>
                    <span class="row-status" [class]="item.status">{{ statusLabel(item.status) }}</span>
                  </div>
                }
              </div>
            </section>

            <section class="panel">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Upcoming deadlines</p>
                  <h3>Compliance calendar</h3>
                </div>
                <button type="button" class="text-action" (click)="setTab('tax')">GST view</button>
              </div>
              <div class="stack-list">
                @for (deadline of deadlines; track deadline.title + deadline.period) {
                  <div class="list-row">
                    <span class="row-icon">
                      <ng-icon name="heroCalendarDaysSolid" size="17"></ng-icon>
                    </span>
                    <div>
                      <strong>{{ deadline.title }}</strong>
                      <p>{{ deadline.period }} - due {{ deadline.dueDate | date: 'dd MMM yyyy' }}</p>
                    </div>
                    <span class="row-status" [class]="deadline.status">{{ statusLabel(deadline.status) }}</span>
                  </div>
                }
              </div>
            </section>
          </section>
        }

        @if (activeTab() === 'documents') {
          <section class="content-grid">
            <div class="panel wide">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Document upload</p>
                  <h3>Send files to your CA team</h3>
                </div>
                <select [(ngModel)]="uploadType" class="select-control" aria-label="Document type">
                  <option>Sales invoices</option>
                  <option>Purchase bills</option>
                  <option>Bank statements</option>
                  <option>Payroll documents</option>
                  <option>Other supporting files</option>
                </select>
              </div>
              <label class="upload-zone">
                <input type="file" multiple class="sr-only" (change)="onFilesSelected($event)" />
                <ng-icon name="heroArrowUpTraySolid" size="34"></ng-icon>
                <strong>Drop files here or choose from computer</strong>
                <span>{{ uploadType }} will be tagged for review.</span>
              </label>
              @if (selectedFiles().length) {
                <div class="selected-files">
                  @for (file of selectedFiles(); track file) {
                    <span>{{ file }}</span>
                  }
                </div>
              }
            </div>

            <div class="panel">
              <p class="eyebrow">Accepted files</p>
              <h3>What to upload</h3>
              <ul class="plain-list">
                <li>GST sales and purchase registers</li>
                <li>Invoice PDFs, Excel, CSV, JPG, PNG</li>
                <li>Bank statements for reconciliation</li>
                <li>Salary sheet, PF, ESIC support</li>
              </ul>
            </div>
          </section>
        }

        @if (activeTab() === 'tax') {
          <section class="content-grid">
            <div class="panel wide">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">GST summary</p>
                  <h3>Current filing snapshot</h3>
                </div>
                <span class="status-pill amber">
                  <ng-icon name="heroBellAlertSolid" size="15"></ng-icon>
                  Action needed
                </span>
              </div>
              <div class="tax-grid">
                <div>
                  <span>Output GST</span>
                  <strong>{{ 184500 | currency: 'INR':'symbol':'1.0-0' }}</strong>
                </div>
                <div>
                  <span>Input GST</span>
                  <strong>{{ 126800 | currency: 'INR':'symbol':'1.0-0' }}</strong>
                </div>
                <div>
                  <span>Estimated payable</span>
                  <strong>{{ 57700 | currency: 'INR':'symbol':'1.0-0' }}</strong>
                </div>
              </div>
            </div>

            <div class="panel">
              <p class="eyebrow">Missing data</p>
              <h3>Before filing</h3>
              <ul class="plain-list">
                <li>April purchase bills</li>
                <li>Bank statement for main account</li>
                <li>One vendor GSTIN mismatch confirmation</li>
              </ul>
            </div>
          </section>
        }

        @if (activeTab() === 'billing') {
          <section class="panel wide-panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">CA invoices</p>
                <h3>Payments and receipts</h3>
              </div>
              <span class="status-pill">2 invoices visible</span>
            </div>
            <div class="table-list">
              @for (invoice of invoices; track invoice.number) {
                <div class="table-row">
                  <div>
                    <strong>{{ invoice.number }}</strong>
                    <p>{{ invoice.date | date: 'dd MMM yyyy' }}</p>
                  </div>
                  <span>{{ invoice.amount | currency: 'INR':'symbol':'1.0-0' }}</span>
                  <span class="row-status" [class]="invoice.status">{{ statusLabel(invoice.status) }}</span>
                  <button type="button" class="secondary-action compact">View PDF</button>
                </div>
              }
            </div>
          </section>
        }

        @if (activeTab() === 'messages') {
          <section class="panel wide-panel">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Messages</p>
                <h3>Updates from your CA team</h3>
              </div>
              <span class="status-pill">WhatsApp linked</span>
            </div>
            <div class="message-list">
              @for (message of messages; track message.subject) {
                <article>
                  <div>
                    <strong>{{ message.subject }}</strong>
                    <span>{{ message.time }}</span>
                  </div>
                  <p>{{ message.body }}</p>
                  <small>{{ message.from }}</small>
                </article>
              }
            </div>
          </section>
        }
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
    }

    .client-portal {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr);
      min-height: 100vh;
    }

    .portal-rail {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 24px;
      background: #0f172a;
      color: #e2e8f0;
    }

    .brand-block,
    .portal-topbar,
    .topbar-actions,
    .hero-actions,
    .panel-header,
    .list-row,
    .table-row {
      display: flex;
      align-items: center;
    }

    .brand-block {
      gap: 12px;
    }

    .brand-mark {
      display: grid;
      width: 44px;
      height: 44px;
      place-items: center;
      border-radius: 10px;
      background: #2563eb;
      color: #ffffff;
    }

    .brand-block h1,
    .portal-topbar h2,
    .hero-panel h3,
    .panel h3 {
      margin: 0;
      letter-spacing: 0;
    }

    .brand-block h1 {
      font-size: 20px;
      font-weight: 800;
    }

    .eyebrow {
      margin: 0 0 5px;
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .portal-rail .eyebrow {
      color: #94a3b8;
    }

    .portal-nav {
      display: grid;
      gap: 8px;
    }

    .portal-nav button {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid transparent;
      border-radius: 8px;
      color: #cbd5e1;
      background: transparent;
      font-weight: 700;
      text-align: left;
      transition: 160ms ease;
    }

    .portal-nav button:hover,
    .portal-nav button.active {
      border-color: #334155;
      background: #1e293b;
      color: #ffffff;
    }

    .rail-card {
      margin-top: auto;
      padding: 16px;
      border: 1px solid #334155;
      border-radius: 10px;
      background: #111827;
    }

    .rail-card strong,
    .rail-card span {
      display: block;
    }

    .rail-card span {
      margin-top: 8px;
      color: #94a3b8;
      font-size: 12px;
      line-height: 1.5;
    }

    .portal-main {
      min-width: 0;
      padding: 24px;
    }

    .portal-topbar {
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 22px;
    }

    .portal-topbar h2 {
      font-size: 28px;
      font-weight: 850;
    }

    .topbar-actions {
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }

    .status-pill,
    .logout-button,
    .primary-action,
    .secondary-action,
    .text-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
    }

    .status-pill {
      min-height: 34px;
      padding: 0 12px;
      border: 1px solid #bbf7d0;
      background: #f0fdf4;
      color: #166534;
    }

    .status-pill.amber {
      border-color: #fde68a;
      background: #fffbeb;
      color: #92400e;
    }

    .logout-button,
    .secondary-action {
      min-height: 38px;
      padding: 0 14px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
    }

    .primary-action {
      min-height: 40px;
      padding: 0 16px;
      border: 1px solid #2563eb;
      background: #2563eb;
      color: #ffffff;
    }

    .secondary-action.compact {
      min-height: 32px;
      padding: 0 12px;
    }

    .text-action {
      border: 0;
      background: transparent;
      color: #2563eb;
    }

    .overview-grid,
    .content-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      gap: 18px;
    }

    .hero-panel,
    .panel,
    .metric-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #ffffff;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
    }

    .hero-panel {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 24px;
    }

    .hero-panel h3 {
      max-width: 760px;
      font-size: 26px;
      line-height: 1.18;
      font-weight: 850;
    }

    .muted {
      margin: 10px 0 0;
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
    }

    .metrics-grid {
      display: grid;
      grid-column: 1 / -1;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }

    .metric-card {
      justify-content: space-between;
      padding: 18px;
    }

    .metric-card span {
      color: #64748b;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .metric-card strong {
      display: block;
      margin-top: 10px;
      font-size: 24px;
      font-weight: 900;
    }

    .metric-card p {
      margin: 6px 0 0;
      color: #64748b;
      font-size: 12px;
    }

    .metric-card.blue ng-icon { color: #2563eb; }
    .metric-card.emerald ng-icon { color: #059669; }
    .metric-card.amber ng-icon { color: #d97706; }
    .metric-card.rose ng-icon { color: #e11d48; }

    .panel {
      padding: 20px;
    }

    .panel.wide,
    .wide-panel {
      grid-column: 1 / -1;
    }

    .panel-header {
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }

    .stack-list,
    .table-list,
    .message-list {
      display: grid;
      gap: 10px;
    }

    .list-row,
    .table-row {
      gap: 12px;
      min-height: 62px;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
    }

    .list-row > div,
    .table-row > div {
      min-width: 0;
      flex: 1;
    }

    .list-row strong,
    .table-row strong,
    .message-list strong {
      display: block;
      font-size: 14px;
    }

    .list-row p,
    .table-row p {
      margin: 4px 0 0;
      color: #64748b;
      font-size: 12px;
    }

    .row-icon {
      display: grid;
      width: 34px;
      height: 34px;
      place-items: center;
      border-radius: 8px;
      background: #eff6ff;
      color: #2563eb;
    }

    .row-icon.done {
      background: #ecfdf5;
      color: #059669;
    }

    .row-status {
      padding: 5px 9px;
      border-radius: 999px;
      background: #e2e8f0;
      color: #475569;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .row-status.submitted,
    .row-status.filed,
    .row-status.paid {
      background: #dcfce7;
      color: #166534;
    }

    .row-status.pending,
    .row-status.review,
    .row-status.upcoming,
    .row-status.due {
      background: #fef3c7;
      color: #92400e;
    }

    .row-status.attention,
    .row-status.overdue {
      background: #ffe4e6;
      color: #be123c;
    }

    .select-control {
      min-height: 38px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      padding: 0 12px;
      color: #334155;
      font-weight: 700;
    }

    .upload-zone {
      display: grid;
      min-height: 250px;
      place-items: center;
      padding: 28px;
      border: 2px dashed #93c5fd;
      border-radius: 10px;
      background: #eff6ff;
      color: #1d4ed8;
      text-align: center;
      cursor: pointer;
    }

    .upload-zone span {
      color: #475569;
      font-size: 13px;
    }

    .selected-files {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .selected-files span {
      padding: 6px 10px;
      border-radius: 999px;
      background: #e0f2fe;
      color: #075985;
      font-size: 12px;
      font-weight: 800;
    }

    .plain-list {
      display: grid;
      gap: 10px;
      margin: 14px 0 0;
      padding: 0;
      list-style: none;
      color: #475569;
      font-size: 14px;
    }

    .plain-list li {
      padding: 10px 12px;
      border-radius: 8px;
      background: #f8fafc;
    }

    .tax-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .tax-grid div {
      padding: 18px;
      border-radius: 10px;
      background: #f8fafc;
    }

    .tax-grid span {
      color: #64748b;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .tax-grid strong {
      display: block;
      margin-top: 10px;
      font-size: 24px;
      font-weight: 900;
    }

    .table-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 150px 120px auto;
    }

    .message-list article {
      padding: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
    }

    .message-list article > div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    .message-list p {
      margin: 10px 0;
      color: #475569;
      line-height: 1.6;
    }

    .message-list small,
    .message-list span {
      color: #64748b;
      font-weight: 700;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    @media (max-width: 1100px) {
      .client-portal {
        grid-template-columns: 1fr;
      }

      .portal-rail {
        position: static;
        padding: 18px;
      }

      .portal-nav {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }

      .rail-card {
        display: none;
      }

      .overview-grid,
      .content-grid {
        grid-template-columns: 1fr;
      }

      .metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 720px) {
      .portal-main {
        padding: 16px;
      }

      .portal-topbar,
      .hero-panel,
      .panel-header {
        align-items: flex-start;
        flex-direction: column;
      }

      .portal-nav {
        grid-template-columns: 1fr;
      }

      .metrics-grid,
      .tax-grid {
        grid-template-columns: 1fr;
      }

      .table-row {
        grid-template-columns: 1fr;
        align-items: flex-start;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientPortalComponent {
  private readonly auth = inject(AuthService);

  readonly activeTab = signal<PortalTab>('overview');
  readonly selectedFiles = signal<string[]>([]);
  uploadType = 'Sales invoices';

  readonly clientName = computed(() => this.auth.currentUser()?.name || 'Client firm');

  readonly navItems: PortalNavItem[] = [
    { id: 'overview', label: 'Overview', icon: 'heroSquares2x2Solid' },
    { id: 'documents', label: 'Documents', icon: 'heroArrowUpTraySolid' },
    { id: 'tax', label: 'GST & Tax', icon: 'heroReceiptPercentSolid' },
    { id: 'billing', label: 'Invoices', icon: 'heroBanknotesSolid' },
    { id: 'messages', label: 'Messages', icon: 'heroChatBubbleLeftRightSolid' },
  ];

  readonly metrics: PortalMetric[] = [
    { label: 'Pending documents', value: '7', caption: 'Needed for current filing', icon: 'heroClipboardDocumentCheckSolid', tone: 'amber' },
    { label: 'Filed returns', value: '11/12', caption: 'Current financial year', icon: 'heroCheckCircleSolid', tone: 'emerald' },
    { label: 'Invoice due', value: 'INR 18,500', caption: 'CA service invoice', icon: 'heroBanknotesSolid', tone: 'rose' },
    { label: 'Next deadline', value: '20 Jun', caption: 'GSTR-3B filing', icon: 'heroCalendarDaysSolid', tone: 'blue' },
  ];

  readonly checklist: ChecklistItem[] = [
    { title: 'April sales register', dueDate: '2026-06-05', status: 'pending' },
    { title: 'April purchase bills', dueDate: '2026-06-05', status: 'pending' },
    { title: 'Main bank statement', dueDate: '2026-06-07', status: 'review' },
    { title: 'TDS challan copy', dueDate: '2026-06-10', status: 'submitted' },
  ];

  readonly deadlines: DeadlineItem[] = [
    { title: 'GSTR-1', period: 'May 2026', dueDate: '2026-06-11', status: 'upcoming' },
    { title: 'GSTR-3B', period: 'May 2026', dueDate: '2026-06-20', status: 'attention' },
    { title: 'TDS Return', period: 'Q1 FY 2026-27', dueDate: '2026-07-31', status: 'upcoming' },
  ];

  readonly invoices: InvoiceItem[] = [
    { number: 'INV-2026-0042', date: '2026-05-05', amount: 18500, status: 'due' },
    { number: 'INV-2026-0038', date: '2026-04-05', amount: 18500, status: 'paid' },
  ];

  readonly messages: MessageItem[] = [
    {
      from: 'CA Team',
      subject: 'April purchase bills pending',
      body: 'Please upload purchase bills and bank statement so we can complete GST reconciliation.',
      time: 'Today',
    },
    {
      from: 'Accounts Desk',
      subject: 'Invoice payment reminder',
      body: 'Your May service invoice is due. Receipt will be available here after payment confirmation.',
      time: 'Yesterday',
    },
  ];

  setTab(tab: PortalTab): void {
    this.activeTab.set(tab);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).map((file) => file.name);
    this.selectedFiles.set(files);
  }

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ');
  }

  logout(): void {
    this.auth.logout();
  }
}

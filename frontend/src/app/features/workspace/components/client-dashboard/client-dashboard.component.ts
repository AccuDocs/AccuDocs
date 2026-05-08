import { Component, Input, inject, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowPathSolid,
  heroCalculatorSolid,
  heroCheckCircleSolid,
  heroClockSolid,
  heroDocumentTextSolid,
  heroExclamationTriangleSolid,
  heroXCircleSolid,
} from '@ng-icons/heroicons/solid';
import { Chart, registerables } from 'chart.js';

import { AnalyticsMonth, DashboardSummary, DataService, GstSummaryRow } from '@core/services/data.service';
import { ToastService } from '@core/services/toast.service';

Chart.register(...registerables);

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DecimalPipe, DatePipe],
  providers: [
    provideIcons({
      heroArrowPathSolid,
      heroCalculatorSolid,
      heroCheckCircleSolid,
      heroClockSolid,
      heroDocumentTextSolid,
      heroExclamationTriangleSolid,
      heroXCircleSolid,
    }),
  ],
  template: `
    <div class="gst-dashboard-page space-y-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-[28px] font-black leading-none tracking-normal text-slate-950">GST Dashboard</h1>
          <p class="mt-2 text-sm font-medium leading-5 text-slate-500">
            FY {{ selectedFY }} - {{ summary()?.client?.businessName || 'Loading...' }}
          </p>
          <div class="mt-3 h-[3px] w-10 rounded-full bg-indigo-600"></div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <select
            [(ngModel)]="selectedFY"
            (ngModelChange)="loadAll()"
            class="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition-all focus:border-indigo-500"
          >
            @for (fy of financialYears; track fy) {
              <option [value]="fy">FY {{ fy }}</option>
            }
          </select>

          <button
            (click)="computeGST()"
            [disabled]="computing()"
            class="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
          >
            <ng-icon
              [name]="computing() ? 'heroArrowPathSolid' : 'heroCalculatorSolid'"
              size="18"
              [class]="computing() ? 'animate-spin' : ''"
            ></ng-icon>
            {{ computing() ? 'Computing...' : 'Compute GST' }}
          </button>
        </div>
      </header>

      @if (summary()) {
        <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article class="summary-card">
            <p class="metric-label">Total Sales</p>
            <h2 class="metric-value text-slate-950">INR {{ summary()!.cards.totalSales | number:'1.0-0' }}</h2>
            <p class="metric-helper text-emerald-600">{{ summary()!.salesBreakdown.count }} invoices</p>
          </article>

          <article class="summary-card">
            <p class="metric-label">Total Purchases</p>
            <h2 class="metric-value text-slate-950">INR {{ summary()!.cards.totalPurchases | number:'1.0-0' }}</h2>
            <p class="metric-helper text-sky-600">{{ summary()!.purchasesBreakdown.count }} bills</p>
          </article>

          <article class="summary-card">
            <p class="metric-label">Total Expenses</p>
            <h2 class="metric-value text-slate-950">INR {{ summary()!.cards.totalExpenses | number:'1.0-0' }}</h2>
            <p class="metric-helper text-rose-600">{{ summary()!.expensesBreakdown.count }} entries</p>
          </article>

          <article class="summary-card">
            <p class="metric-label">Output GST</p>
            <h2 class="metric-value text-indigo-700">INR {{ summary()!.cards.outputGST | number:'1.0-0' }}</h2>
            <p class="metric-helper text-indigo-500">Tax collected</p>
          </article>

          <article class="summary-card">
            <p class="metric-label">Input ITC</p>
            <h2 class="metric-value text-emerald-700">INR {{ summary()!.cards.inputITC | number:'1.0-0' }}</h2>
            <p class="metric-helper text-emerald-500">Eligible credit</p>
          </article>

          <article class="summary-card">
            <p class="metric-label">Blocked ITC</p>
            <h2 class="metric-value text-amber-700">INR {{ summary()!.cards.blockedITC | number:'1.0-0' }}</h2>
            <p class="metric-helper text-amber-500">Non-claimable</p>
          </article>

          <article class="summary-card">
            <p class="metric-label">RCM Liability</p>
            <h2 class="metric-value text-violet-700">INR {{ summary()!.cards.rcmLiability | number:'1.0-0' }}</h2>
            <p class="metric-helper text-violet-500">Reverse charge</p>
          </article>

          <article class="summary-card">
            <p class="metric-label">Net GST Payable</p>
            <h2 class="metric-value text-red-700">INR {{ summary()!.cards.netGSTPayable | number:'1.0-0' }}</h2>
            <p class="metric-helper text-red-500">Due to govt</p>
          </article>
        </section>

        <section class="dashboard-panel p-5">
          <p class="section-label mb-4">Tax Split (Net Payable)</p>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div class="rounded-lg bg-blue-50 p-4 text-center">
              <p class="split-label text-blue-500">CGST</p>
              <p class="split-value text-blue-700">INR {{ summary()!.taxSplit.cgst | number:'1.0-0' }}</p>
            </div>
            <div class="rounded-lg bg-blue-50 p-4 text-center">
              <p class="split-label text-blue-500">SGST</p>
              <p class="split-value text-blue-700">INR {{ summary()!.taxSplit.sgst | number:'1.0-0' }}</p>
            </div>
            <div class="rounded-lg bg-violet-50 p-4 text-center">
              <p class="split-label text-violet-500">IGST</p>
              <p class="split-value text-violet-700">INR {{ summary()!.taxSplit.igst | number:'1.0-0' }}</p>
            </div>
          </div>
        </section>
      } @else {
        <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @for (item of skeletonCards; track item) {
            <article class="summary-card">
              <div class="skeleton h-3 w-24 rounded"></div>
              <div class="skeleton mt-4 h-7 w-32 rounded"></div>
              <div class="skeleton mt-3 h-3 w-20 rounded"></div>
            </article>
          }
        </section>
      }

      <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article class="dashboard-panel p-5">
          <p class="section-label mb-4">Monthly Revenue & GST</p>
          <div class="h-[280px]">
            <canvas id="revenueChart"></canvas>
          </div>
        </article>

        <article class="dashboard-panel p-5">
          <p class="section-label mb-4">GST Payable Trend</p>
          <div class="h-[280px]">
            <canvas id="gstPayableChart"></canvas>
          </div>
        </article>
      </section>

      <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        @if (summary()) {
          <article class="dashboard-panel p-5">
            <p class="section-label mb-4">Sales Breakdown</p>
            <div class="space-y-3">
              <div class="breakdown-row bg-blue-50">
                <div class="flex items-center gap-3">
                  <span class="breakdown-pill bg-blue-100 text-blue-700">B2B</span>
                  <p class="text-sm font-bold text-slate-700">{{ summary()!.salesBreakdown.b2b.count }} invoices</p>
                </div>
                <p class="font-mono text-sm font-black text-slate-950">INR {{ summary()!.salesBreakdown.b2b.value | number:'1.0-0' }}</p>
              </div>

              <div class="breakdown-row bg-purple-50">
                <div class="flex items-center gap-3">
                  <span class="breakdown-pill bg-purple-100 text-purple-700">B2C</span>
                  <p class="text-sm font-bold text-slate-700">{{ summary()!.salesBreakdown.b2c.count }} invoices</p>
                </div>
                <p class="font-mono text-sm font-black text-slate-950">INR {{ summary()!.salesBreakdown.b2c.value | number:'1.0-0' }}</p>
              </div>

              <div class="breakdown-row bg-teal-50">
                <div class="flex items-center gap-3">
                  <span class="breakdown-pill bg-teal-100 text-teal-700">Export</span>
                  <p class="text-sm font-bold text-slate-700">{{ summary()!.salesBreakdown.export.count }} invoices</p>
                </div>
                <p class="font-mono text-sm font-black text-slate-950">INR {{ summary()!.salesBreakdown.export.value | number:'1.0-0' }}</p>
              </div>
            </div>
          </article>
        }

        <article class="dashboard-panel p-5">
          <p class="section-label mb-4">GSTR Filing Status</p>
          <div class="max-h-[220px] space-y-2 overflow-y-auto">
            @for (r of returns(); track r.id) {
              <div class="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50">
                <div class="flex items-center gap-3">
                  <ng-icon
                    [name]="r.status === 'filed' ? 'heroCheckCircleSolid' : r.status === 'overdue' ? 'heroXCircleSolid' : 'heroClockSolid'"
                    size="18"
                    [class]="r.status === 'filed' ? 'text-emerald-500' : r.status === 'overdue' ? 'text-red-500' : 'text-amber-500'"
                  ></ng-icon>
                  <div>
                    <p class="text-sm font-black text-slate-800">{{ r.returnType }}</p>
                    <p class="text-[10px] font-bold text-slate-400">{{ getMonthName(r.periodMonth) }} {{ r.periodYear }}</p>
                  </div>
                </div>
                <span
                  class="rounded-full px-2.5 py-1 text-[10px] font-black uppercase"
                  [ngClass]="{
                    'bg-emerald-50 text-emerald-700': r.status === 'filed',
                    'bg-amber-50 text-amber-700': r.status === 'draft' || r.status === 'pending',
                    'bg-red-50 text-red-700': r.status === 'overdue'
                  }"
                >
                  {{ r.status }}
                </span>
              </div>
            } @empty {
              <div class="py-10 text-center text-slate-400">
                <ng-icon name="heroDocumentTextSolid" size="32" class="mb-2 opacity-30"></ng-icon>
                <p class="text-xs font-bold">No return records yet</p>
              </div>
            }
          </div>
        </article>
      </section>

      @if (alerts().length > 0) {
        <section class="dashboard-panel p-5">
          <div class="mb-4 flex items-center justify-between">
            <p class="section-label">Validation Alerts</p>
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700">{{ errorCount() }} errors</span>
              <span class="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">{{ warningCount() }} warnings</span>
            </div>
          </div>

          <div class="max-h-[250px] space-y-2 overflow-y-auto">
            @for (a of alerts().slice(0, 20); track a.id) {
              <div
                class="flex items-start gap-3 rounded-lg border border-slate-100 p-3"
                [ngClass]="a.severity === 'error' ? 'bg-red-50/50' : 'bg-amber-50/50'"
              >
                <ng-icon
                  [name]="a.severity === 'error' ? 'heroXCircleSolid' : 'heroExclamationTriangleSolid'"
                  size="16"
                  [class]="a.severity === 'error' ? 'text-red-500 mt-0.5' : 'text-amber-500 mt-0.5'"
                ></ng-icon>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-bold text-slate-800">{{ a.message }}</p>
                  <p class="mt-0.5 text-[10px] font-bold text-slate-400">{{ a.entityType }} - {{ a.errorType }}</p>
                </div>
              </div>
            }
          </div>
        </section>
      }

      <section class="dashboard-panel p-5">
        <p class="section-label mb-4">Recent Activity</p>
        <div class="max-h-[200px] space-y-3 overflow-y-auto">
          @for (log of activity(); track log.id) {
            <div class="flex items-center gap-3 text-sm">
              <div class="h-2 w-2 shrink-0 rounded-full bg-indigo-500"></div>
              <p class="flex-1 font-bold text-slate-700">{{ formatAction(log.action) }}</p>
              <p class="font-mono text-[10px] text-slate-400">{{ log.createdAt | date:'dd MMM, HH:mm' }}</p>
            </div>
          } @empty {
            <p class="py-4 text-center text-sm font-bold text-slate-400">No recent activity</p>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100%;
    }

    .gst-dashboard-page {
      --panel-border: #dbe4ef;
      --panel-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
      color: #0f172a;
    }

    .dashboard-panel,
    .summary-card {
      background: #ffffff;
      border: 1px solid var(--panel-border);
      border-radius: 12px;
      box-shadow: var(--panel-shadow);
    }

    .summary-card {
      min-height: 100px;
      padding: 18px 20px;
    }

    .metric-label,
    .section-label,
    .split-label {
      color: #94a3b8;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.16em;
      line-height: 1.2;
      text-transform: uppercase;
    }

    .metric-value {
      margin-top: 12px;
      font-family: var(--font-mono);
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0;
      line-height: 1.15;
    }

    .metric-helper {
      margin-top: 8px;
      font-size: 10px;
      font-weight: 900;
      line-height: 1.2;
    }

    .split-value {
      margin-top: 8px;
      font-family: var(--font-mono);
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0;
      line-height: 1.2;
    }

    .breakdown-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-radius: 10px;
      padding: 12px;
    }

    .breakdown-pill {
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 900;
      line-height: 1;
      text-transform: uppercase;
    }
  `],
})
export class ClientDashboardComponent implements OnInit, OnChanges {
  @Input() clientId = '';

  private dataService = inject(DataService);
  private toast = inject(ToastService);

  summary = signal<DashboardSummary | null>(null);
  analytics = signal<AnalyticsMonth[]>([]);
  returns = signal<any[]>([]);
  alerts = signal<any[]>([]);
  activity = signal<any[]>([]);
  computing = signal(false);
  errorCount = signal(0);
  warningCount = signal(0);

  selectedFY = '';
  financialYears: string[] = [];
  skeletonCards = Array.from({ length: 8 }, (_, index) => index);

  private revenueChart: Chart | null = null;
  private gstPayableChart: Chart | null = null;
  private fallbackKey = '';

  monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  ngOnInit() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    this.selectedFY = m >= 4 ? `${y}-${(y + 1).toString().slice(2)}` : `${y - 1}-${y.toString().slice(2)}`;

    for (let i = 0; i < 5; i++) {
      const yr = y - i;
      this.financialYears.push(`${yr}-${(yr + 1).toString().slice(2)}`);
    }

    if (!this.financialYears.includes(this.selectedFY)) {
      this.financialYears.unshift(this.selectedFY);
    }

    this.loadAll();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['clientId'] && this.clientId) {
      this.loadAll();
    }
  }

  loadAll() {
    if (!this.clientId) return;

    this.fallbackKey = '';
    this.summary.set(null);
    this.analytics.set([]);

    this.loadSummary();
    this.loadAnalytics();
    this.loadReturns();
    this.loadAlerts();
    this.loadActivity();
  }

  loadSummary() {
    this.dataService.getDashboardSummary(this.clientId, this.selectedFY).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.summary.set(res.data);
        } else {
          this.loadDashboardFallback();
        }
      },
      error: () => this.loadDashboardFallback(),
    });
  }

  loadAnalytics() {
    this.dataService.getDashboardAnalytics(this.clientId, this.selectedFY).subscribe({
      next: (res: any) => {
        if (res.success) {
          const months = res.data?.months || [];
          this.analytics.set(months);
          if (months.length === 0) {
            this.loadDashboardFallback();
          }
          setTimeout(() => this.renderCharts(), 100);
        }
      },
      error: () => this.loadDashboardFallback(),
    });
  }

  loadReturns() {
    this.dataService.getReturnStatus(this.clientId, this.selectedFY).subscribe({
      next: (res: any) => {
        if (res.success) this.returns.set(res.data || []);
      },
      error: () => {},
    });
  }

  loadAlerts() {
    this.dataService.getAlerts(this.clientId, this.selectedFY).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.alerts.set(res.data.items || []);
          this.errorCount.set(res.data.errorCount || 0);
          this.warningCount.set(res.data.warningCount || 0);
        }
      },
      error: () => {},
    });
  }

  loadActivity() {
    this.dataService.getActivity(this.clientId).subscribe({
      next: (res: any) => {
        if (res.success) this.activity.set(res.data || []);
      },
      error: () => {},
    });
  }

  computeGST() {
    this.computing.set(true);
    this.dataService.computeGST(this.clientId, this.selectedFY).subscribe({
      next: (res: any) => {
        this.computing.set(false);
        if (res.success) {
          this.toast.success('GST computed successfully');
          this.loadAll();
        }
      },
      error: (err) => {
        this.computing.set(false);
        this.toast.error('Computation failed', err.message);
      },
    });
  }

  getMonthName(month: number): string {
    return this.monthNames[month] || '';
  }

  formatAction(action: string): string {
    return String(action || 'Activity').replace(/_/g, ' ');
  }

  renderCharts() {
    const data = this.analytics();

    if (this.revenueChart) this.revenueChart.destroy();
    if (this.gstPayableChart) this.gstPayableChart.destroy();

    if (data.length === 0) return;

    const labels = data.map((item) => this.monthNames[item.month]);
    const revenueCanvas = document.getElementById('revenueChart') as HTMLCanvasElement | null;
    const gstCanvas = document.getElementById('gstPayableChart') as HTMLCanvasElement | null;

    if (revenueCanvas) {
      this.revenueChart = new Chart(revenueCanvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Sales',
              data: data.map((item) => item.totalSales),
              backgroundColor: 'rgba(16, 185, 129, 0.72)',
              borderRadius: 6,
              barPercentage: 0.6,
            },
            {
              label: 'Purchases',
              data: data.map((item) => item.totalPurchases),
              backgroundColor: 'rgba(59, 130, 246, 0.72)',
              borderRadius: 6,
              barPercentage: 0.6,
            },
            {
              label: 'Output GST',
              data: data.map((item) => item.outputGST),
              backgroundColor: 'rgba(99, 102, 241, 0.5)',
              borderRadius: 6,
              barPercentage: 0.6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } },
          },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(15, 23, 42, 0.05)' }, ticks: { font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } },
          },
        },
      });
    }

    if (gstCanvas) {
      this.gstPayableChart = new Chart(gstCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'GST Payable',
              data: data.map((item) => item.gstPayable),
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              fill: true,
              tension: 0.35,
              borderWidth: 2,
              pointRadius: 4,
              pointBackgroundColor: 'rgb(239, 68, 68)',
            },
            {
              label: 'Output GST',
              data: data.map((item) => item.outputGST),
              borderColor: 'rgb(99, 102, 241)',
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderDash: [4, 4],
              tension: 0.35,
              pointRadius: 3,
            },
            {
              label: 'Input ITC',
              data: data.map((item) => item.inputGST),
              borderColor: 'rgb(16, 185, 129)',
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderDash: [4, 4],
              tension: 0.35,
              pointRadius: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } },
          },
          scales: {
            y: { grid: { color: 'rgba(15, 23, 42, 0.05)' }, ticks: { font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } },
          },
        },
      });
    }
  }

  private loadDashboardFallback() {
    const key = `${this.clientId}:${this.selectedFY}`;
    if (!this.clientId || this.fallbackKey === key) return;

    this.fallbackKey = key;

    this.dataService.getGstSummary(this.clientId, this.selectedFY).subscribe({
      next: (res: any) => {
        if (!res.success) return;

        const rows = (res.data || []) as GstSummaryRow[];

        if (!this.summary()) {
          this.summary.set(this.toFallbackSummary(rows));
        }

        if (this.analytics().length === 0) {
          this.analytics.set(this.toAnalytics(rows));
          setTimeout(() => this.renderCharts(), 100);
        }
      },
      error: () => {},
    });
  }

  private toFallbackSummary(rows: GstSummaryRow[]): DashboardSummary {
    const totalSales = this.sum(rows, 'total_sales');
    const totalPurchases = this.sum(rows, 'total_purchases');
    const totalExpenses = this.sum(rows, 'total_expenses');
    const outputGST = this.sum(rows, 'output_gst');
    const inputITC = this.sum(rows, 'input_gst') + this.sum(rows, 'expense_itc');
    const expenseGST = this.sum(rows, 'expense_gst');
    const blockedITC = Math.max(0, expenseGST - this.sum(rows, 'expense_itc'));

    return {
      client: {
        id: this.clientId,
        name: 'Client',
        businessName: 'Client Workspace',
        gstin: '',
        stateCode: '',
      },
      financialYear: this.selectedFY,
      cards: {
        totalSales,
        totalPurchases,
        totalExpenses,
        outputGST,
        inputITC,
        blockedITC,
        rcmLiability: 0,
        netGSTPayable: this.sum(rows, 'gst_payable'),
      },
      salesBreakdown: {
        count: rows.filter((row) => Number(row.total_sales) > 0).length,
        b2b: { count: 0, value: totalSales },
        b2c: { count: 0, value: 0 },
        export: { count: 0, value: 0 },
      },
      purchasesBreakdown: {
        count: rows.filter((row) => Number(row.total_purchases) > 0).length,
        itcEligible: { count: 0, value: inputITC },
        itcBlocked: { count: 0, value: blockedITC },
        rcm: { count: 0, value: 0 },
      },
      expensesBreakdown: {
        count: rows.filter((row) => Number(row.total_expenses) > 0).length,
        gstApplicable: rows.filter((row) => Number(row.expense_gst) > 0).length,
        nonGst: 0,
        itcBlocked: blockedITC,
      },
      taxSplit: {
        cgst: this.sum(rows, 'output_cgst') - this.sum(rows, 'input_cgst'),
        sgst: this.sum(rows, 'output_sgst') - this.sum(rows, 'input_sgst'),
        igst: this.sum(rows, 'output_igst') - this.sum(rows, 'input_igst'),
      },
      validationErrorCount: 0,
    };
  }

  private toAnalytics(rows: GstSummaryRow[]): AnalyticsMonth[] {
    return rows.map((row) => ({
      month: row.month,
      totalSales: Number(row.total_sales || 0),
      outputGST: Number(row.output_gst || 0),
      outputCGST: Number(row.output_cgst || 0),
      outputSGST: Number(row.output_sgst || 0),
      outputIGST: Number(row.output_igst || 0),
      totalPurchases: Number(row.total_purchases || 0),
      inputGST: Number(row.input_gst || 0),
      inputCGST: Number(row.input_cgst || 0),
      inputSGST: Number(row.input_sgst || 0),
      inputIGST: Number(row.input_igst || 0),
      gstPayable: Number(row.gst_payable || 0),
      totalExpenses: Number(row.total_expenses || 0),
      expenseGST: Number(row.expense_gst || 0),
      expenseITC: Number(row.expense_itc || 0),
    }));
  }

  private sum(rows: GstSummaryRow[], key: keyof GstSummaryRow): number {
    return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
  }
}

import { Component, Input, inject, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroCurrencyRupeeSolid, heroReceiptPercentSolid, heroShieldCheckSolid,
  heroExclamationTriangleSolid, heroChartBarSolid, heroArrowTrendingUpSolid,
  heroArrowTrendingDownSolid, heroClockSolid, heroCheckCircleSolid,
  heroXCircleSolid, heroBoltSolid, heroArrowPathSolid, heroDocumentTextSolid,
  heroShoppingCartSolid, heroBanknotesSolid, heroCalculatorSolid
} from '@ng-icons/heroicons/solid';
import { DataService, DashboardSummary, AnalyticsMonth } from '@core/services/data.service';
import { ToastService } from '@core/services/toast.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DecimalPipe, DatePipe],
  providers: [
    provideIcons({
      heroCurrencyRupeeSolid, heroReceiptPercentSolid, heroShieldCheckSolid,
      heroExclamationTriangleSolid, heroChartBarSolid, heroArrowTrendingUpSolid,
      heroArrowTrendingDownSolid, heroClockSolid, heroCheckCircleSolid,
      heroXCircleSolid, heroBoltSolid, heroArrowPathSolid, heroDocumentTextSolid,
      heroShoppingCartSolid, heroBanknotesSolid, heroCalculatorSolid
    })
  ],
  template: `
    <div class="space-y-6 animate-in fade-in duration-500">
      <!-- Dashboard Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-[28px] font-bold text-slate-900 tracking-tight">GST Dashboard</h1>
          <p class="text-sm text-slate-500 font-medium">FY {{ selectedFY }} · {{ summary()?.client?.businessName || 'Loading...' }}</p>
          <div class="w-10 h-[3px] bg-indigo-600 rounded-full mt-2"></div>
        </div>
        <div class="flex items-center gap-3">
          <select [(ngModel)]="selectedFY" (ngModelChange)="loadAll()" class="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer">
            @for (fy of financialYears; track fy) { <option [value]="fy">FY {{ fy }}</option> }
          </select>
          <button (click)="computeGST()" [disabled]="computing()" class="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50">
            <ng-icon [name]="computing() ? 'heroArrowPathSolid' : 'heroCalculatorSolid'" size="18" [class]="computing() ? 'animate-spin' : ''"></ng-icon>
            {{ computing() ? 'Computing...' : 'Compute GST' }}
          </button>
        </div>
      </div>

      <!-- 8 Summary Cards -->
      @if (summary()) {
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="dash-card group border-l-4 border-l-emerald-500">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Sales</p>
            <h3 class="text-xl font-bold text-slate-900 mt-1 font-mono">₹{{ summary()!.cards.totalSales | number:'1.0-0' }}</h3>
            <p class="text-[10px] text-emerald-600 font-bold mt-1">{{ summary()!.salesBreakdown.count }} invoices</p>
          </div>
          <div class="dash-card group border-l-4 border-l-sky-500">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Purchases</p>
            <h3 class="text-xl font-bold text-slate-900 mt-1 font-mono">₹{{ summary()!.cards.totalPurchases | number:'1.0-0' }}</h3>
            <p class="text-[10px] text-sky-600 font-bold mt-1">{{ summary()!.purchasesBreakdown.count }} bills</p>
          </div>
          <div class="dash-card group border-l-4 border-l-rose-500">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Expenses</p>
            <h3 class="text-xl font-bold text-slate-900 mt-1 font-mono">₹{{ summary()!.cards.totalExpenses | number:'1.0-0' }}</h3>
            <p class="text-[10px] text-rose-600 font-bold mt-1">{{ summary()!.expensesBreakdown.count }} entries</p>
          </div>
          <div class="dash-card group border-l-4 border-l-indigo-500">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Output GST</p>
            <h3 class="text-xl font-bold text-indigo-700 mt-1 font-mono">₹{{ summary()!.cards.outputGST | number:'1.0-0' }}</h3>
            <p class="text-[10px] text-indigo-500 font-bold mt-1">Tax collected</p>
          </div>
          <div class="dash-card group border-l-4 border-l-emerald-500">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input ITC</p>
            <h3 class="text-xl font-bold text-emerald-700 mt-1 font-mono">₹{{ summary()!.cards.inputITC | number:'1.0-0' }}</h3>
            <p class="text-[10px] text-emerald-500 font-bold mt-1">Eligible credit</p>
          </div>
          <div class="dash-card group border-l-4 border-l-amber-500">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Blocked ITC</p>
            <h3 class="text-xl font-bold text-amber-700 mt-1 font-mono">₹{{ summary()!.cards.blockedITC | number:'1.0-0' }}</h3>
            <p class="text-[10px] text-amber-500 font-bold mt-1">Non-claimable</p>
          </div>
          <div class="dash-card group border-l-4 border-l-violet-500">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RCM Liability</p>
            <h3 class="text-xl font-bold text-violet-700 mt-1 font-mono">₹{{ summary()!.cards.rcmLiability | number:'1.0-0' }}</h3>
            <p class="text-[10px] text-violet-500 font-bold mt-1">Reverse charge</p>
          </div>
          <div class="dash-card group border-l-4 border-l-red-500 bg-gradient-to-r from-red-50/50 to-white">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net GST Payable</p>
            <h3 class="text-xl font-bold text-red-700 mt-1 font-mono">₹{{ summary()!.cards.netGSTPayable | number:'1.0-0' }}</h3>
            <p class="text-[10px] text-red-500 font-bold mt-1">Due to govt</p>
          </div>
        </div>

        <!-- Tax Split Bar -->
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Tax Split (Net Payable)</p>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center p-3 bg-blue-50 rounded-lg">
              <p class="text-[10px] font-bold text-blue-500 uppercase">CGST</p>
              <p class="text-lg font-bold font-mono text-blue-700 mt-1">₹{{ summary()!.taxSplit.cgst | number:'1.0-0' }}</p>
            </div>
            <div class="text-center p-3 bg-blue-50 rounded-lg">
              <p class="text-[10px] font-bold text-blue-500 uppercase">SGST</p>
              <p class="text-lg font-bold font-mono text-blue-700 mt-1">₹{{ summary()!.taxSplit.sgst | number:'1.0-0' }}</p>
            </div>
            <div class="text-center p-3 bg-violet-50 rounded-lg">
              <p class="text-[10px] font-bold text-violet-500 uppercase">IGST</p>
              <p class="text-lg font-bold font-mono text-violet-700 mt-1">₹{{ summary()!.taxSplit.igst | number:'1.0-0' }}</p>
            </div>
          </div>
        </div>
      }

      <!-- Charts Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Monthly Revenue & GST</p>
          <div class="h-[280px]">
            <canvas id="revenueChart"></canvas>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">GST Payable Trend</p>
          <div class="h-[280px]">
            <canvas id="gstPayableChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Sales Breakdown + GSTR Return Status -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Sales Type Breakdown -->
        @if (summary()) {
          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Sales Breakdown</p>
            <div class="space-y-3">
              <div class="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <span class="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">B2B</span>
                  <p class="text-sm font-medium text-slate-700">{{ summary()!.salesBreakdown.b2b.count }} invoices</p>
                </div>
                <p class="text-sm font-mono font-bold text-slate-900">₹{{ summary()!.salesBreakdown.b2b.value | number:'1.0-0' }}</p>
              </div>
              <div class="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <span class="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">B2C</span>
                  <p class="text-sm font-medium text-slate-700">{{ summary()!.salesBreakdown.b2c.count }} invoices</p>
                </div>
                <p class="text-sm font-mono font-bold text-slate-900">₹{{ summary()!.salesBreakdown.b2c.value | number:'1.0-0' }}</p>
              </div>
              <div class="flex items-center justify-between p-3 bg-teal-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <span class="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">Export</span>
                  <p class="text-sm font-medium text-slate-700">{{ summary()!.salesBreakdown.export.count }} invoices</p>
                </div>
                <p class="text-sm font-mono font-bold text-slate-900">₹{{ summary()!.salesBreakdown.export.value | number:'1.0-0' }}</p>
              </div>
            </div>
          </div>
        }

        <!-- GSTR Return Status -->
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">GSTR Filing Status</p>
          <div class="space-y-2 max-h-[200px] overflow-y-auto">
            @for (r of returns(); track r.id) {
              <div class="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                <div class="flex items-center gap-3">
                  <ng-icon [name]="r.status === 'filed' ? 'heroCheckCircleSolid' : r.status === 'overdue' ? 'heroXCircleSolid' : 'heroClockSolid'" size="18"
                    [class]="r.status === 'filed' ? 'text-emerald-500' : r.status === 'overdue' ? 'text-red-500' : 'text-amber-500'"
                  ></ng-icon>
                  <div>
                    <p class="text-sm font-bold text-slate-800">{{ r.returnType }}</p>
                    <p class="text-[10px] text-slate-400">{{ getMonthName(r.periodMonth) }} {{ r.periodYear }}</p>
                  </div>
                </div>
                <span class="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase"
                  [ngClass]="{
                    'bg-emerald-50 text-emerald-700': r.status === 'filed',
                    'bg-amber-50 text-amber-700': r.status === 'draft' || r.status === 'pending',
                    'bg-red-50 text-red-700': r.status === 'overdue'
                  }"
                >{{ r.status }}</span>
              </div>
            }
            @if (returns().length === 0) {
              <div class="text-center py-8 text-slate-400">
                <ng-icon name="heroDocumentTextSolid" size="32" class="mb-2 opacity-30"></ng-icon>
                <p class="text-xs font-medium">No return records yet</p>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Validation Alerts -->
      @if (alerts().length > 0) {
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validation Alerts</p>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{{ errorCount() }} errors</span>
              <span class="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{{ warningCount() }} warnings</span>
            </div>
          </div>
          <div class="space-y-2 max-h-[250px] overflow-y-auto">
            @for (a of alerts().slice(0, 20); track a.id) {
              <div class="flex items-start gap-3 p-3 rounded-lg border border-slate-100"
                [ngClass]="a.severity === 'error' ? 'bg-red-50/50' : 'bg-amber-50/50'">
                <ng-icon [name]="a.severity === 'error' ? 'heroXCircleSolid' : 'heroExclamationTriangleSolid'" size="16"
                  [class]="a.severity === 'error' ? 'text-red-500 mt-0.5' : 'text-amber-500 mt-0.5'"
                ></ng-icon>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-slate-800 font-medium">{{ a.message }}</p>
                  <p class="text-[10px] text-slate-400 mt-0.5">{{ a.entityType }} · {{ a.errorType }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Activity Log -->
      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Recent Activity</p>
        <div class="space-y-3 max-h-[200px] overflow-y-auto">
          @for (log of activity(); track log.id) {
            <div class="flex items-center gap-3 text-sm">
              <div class="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>
              <p class="text-slate-700 font-medium flex-1">{{ log.action.replace('_', ' ') }}</p>
              <p class="text-[10px] text-slate-400 font-mono">{{ log.createdAt | date:'dd MMM, HH:mm' }}</p>
            </div>
          }
          @if (activity().length === 0) {
            <p class="text-center text-sm text-slate-400 py-4">No recent activity</p>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dash-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      transition: all 0.2s ease;
    }
    .dash-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.07);
      transform: translateY(-1px);
    }
  `]
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

  private revenueChart: Chart | null = null;
  private gstPayableChart: Chart | null = null;

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
    if (!this.financialYears.includes(this.selectedFY)) this.financialYears.unshift(this.selectedFY);
    this.loadAll();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['clientId'] && this.clientId) this.loadAll();
  }

  loadAll() {
    if (!this.clientId) return;
    this.loadSummary();
    this.loadAnalytics();
    this.loadReturns();
    this.loadAlerts();
    this.loadActivity();
  }

  loadSummary() {
    this.dataService.getDashboardSummary(this.clientId, this.selectedFY).subscribe({
      next: (res: any) => { if (res.success) this.summary.set(res.data); },
      error: () => {} // silent — if endpoint not deployed yet, dashboard still works
    });
  }

  loadAnalytics() {
    this.dataService.getDashboardAnalytics(this.clientId, this.selectedFY).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.analytics.set(res.data.months || []);
          setTimeout(() => this.renderCharts(), 100);
        }
      },
      error: () => {}
    });
  }

  loadReturns() {
    this.dataService.getReturnStatus(this.clientId, this.selectedFY).subscribe({
      next: (res: any) => { if (res.success) this.returns.set(res.data || []); },
      error: () => {}
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
      error: () => {}
    });
  }

  loadActivity() {
    this.dataService.getActivity(this.clientId).subscribe({
      next: (res: any) => { if (res.success) this.activity.set(res.data || []); },
      error: () => {}
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
      }
    });
  }

  getMonthName(m: number): string {
    return this.monthNames[m] || '';
  }

  renderCharts() {
    const data = this.analytics();
    if (data.length === 0) return;

    const labels = data.map(d => this.monthNames[d.month]);

    // Destroy previous charts
    if (this.revenueChart) this.revenueChart.destroy();
    if (this.gstPayableChart) this.gstPayableChart.destroy();

    // Revenue Chart
    const revenueCanvas = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (revenueCanvas) {
      this.revenueChart = new Chart(revenueCanvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Sales',
              data: data.map(d => d.totalSales),
              backgroundColor: 'rgba(16, 185, 129, 0.7)',
              borderRadius: 6,
              barPercentage: 0.6,
            },
            {
              label: 'Purchases',
              data: data.map(d => d.totalPurchases),
              backgroundColor: 'rgba(59, 130, 246, 0.7)',
              borderRadius: 6,
              barPercentage: 0.6,
            },
            {
              label: 'Output GST',
              data: data.map(d => d.outputGST),
              backgroundColor: 'rgba(99, 102, 241, 0.5)',
              borderRadius: 6,
              barPercentage: 0.6,
            },
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } }
          }
        }
      });
    }

    // GST Payable Chart
    const gstCanvas = document.getElementById('gstPayableChart') as HTMLCanvasElement;
    if (gstCanvas) {
      this.gstPayableChart = new Chart(gstCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'GST Payable',
              data: data.map(d => d.gstPayable),
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              fill: true,
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 4,
              pointBackgroundColor: 'rgb(239, 68, 68)',
            },
            {
              label: 'Output GST',
              data: data.map(d => d.outputGST),
              borderColor: 'rgb(99, 102, 241)',
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderDash: [4, 4],
              tension: 0.4,
              pointRadius: 3,
            },
            {
              label: 'Input ITC',
              data: data.map(d => d.inputGST),
              borderColor: 'rgb(16, 185, 129)',
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderDash: [4, 4],
              tension: 0.4,
              pointRadius: 3,
            },
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } }
          }
        }
      });
    }
  }
}

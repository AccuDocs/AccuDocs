import { Component, Input, inject, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroReceiptPercentSolid, heroCurrencyRupeeSolid,
  heroArrowTrendingUpSolid, heroArrowTrendingDownSolid,
  heroBanknotesSolid, heroChartBarSolid
} from '@ng-icons/heroicons/solid';
import { DataService, GstSummaryRow } from '@core/services/data.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-gst-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DecimalPipe],
  providers: [provideIcons({ heroReceiptPercentSolid, heroCurrencyRupeeSolid, heroArrowTrendingUpSolid, heroArrowTrendingDownSolid, heroBanknotesSolid, heroChartBarSolid })],
  template: `
    <div class="space-y-6 animate-in fade-in duration-500">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-[28px] font-bold text-slate-900 tracking-tight">GST Summary</h1>
          <p class="text-sm text-slate-500 font-medium">Computed monthly GST liability from sales & purchases data.</p>
          <div class="w-10 h-[3px] bg-indigo-600 rounded-full mt-2"></div>
        </div>
        <select
          [(ngModel)]="selectedFY"
          (ngModelChange)="loadData()"
          class="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
        >
          @for (fy of financialYears; track fy) {
            <option [value]="fy">FY {{ fy }}</option>
          }
        </select>
      </div>

      <!-- Top Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[13px] font-medium text-slate-500 mb-1">Total Sales</p>
              <h3 class="text-2xl font-bold text-slate-900">₹{{ totalSales() | number:'1.0-0' }}</h3>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroArrowTrendingUpSolid" size="24"></ng-icon>
            </div>
          </div>
        </div>
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[13px] font-medium text-slate-500 mb-1">Output GST</p>
              <h3 class="text-2xl font-bold text-indigo-700">₹{{ totalOutputGST() | number:'1.0-0' }}</h3>
              <p class="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-wider">Collected</p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroReceiptPercentSolid" size="24"></ng-icon>
            </div>
          </div>
        </div>
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[13px] font-medium text-slate-500 mb-1">Input GST</p>
              <h3 class="text-2xl font-bold text-amber-700">₹{{ totalInputGST() | number:'1.0-0' }}</h3>
              <p class="text-[10px] font-bold text-amber-600 mt-1 uppercase tracking-wider">Paid</p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroCurrencyRupeeSolid" size="24"></ng-icon>
            </div>
          </div>
        </div>
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[13px] font-medium text-slate-500 mb-1">GST Payable</p>
              <h3 class="text-2xl font-bold" [class]="totalPayable() >= 0 ? 'text-rose-700' : 'text-emerald-700'">
                {{ totalPayable() >= 0 ? '' : '−' }}₹{{ (totalPayable() >= 0 ? totalPayable() : -totalPayable()) | number:'1.0-0' }}
              </h3>
              <p class="text-[10px] font-bold mt-1 uppercase tracking-wider" [class]="totalPayable() >= 0 ? 'text-rose-600' : 'text-emerald-600'">
                {{ totalPayable() >= 0 ? 'Liability' : 'Refund' }}
              </p>
            </div>
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
              [class]="totalPayable() >= 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'">
              <ng-icon name="heroBanknotesSolid" size="24"></ng-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Monthly Breakdown Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Month</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Sales</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Output GST</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Purchases</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Input GST</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Expenses</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">GST Payable</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (row of rows(); track row.month) {
                <tr class="hover:bg-slate-50/50 transition-colors">
                  <td class="py-3.5 px-4 text-sm font-bold text-slate-900">{{ getMonthName(row.month) }}</td>
                  <td class="py-3.5 px-4 text-sm text-emerald-700 font-mono font-bold text-right">₹{{ row.total_sales | number:'1.0-0' }}</td>
                  <td class="py-3.5 px-4 text-sm text-indigo-700 font-mono font-bold text-right">₹{{ row.output_gst | number:'1.0-0' }}</td>
                  <td class="py-3.5 px-4 text-sm text-teal-700 font-mono font-bold text-right">₹{{ row.total_purchases | number:'1.0-0' }}</td>
                  <td class="py-3.5 px-4 text-sm text-amber-700 font-mono font-bold text-right">₹{{ row.input_gst | number:'1.0-0' }}</td>
                  <td class="py-3.5 px-4 text-sm text-rose-600 font-mono font-bold text-right">₹{{ row.total_expenses | number:'1.0-0' }}</td>
                  <td class="py-3.5 px-4 text-sm font-mono font-bold text-right" [class]="row.gst_payable >= 0 ? 'text-rose-700' : 'text-emerald-700'">
                    {{ row.gst_payable >= 0 ? '' : '−' }}₹{{ (row.gst_payable >= 0 ? row.gst_payable : -row.gst_payable) | number:'1.0-0' }}
                  </td>
                </tr>
              }
              @if (rows().length === 0) {
                <tr><td colspan="7" class="py-12 text-center">
                  <div class="flex flex-col items-center text-slate-400">
                    <ng-icon name="heroChartBarSolid" size="48" class="mb-4 opacity-20"></ng-icon>
                    <p class="font-bold">No GST data available</p>
                    <p class="text-xs mt-1">Add sales & purchase entries in the Data tab to see GST computations.</p>
                  </div>
                </td></tr>
              }
            </tbody>
            @if (rows().length > 0) {
              <tfoot>
                <tr class="bg-slate-100 border-t-2 border-slate-300">
                  <td class="py-3 px-4 text-xs font-bold text-slate-900 uppercase tracking-widest">FY Total</td>
                  <td class="py-3 px-4 text-sm font-mono font-bold text-emerald-800 text-right">₹{{ totalSales() | number:'1.0-0' }}</td>
                  <td class="py-3 px-4 text-sm font-mono font-bold text-indigo-800 text-right">₹{{ totalOutputGST() | number:'1.0-0' }}</td>
                  <td class="py-3 px-4 text-sm font-mono font-bold text-teal-800 text-right">₹{{ totalPurchases() | number:'1.0-0' }}</td>
                  <td class="py-3 px-4 text-sm font-mono font-bold text-amber-800 text-right">₹{{ totalInputGST() | number:'1.0-0' }}</td>
                  <td class="py-3 px-4 text-sm font-mono font-bold text-rose-700 text-right">₹{{ totalExpenses() | number:'1.0-0' }}</td>
                  <td class="py-3 px-4 text-sm font-mono font-bold text-right" [class]="totalPayable() >= 0 ? 'text-rose-800' : 'text-emerald-800'">
                    {{ totalPayable() >= 0 ? '' : '−' }}₹{{ (totalPayable() >= 0 ? totalPayable() : -totalPayable()) | number:'1.0-0' }}
                  </td>
                </tr>
              </tfoot>
            }
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`:host{display:block}.sa-card{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:all .2s ease}.sa-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08);transform:translateY(-1px)}`]
})
export class GstSummaryComponent implements OnInit {
  @Input() clientId = '';

  private dataService = inject(DataService);
  private toast = inject(ToastService);

  rows = signal<GstSummaryRow[]>([]);
  selectedFY = '';
  financialYears: string[] = [];

  totalSales = signal(0);
  totalOutputGST = signal(0);
  totalPurchases = signal(0);
  totalInputGST = signal(0);
  totalExpenses = signal(0);
  totalPayable = signal(0);

  private monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  ngOnInit() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    this.selectedFY = month >= 4 ? `${year}-${(year + 1).toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`;
    for (let i = 0; i < 5; i++) {
      const y = year - i;
      this.financialYears.push(`${y}-${(y + 1).toString().slice(2)}`);
    }
    this.loadData();
  }

  loadData() {
    if (!this.clientId) return;
    this.dataService.getGstSummary(this.clientId, this.selectedFY).subscribe({
      next: (res: any) => {
        if (res.success) {
          const data: GstSummaryRow[] = res.data || [];
          this.rows.set(data);
          this.totalSales.set(data.reduce((s, r) => s + r.total_sales, 0));
          this.totalOutputGST.set(data.reduce((s, r) => s + r.output_gst, 0));
          this.totalPurchases.set(data.reduce((s, r) => s + r.total_purchases, 0));
          this.totalInputGST.set(data.reduce((s, r) => s + r.input_gst, 0));
          this.totalExpenses.set(data.reduce((s, r) => s + r.total_expenses, 0));
          this.totalPayable.set(data.reduce((s, r) => s + r.gst_payable, 0));
        }
      },
      error: (err) => this.toast.error('Failed to load GST summary', err.message)
    });
  }

  getMonthName(m: number): string {
    return this.monthNames[m] || '';
  }
}

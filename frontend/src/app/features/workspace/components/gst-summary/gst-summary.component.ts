import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroReceiptPercentSolid, heroCurrencyRupeeSolid,
  heroArrowTrendingUpSolid, heroArrowTrendingDownSolid,
  heroBanknotesSolid, heroChartBarSolid,
  heroTruckSolid, heroSparklesSolid, heroVariableSolid, heroCalendarSolid
} from '@ng-icons/heroicons/solid';
import { DataService, GstSummaryRow } from '@core/services/data.service';
import { ToastService } from '@core/services/toast.service';
import { GstService } from '@core/services/gst.service';
import { Gstr1FormComponent } from '../../../gst-filing/components/gstr1-form/gstr1-form.component';
import { Gstr3bFormComponent } from '../../../gst-filing/components/gstr3b-form/gstr3b-form.component';
import { ItcTrackerComponent } from '../../../gst-filing/components/itc-tracker/itc-tracker.component';
import { Gstr2aReconcileComponent } from '../../../gst-filing/components/gstr2a-reconcile/gstr2a-reconcile.component';
import { EwayBillComponent } from '../../../gst-filing/components/eway-bill/eway-bill.component';
import { EInvoiceComponent } from '../../../gst-filing/components/e-invoice/e-invoice.component';
import { TdsTcsComponent } from '../../../gst-filing/components/tds-tcs/tds-tcs.component';
import { Gstr9Component } from '../../../gst-filing/components/gstr9/gstr9.component';
import { WorkspaceService, FolderNode } from '@core/services/workspace.service';
import {
  heroDocumentCheckSolid, 
  heroDocumentPlusSolid,
  heroArrowDownTraySolid,
  heroClockSolid,
  heroFolderOpenSolid,
  heroBoltSolid
} from '@ng-icons/heroicons/solid';


@Component({
  selector: 'app-gst-summary',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NgIconComponent, DecimalPipe, 
    Gstr1FormComponent, Gstr3bFormComponent, ItcTrackerComponent, Gstr2aReconcileComponent,
    EwayBillComponent, EInvoiceComponent, TdsTcsComponent, Gstr9Component
  ],
  providers: [provideIcons({ 
    heroReceiptPercentSolid, heroCurrencyRupeeSolid, heroArrowTrendingUpSolid, 
    heroArrowTrendingDownSolid, heroBanknotesSolid, heroChartBarSolid,
    heroDocumentCheckSolid, heroDocumentPlusSolid, heroArrowDownTraySolid, heroClockSolid, heroFolderOpenSolid,
    heroBoltSolid, heroTruckSolid, heroSparklesSolid, heroVariableSolid, heroCalendarSolid
  })],
  template: `
    <div class="space-y-6 animate-in fade-in duration-500">
      <!-- Sub-Navigation Tabs -->
      <div class="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#13243c] border border-transparent dark:border-[#263a55] rounded-xl w-fit overflow-x-auto max-w-full no-scrollbar">
        <button (click)="activeView.set('summary')" 
                [class]="activeView() === 'summary' ? 'bg-white dark:bg-[#1e3658] shadow-sm text-indigo-600 dark:text-sky-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-[#172b47]'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-2.5 whitespace-nowrap">
          <ng-icon name="heroChartBarSolid"></ng-icon> Summary
        </button>
        <button (click)="activeView.set('itc')" 
                [class]="activeView() === 'itc' ? 'bg-white dark:bg-[#1e3658] shadow-sm text-indigo-600 dark:text-sky-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-[#172b47]'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-2.5 whitespace-nowrap">
          <ng-icon name="heroArrowTrendingDownSolid"></ng-icon> ITC Tracker
        </button>
        <button (click)="activeView.set('gstr2a')" 
                [class]="activeView() === 'gstr2a' ? 'bg-white dark:bg-[#1e3658] shadow-sm text-indigo-600 dark:text-sky-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-[#172b47]'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-2.5 whitespace-nowrap">
          <ng-icon name="heroDocumentCheckSolid"></ng-icon> GSTR-2A
        </button>
        <button (click)="activeView.set('eway')" 
                [class]="activeView() === 'eway' ? 'bg-white dark:bg-[#1e3658] shadow-sm text-indigo-600 dark:text-sky-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-[#172b47]'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-2.5 whitespace-nowrap">
          <ng-icon name="heroTruckSolid"></ng-icon> E-Way Bill
        </button>
        <button (click)="activeView.set('einvoice')" 
                [class]="activeView() === 'einvoice' ? 'bg-white dark:bg-[#1e3658] shadow-sm text-indigo-600 dark:text-sky-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-[#172b47]'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-2.5 whitespace-nowrap">
          <ng-icon name="heroSparklesSolid"></ng-icon> E-Invoice
        </button>
        <button (click)="activeView.set('tdstcs')" 
                [class]="activeView() === 'tdstcs' ? 'bg-white dark:bg-[#1e3658] shadow-sm text-indigo-600 dark:text-sky-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-[#172b47]'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-2.5 whitespace-nowrap">
          <ng-icon name="heroVariableSolid"></ng-icon> TDS/TCS
        </button>
        <button (click)="activeView.set('gstr9')" 
                [class]="activeView() === 'gstr9' ? 'bg-white dark:bg-[#1e3658] shadow-sm text-indigo-600 dark:text-sky-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-[#172b47]'"
                class="px-4 py-2 rounded-lg text-[12px] font-bold transition-all flex items-center gap-2.5 whitespace-nowrap">
          <ng-icon name="heroCalendarSolid"></ng-icon> GSTR-9
        </button>
      </div>

      @if (activeView() === 'summary') {
      <!-- Existing Summary View -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-[28px] font-bold text-slate-900 tracking-tight">GST Summary</h1>
          <p class="text-sm text-slate-500 font-medium">Computed monthly GST liability from sales & purchases data.</p>
          <div class="w-10 h-[3px] bg-indigo-600 rounded-full mt-2"></div>
        </div>
        <div class="flex items-center gap-3">
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
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Input GST</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">GST Payable</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Docs</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">GSTR-1</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">GSTR-3B</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (row of rows(); track row.month) {
                <tr class="hover:bg-slate-50/50 transition-colors">
                  <td class="py-3.5 px-4 text-sm font-bold text-slate-900">{{ getMonthName(row.month) }}</td>
                  <td class="py-3.5 px-4 text-sm text-emerald-700 font-mono font-bold text-right">₹{{ row.total_sales | number:'1.0-0' }}</td>
                  <td class="py-3.5 px-4 text-sm text-indigo-700 font-mono font-bold text-right">₹{{ row.output_gst | number:'1.0-0' }}</td>
                  <td class="py-3.5 px-4 text-sm text-amber-700 font-mono font-bold text-right">₹{{ row.total_purchases | number:'1.0-0' }}</td>
                  <td class="py-3.5 px-4 text-sm font-mono font-bold text-right" [class]="row.gst_payable >= 0 ? 'text-rose-700' : 'text-emerald-700'">
                    {{ row.gst_payable >= 0 ? '' : '−' }}₹{{ (row.gst_payable >= 0 ? row.gst_payable : -row.gst_payable) | number:'1.0-0' }}
                  </td>
                  <td class="py-3.5 px-4 text-center">
                    <button (click)="openGstFolder(row)" class="text-indigo-400 hover:text-indigo-600 transition-colors" title="View Document Folder">
                      <ng-icon name="heroFolderOpenSolid" size="18"></ng-icon>
                    </button>
                  </td>
                  <td class="py-3.5 px-4 text-center">
                    @let status1 = getReturnStatus(row.month, 'GSTR-1');
                    <div class="flex items-center justify-center gap-2">
                      @if (status1) {
                        <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          (click)="openForm('GSTR-1', status1)">
                          <ng-icon [name]="status1.status === 'filed' ? 'heroDocumentCheckSolid' : 'heroClockSolid'"></ng-icon>
                          {{ status1.status }}
                        </div>
                        <button (click)="downloadReturnJson(status1)" class="text-slate-400 hover:text-indigo-600 transition-colors p-1" title="Download JSON">
                          <ng-icon name="heroArrowDownTraySolid" size="16"></ng-icon>
                        </button>
                      } @else {
                        <button (click)="generateAndSaveReturn(row.month, 'GSTR-1')" class="text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 p-1.5 rounded-lg flex items-center gap-1" title="Generate & Save to Workspace">
                          <ng-icon name="heroBoltSolid" size="16"></ng-icon>
                          <span class="text-[10px] font-bold uppercase">Generate</span>
                        </button>
                      }
                    </div>
                  </td>
                  <td class="py-3.5 px-4 text-center">
                    @let status3 = getReturnStatus(row.month, 'GSTR-3B');
                    <div class="flex items-center justify-center gap-2">
                      @if (status3) {
                        <div class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer bg-primary-50 text-primary-700 hover:bg-primary-100"
                          (click)="openForm('GSTR-3B', status3)">
                          <ng-icon [name]="status3.status === 'filed' ? 'heroDocumentCheckSolid' : 'heroClockSolid'"></ng-icon>
                          {{ status3.status }}
                        </div>
                        <button (click)="downloadReturnJson(status3)" class="text-slate-400 hover:text-primary-600 transition-colors p-1" title="Download JSON">
                          <ng-icon name="heroArrowDownTraySolid" size="16"></ng-icon>
                        </button>
                      } @else {
                        <button (click)="generateAndSaveReturn(row.month, 'GSTR-3B')" class="text-primary-600 hover:text-primary-800 transition-colors bg-primary-50 p-1.5 rounded-lg flex items-center gap-1" title="Generate & Save to Workspace">
                          <ng-icon name="heroBoltSolid" size="16"></ng-icon>
                          <span class="text-[10px] font-bold uppercase">Generate</span>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      } @else if (activeView() === 'gstr1') {
        <app-gstr1-form 
          [clientId]="clientId" 
          [returnId]="selectedReturn()?.id || 'new'"
          [periodMonth]="selectedMonth()"
          [periodYear]="getSelectedYear(selectedMonth())"
          [financialYear]="selectedFY"
          (back)="onBackFromForm()">
        </app-gstr1-form>
      } @else if (activeView() === 'gstr3b') {
        <app-gstr3b-form 
          [clientId]="clientId" 
          [returnId]="selectedReturn()?.id || 'new'"
          [periodMonth]="selectedMonth()"
          [periodYear]="getSelectedYear(selectedMonth())"
          [financialYear]="selectedFY"
          (back)="onBackFromForm()">
        </app-gstr3b-form>
      } @else if (activeView() === 'itc') {
        <app-itc-tracker [clientId]="clientId" [isEmbedded]="true"></app-itc-tracker>
      } @else if (activeView() === 'gstr2a') {
        <app-gstr2a-reconcile [clientId]="clientId" [isEmbedded]="true"></app-gstr2a-reconcile>
      } @else if (activeView() === 'eway') {
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <app-eway-bill [isEmbedded]="true" [clientIdOverride]="clientId"></app-eway-bill>
        </div>
      } @else if (activeView() === 'einvoice') {
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <app-e-invoice [isEmbedded]="true" [clientIdOverride]="clientId"></app-e-invoice>
        </div>
      } @else if (activeView() === 'tdstcs') {
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <app-tds-tcs [isEmbedded]="true" [clientIdOverride]="clientId"></app-tds-tcs>
        </div>
      } @else if (activeView() === 'gstr9') {
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <app-gstr9 [isEmbedded]="true" [clientIdOverride]="clientId"></app-gstr9>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .sa-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,.06); transition: all .2s ease;
    }
    .sa-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,.08); transform: translateY(-1px);
    }
  `]
})
export class GstSummaryComponent implements OnInit {
  @Input() clientId = '';
  @Input() rootFolder: FolderNode | null = null;
  @Output() folderNavigationRequested = new EventEmitter<string>();

  private dataService = inject(DataService);
  private gstService = inject(GstService);
  private workspaceService = inject(WorkspaceService);
  private toast = inject(ToastService);

  activeView = signal<'summary' | 'gstr1' | 'gstr3b' | 'itc' | 'gstr2a' | 'hsn' | 'eway' | 'einvoice' | 'tdstcs' | 'gstr9'>('summary');
  selectedReturn = signal<any>(null);
  selectedMonth = signal<number>(4);
  returnStatuses = signal<any[]>([]);

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
    this.fetchReturns();
  }

  fetchReturns() {
    if (!this.clientId) return;
    this.gstService.getReturnsByClient(this.clientId).subscribe({
      next: (res: any) => {
        this.returnStatuses.set(res.data || []);
      }
    });
  }

  getReturnStatus(month: number, type: string) {
    return this.returnStatuses().find(r => r.periodMonth === month && r.returnType === type);
  }

  getSelectedYear(month: number) {
    const parts = this.selectedFY.split('-');
    const yearStart = parseInt(parts[0]);
    return month >= 4 ? yearStart : yearStart + 1;
  }

  openForm(type: 'GSTR-1' | 'GSTR-3B', ret: any, month?: number) {
    this.selectedReturn.set(ret);
    if (month) this.selectedMonth.set(month);
    else if (ret) this.selectedMonth.set(ret.periodMonth);
    
    this.activeView.set(type === 'GSTR-1' ? 'gstr1' : 'gstr3b');
  }

  onBackFromForm() {
    this.activeView.set('summary');
    this.fetchReturns();
  }

  generateAndSaveReturn(month: number, type: string) {
    if (!this.clientId) return;
    
    const year = this.getSelectedYear(month);
    const payload = {
      clientId: this.clientId,
      returnType: type,
      periodMonth: month,
      periodYear: year,
      financialYear: this.selectedFY,
      saveToWorkspace: true
    };

    const monthName = this.getMonthName(month);
    this.toast.info(`Generating ${type} for ${monthName}...`);

    this.gstService.generateDraft(payload).subscribe({
      next: (res: any) => {
        const msg = res.data?.id ? `${type} generated and archived in ${monthName} folder.` : `${type} generated successfully.`;
        this.toast.success(msg);
        this.fetchReturns();
      },
      error: (err) => this.toast.error(`Error generating ${type}`, err.message)
    });
  }

  downloadReturnJson(ret: any) {
    if (!ret?.id) return;
    const monthName = this.getMonthName(ret.periodMonth);
    const fileName = `${ret.returnType}_${monthName}_${ret.periodYear}.json`;
    
    // 1. Trigger Download
    this.gstService.downloadJson(ret.id, fileName);
    this.toast.info(`Downloading ${fileName}...`);

    // 2. Automatically Sync to Workspace Storage (S3)
    this.gstService.saveToWorkspace(ret.id).subscribe({
      next: () => {
        console.log(`[GST] Synced ${fileName} to workspace.`);
        this.toast.success(`Archived ${ret.returnType} in client workspace.`);
      },
      error: (err) => {
        console.error(`[GST] Sync failed for ${fileName}`, err);
        this.toast.error(`Could not archive ${ret.returnType} in workspace.`, 'Folder Resolution Error');
      }
    });
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

  openGstFolder(row: GstSummaryRow) {
    if (!this.rootFolder) {
      this.toast.error('Workspace folders not loaded');
      return;
    }

    const monthName = this.getMonthName(row.month);
    // Path pattern: 2. GST Returns / FY 2026-27 / April 2026
    const path = ['2. GST Returns', `FY ${this.selectedFY}`, `${monthName} ${this.getSelectedYear(row.month)}`];
    
    console.log('Navigating to path:', path);
    const folder = this.workspaceService.findFolderByPath(this.rootFolder, path);
    
    if (folder) {
      this.folderNavigationRequested.emit(folder.id);
    } else {
      this.toast.error(`Folder not found: ${path.join(' > ')}`);
    }
  }
}

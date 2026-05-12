import { Component, Input, inject, signal, OnInit, OnChanges, SimpleChanges, TemplateRef, viewChild } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroShoppingCartSolid, heroPlusSolid, heroPencilSquareSolid,
  heroTrashSolid, heroXMarkSolid, heroCurrencyRupeeSolid,
  heroArrowTrendingDownSolid, heroReceiptPercentSolid, heroShieldCheckSolid,
  heroMagnifyingGlassSolid
} from '@ng-icons/heroicons/solid';
import { DataService, PurchaseEntry } from '@core/services/data.service';
import { ToastService } from '@core/services/toast.service';
import { ExcelUtil } from '../../../../../shared/utils/excel.util';
import { PdfUtil } from '../../../../../shared/utils/pdf.util';
import { DataTableComponent } from '../../../../../shared/data-table/data-table.component';
import { TableColumn } from '../../../../../shared/data-table/models';
import { HsnDirectoryComponent } from '../../../../gst-filing/components/hsn-directory/hsn-directory.component';
import { HsnSacCode } from '@core/services/gst-extended.service';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DecimalPipe, DataTableComponent, HsnDirectoryComponent],
  providers: [
    provideIcons({
      heroShoppingCartSolid, heroPlusSolid, heroPencilSquareSolid,
      heroTrashSolid, heroXMarkSolid, heroCurrencyRupeeSolid,
      heroArrowTrendingDownSolid, heroReceiptPercentSolid, heroShieldCheckSolid,
      heroMagnifyingGlassSolid
    })
  ],
  template: `
    <div class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Purchases</p>
              <h3 class="text-2xl font-bold text-slate-900">₹{{ totalPurchases() | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-primary-600 mt-2">{{ entries().length }} entries</p>
            </div>
            <div class="w-11 h-11 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroCurrencyRupeeSolid" size="22"></ng-icon>
            </div>
          </div>
        </div>
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Eligible ITC</p>
              <h3 class="text-2xl font-bold text-emerald-700">₹{{ eligibleITC() | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-emerald-500 mt-2">{{ itcEligibleCount() }} eligible</p>
            </div>
            <div class="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroShieldCheckSolid" size="22"></ng-icon>
            </div>
          </div>
        </div>
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Input GST</p>
              <h3 class="text-2xl font-bold text-violet-700">₹{{ totalGST() | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-violet-500 mt-2">GST paid</p>
            </div>
            <div class="w-11 h-11 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroReceiptPercentSolid" size="22"></ng-icon>
            </div>
          </div>
        </div>
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">RCM Liability</p>
              <h3 class="text-2xl font-bold text-amber-700">₹{{ rcmAmount() | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-amber-500 mt-2">{{ rcmCount() }} entries</p>
            </div>
            <div class="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroArrowTrendingDownSolid" size="22"></ng-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <app-data-table
        title="Purchase Register"
        [tableData]="entries()"
        [tableColumns]="columns"
        [canAdd]="true"
        (add)="openModal()"
        (rowAction)="handleRowAction($event)"
      >
      </app-data-table>

      <!-- Custom Templates -->
      <ng-template #gstRateTpl let-row>
        <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border"
          [ngClass]="{
            'bg-emerald-50 text-emerald-700 border-emerald-200': row.gstRate == 5,
            'bg-sky-50 text-sky-700 border-sky-200': row.gstRate == 12,
            'bg-indigo-50 text-indigo-700 border-indigo-200': row.gstRate == 18,
            'bg-rose-50 text-rose-700 border-rose-200': row.gstRate == 28,
            'bg-slate-50 text-slate-600 border-slate-200': row.gstRate == 0
          }"
        >{{ row.gstRate }}%</span>
      </ng-template>

      <ng-template #itcTpl let-row>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
          [ngClass]="row.itcEligible ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
        >{{ row.itcEligible ? 'YES' : 'NO' }}</span>
      </ng-template>

      <ng-template #rcmTpl let-row>
        @if (row.rcmApplicable) {
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">RCM</span>
        }
      </ng-template>

      <ng-template #statusTpl let-row>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
          [ngClass]="{
            'bg-amber-50 text-amber-700': row.status === 'draft',
            'bg-emerald-50 text-emerald-700': row.status === 'validated',
            'bg-blue-50 text-blue-700': row.status === 'filed'
          }"
        >{{ row.status }}</span>
      </ng-template>

      <!-- Add/Edit Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="closeModal()">
          <div class="bg-white rounded-lg shadow-2xl w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-200" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 class="text-lg font-bold text-slate-900">{{ editingId ? 'Edit' : 'Add' }} Purchase Entry</h3>
              <button (click)="closeModal()" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                <ng-icon name="heroXMarkSolid" size="20"></ng-icon>
              </button>
            </div>
            <div class="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bill No *</label>
                  <input type="text" [(ngModel)]="form.billNo" class="sa-input" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Bill Date *</label>
                  <input type="date" [(ngModel)]="form.billDate" class="sa-input" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Purchase Type</label>
                  <select [(ngModel)]="form.purchaseType" class="sa-input cursor-pointer">
                    <option value="local">Local</option>
                    <option value="interstate">Interstate</option>
                    <option value="import">Import</option>
                    <option value="sez">SEZ</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Vendor Name *</label>
                  <input type="text" [(ngModel)]="form.vendorName" class="sa-input" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Vendor GSTIN</label>
                  <input type="text" [(ngModel)]="form.gstin" class="sa-input font-mono" placeholder="22ABCDE1234F1Z5" maxlength="15" />
                </div>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">HSN/SAC</label>
                  <div class="relative group/hsn">
                    <input type="text" [(ngModel)]="form.hsnSacCode" class="sa-input font-mono !pr-10" />
                    <button 
                      type="button"
                      (click)="showHsnLookup.set(true)"
                      class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                      title="Search HSN Directory"
                    >
                      <ng-icon name="heroMagnifyingGlassSolid" size="16"></ng-icon>
                    </button>
                  </div>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                  <input type="text" [(ngModel)]="form.description" class="sa-input" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                  <select [(ngModel)]="form.status" class="sa-input cursor-pointer">
                    <option value="draft">Draft</option>
                    <option value="validated">Validated</option>
                    <option value="filed">Filed</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Base Amount (₹) *</label>
                  <input type="number" [(ngModel)]="form.baseAmount" step="0.01" class="sa-input font-mono" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">GST Rate *</label>
                  <select [(ngModel)]="form.gstRate" class="sa-input cursor-pointer">
                    <option [value]="0">0%</option><option [value]="5">5%</option>
                    <option [value]="12">12%</option><option [value]="18">18%</option>
                    <option [value]="28">28%</option>
                  </select>
                </div>
              </div>
              <!-- ITC/RCM Toggles -->
              <div class="flex items-center gap-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
                <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form.itcEligible" class="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  <span class="font-medium">ITC Eligible</span>
                </label>
                <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form.rcmApplicable" class="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                  <span class="font-medium">RCM Applicable</span>
                </label>
                <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form.isCapitalGoods" class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span class="font-medium">Capital Goods</span>
                </label>
              </div>
              @if (form.baseAmount > 0) {
                <div class="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-lg p-4">
                  <p class="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-3">GST Preview</p>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <span class="text-slate-600">Base Amount</span>
                    <span class="font-mono font-bold text-right">₹{{ form.baseAmount | number:'1.2-2' }}</span>
                    <span class="text-slate-600">GST ({{ form.gstRate }}%)</span>
                    <span class="font-mono font-bold text-violet-700 text-right">₹{{ (form.baseAmount * form.gstRate / 100) | number:'1.2-2' }}</span>
                  </div>
                  <div class="border-t border-violet-200 mt-2 pt-2 grid grid-cols-2 gap-2 text-sm">
                    <span class="font-bold">Total</span>
                    <span class="font-mono font-bold text-right">₹{{ (form.baseAmount + form.baseAmount * form.gstRate / 100) | number:'1.2-2' }}</span>
                  </div>
                </div>
              }
              <div>
                <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes</label>
                <textarea [(ngModel)]="form.notes" class="sa-input !h-auto" rows="2" placeholder="Optional remarks..."></textarea>
              </div>
            </div>
            <div class="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <button (click)="closeModal()" class="h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button>
              <button (click)="saveEntry()" [disabled]="!isFormValid()" class="h-10 px-6 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                {{ editingId ? 'Update' : 'Create' }}
              </button>
            </div>
          </div>

          <!-- HSN Lookup Nested Modal -->
          @if (showHsnLookup()) {
            <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4" (click)="showHsnLookup.set(false)">
              <div class="bg-white rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col" (click)="$event.stopPropagation()">
                <div class="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                  <div>
                    <h4 class="text-base font-bold text-slate-900">HSN/SAC Lookup</h4>
                    <p class="text-xs text-slate-500">Pick a code to automatically set HSN and GST rate</p>
                  </div>
                  <button (click)="showHsnLookup.set(false)" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-200 transition-all">
                    <ng-icon name="heroXMarkSolid" size="20"></ng-icon>
                  </button>
                </div>
                <div class="p-2 overflow-y-auto max-h-[70vh]">
                  <app-hsn-directory [isPicker]="true" (select)="onHsnSelect($event)"></app-hsn-directory>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .sa-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: all 0.2s ease; }
    .sa-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-1px); }
    .sa-input { width: 100%; height: 40px; padding: 0 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; transition: all 0.15s ease; }
    .sa-input:focus { background: white; border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
  `]
})
export class PurchasesComponent implements OnInit, OnChanges {
  @Input() clientId!: string;
  @Input() month: number = 0;
  @Input() financialYear: string = '';

  dataService = inject(DataService);
  toast = inject(ToastService);

  entries = signal<PurchaseEntry[]>([]);
  showModal = signal(false);
  showHsnLookup = signal(false);
  editingId: string | null = null;
  editingEntry = signal<PurchaseEntry | null>(null);

  // Template Signals
  gstRateTpl = viewChild.required<TemplateRef<any>>('gstRateTpl');
  itcTpl = viewChild.required<TemplateRef<any>>('itcTpl');
  rcmTpl = viewChild.required<TemplateRef<any>>('rcmTpl');
  statusTpl = viewChild.required<TemplateRef<any>>('statusTpl');

  get columns(): TableColumn[] {
    return [
      { name: 'Bill No', prop: 'billNo', type: 'text', sortable: true, width: 120 },
      { name: 'Date', prop: 'billDate', type: 'date', sortable: true, width: 120 },
      { name: 'Vendor', prop: 'vendorName', type: 'text', sortable: true, width: 200 },
      { name: 'Base Amt', prop: 'baseAmount', type: 'currency', width: 120 },
      { name: 'GST%', prop: 'gstRate', type: 'text', template: this.gstRateTpl(), width: 80 },
      { name: 'CGST', prop: 'cgstAmount', type: 'currency', width: 100 },
      { name: 'SGST', prop: 'sgstAmount', type: 'currency', width: 100 },
      { name: 'IGST', prop: 'igstAmount', type: 'currency', width: 100 },
      { name: 'ITC', prop: 'itcEligible', type: 'text', template: this.itcTpl(), width: 80 },
      { name: 'RCM', prop: 'rcmApplicable', type: 'text', template: this.rcmTpl(), width: 80 },
      { name: 'Status', prop: 'status', type: 'status', template: this.statusTpl(), width: 100 }
    ];
  }
  form: any = this.resetForm();
  totalPurchases = signal(0);
  totalGST = signal(0);
  totalWithGST = signal(0);
  eligibleITC = signal(0);
  itcEligibleCount = signal(0);
  rcmAmount = signal(0);
  rcmCount = signal(0);

  ngOnInit() { this.loadData(); }
  ngOnChanges(changes: SimpleChanges) { if (changes['month'] || changes['financialYear']) this.loadData(); }

  resetForm() {
    return {
      billNo: '', billDate: '', vendorName: '', description: '', hsnSacCode: '',
      baseAmount: 0, gstRate: 18, gstin: '', purchaseType: 'local',
      itcEligible: true, rcmApplicable: false, isCapitalGoods: false, status: 'draft', notes: ''
    };
  }

  loadData() {
    if (!this.clientId) return;
    this.dataService.getPurchases(this.clientId, this.month || undefined, this.financialYear || undefined).subscribe({
      next: (res: any) => {
        if (res.success) {
          const data = res.data || [];
          this.entries.set(data);
          this.totalPurchases.set(data.reduce((s: number, e: any) => s + parseFloat(e.baseAmount || 0), 0));
          this.totalGST.set(data.reduce((s: number, e: any) => s + parseFloat(e.gstAmount || 0), 0));
          this.totalWithGST.set(data.reduce((s: number, e: any) => s + parseFloat(e.totalAmount || 0), 0));
          const eligible = data.filter((e: any) => e.itcEligible);
          this.eligibleITC.set(eligible.reduce((s: number, e: any) => s + parseFloat(e.gstAmount || 0), 0));
          this.itcEligibleCount.set(eligible.length);
          const rcm = data.filter((e: any) => e.rcmApplicable);
          this.rcmAmount.set(rcm.reduce((s: number, e: any) => s + parseFloat(e.gstAmount || 0), 0));
          this.rcmCount.set(rcm.length);
        }
      }, error: (err) => this.toast.error('Failed to load purchases', err.message)
    });
  }

  openModal() { this.editingId = null; this.form = this.resetForm(); this.showModal.set(true); }
  editEntry(e: PurchaseEntry) {
    this.editingId = e.id;
    this.form = {
      billNo: e.billNo, billDate: e.billDate, vendorName: e.vendorName,
      description: e.description || '', hsnSacCode: e.hsnSacCode || '',
      baseAmount: e.baseAmount, gstRate: e.gstRate,
      gstin: e.gstin || '', purchaseType: e.purchaseType || 'local',
      itcEligible: e.itcEligible !== false, rcmApplicable: e.rcmApplicable || false,
      isCapitalGoods: e.isCapitalGoods || false, status: e.status || 'draft', notes: e.notes || '',
    };
    this.showModal.set(true);
  }
  closeModal() { this.showModal.set(false); }
  isFormValid() { return !!(this.form.billNo && this.form.billDate && this.form.vendorName && this.form.baseAmount > 0); }
  saveEntry() {
    if (!this.isFormValid()) return;
    const obs = this.editingId ? this.dataService.updatePurchase(this.clientId, this.editingId, this.form) : this.dataService.createPurchase(this.clientId, this.form);
    obs.subscribe({ next: () => { this.toast.success(this.editingId ? 'Updated' : 'Created'); this.closeModal(); this.loadData(); }, error: (err) => this.toast.error('Failed', err.message) });
  }
  deleteEntry(e: PurchaseEntry) {
    if (!confirm(`Delete bill ${e.billNo}?`)) return;
    this.dataService.deletePurchase(this.clientId, e.id).subscribe({ next: () => { this.toast.success('Deleted'); this.loadData(); }, error: (err) => this.toast.error('Failed', err.message) });
  }

  handleRowAction(event: { action: string, row: any }) {
    if (event.action === 'edit') {
      this.editEntry(event.row);
    } else if (event.action === 'delete') {
      this.deleteEntry(event.row);
    }
  }

  onHsnSelect(code: HsnSacCode) {
    this.form.hsnSacCode = code.code;
    this.form.gstRate = code.gstRate;
    if (code.description) {
      this.form.description = code.description;
    }
    this.showHsnLookup.set(false);
    this.toast.success(`Selected HSN ${code.code} (${code.gstRate}%)`);
  }
}

import { Component, Input, inject, signal, OnInit, OnChanges, SimpleChanges, TemplateRef, viewChild } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroChartBarSolid, heroPlusSolid, heroPencilSquareSolid,
  heroTrashSolid, heroXMarkSolid, heroCurrencyRupeeSolid,
  heroArrowTrendingUpSolid, heroReceiptPercentSolid,
  heroDocumentTextSolid, heroMagnifyingGlassSolid
} from '@ng-icons/heroicons/solid';
import { DataService, SaleEntry } from '@core/services/data.service';
import { ClientService } from '@core/services/client.service';
import { ToastService } from '@core/services/toast.service';
import { ExcelUtil } from '../../../../../shared/utils/excel.util';
import { PdfUtil } from '../../../../../shared/utils/pdf.util';
import { DataTableComponent } from '../../../../../shared/data-table/data-table.component';
import { TableColumn } from '../../../../../shared/data-table/models';
import { HsnDirectoryComponent } from '../../../../gst-filing/components/hsn-directory/hsn-directory.component';
import { HsnSacCode } from '@core/services/gst-extended.service';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DecimalPipe, DataTableComponent, HsnDirectoryComponent],
  providers: [
    provideIcons({
      heroChartBarSolid, heroPlusSolid, heroPencilSquareSolid,
      heroTrashSolid, heroXMarkSolid, heroCurrencyRupeeSolid,
      heroArrowTrendingUpSolid, heroReceiptPercentSolid,
      heroDocumentTextSolid, heroMagnifyingGlassSolid
    })
  ],
  template: `
    <div class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Sales</p>
              <h3 class="text-2xl font-bold text-slate-900">₹{{ totalSales() | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-emerald-600 mt-2">{{ entries().length }} entries</p>
            </div>
            <div class="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroCurrencyRupeeSolid" size="22"></ng-icon>
            </div>
          </div>
        </div>
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Output GST</p>
              <h3 class="text-2xl font-bold text-indigo-700">₹{{ totalGST() | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-indigo-500 mt-2">CGST + SGST / IGST</p>
            </div>
            <div class="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroReceiptPercentSolid" size="22"></ng-icon>
            </div>
          </div>
        </div>
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">B2B Sales</p>
              <h3 class="text-2xl font-bold text-slate-900">{{ b2bCount() }}</h3>
              <p class="text-xs font-bold text-sky-600 mt-2">₹{{ b2bValue() | number:'1.0-0' }}</p>
            </div>
            <div class="w-11 h-11 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroChartBarSolid" size="22"></ng-icon>
            </div>
          </div>
        </div>
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total with GST</p>
              <h3 class="text-2xl font-bold text-slate-900">₹{{ totalWithGST() | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-amber-600 mt-2">Invoice value</p>
            </div>
            <div class="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroArrowTrendingUpSolid" size="22"></ng-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <app-data-table
        title="Sales Register"
        [tableData]="entries()"
        [tableColumns]="columns"
        [canAdd]="true"
        (add)="openModal()"
        (rowAction)="handleRowAction($event)"
        [actionsTemplate]="actionsTpl"
      >
      </app-data-table>

      <!-- Custom Templates -->
      <ng-template #typeTpl let-row>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
          [ngClass]="{
            'bg-blue-50 text-blue-700': row.invoiceType === 'B2B',
            'bg-purple-50 text-purple-700': row.invoiceType === 'B2C',
            'bg-teal-50 text-teal-700': row.invoiceType === 'EXPORT',
            'bg-slate-100 text-slate-600': row.invoiceType === 'NIL'
          }"
        >{{ row.invoiceType }}</span>
      </ng-template>

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

      <ng-template #statusTpl let-row>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
          [ngClass]="{
            'bg-amber-50 text-amber-700': row.status === 'draft',
            'bg-emerald-50 text-emerald-700': row.status === 'validated',
            'bg-blue-50 text-blue-700': row.status === 'filed',
            'bg-rose-50 text-rose-700': row.status === 'revised'
          }"
        >{{ row.status }}</span>
      </ng-template>

      <ng-template #actionsTpl let-row>
        <button (click)="handleRowAction({action: 'download', row})" title="Download Invoice"
          class="w-8 h-8 flex items-center justify-center rounded-lg text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
          <ng-icon name="heroDocumentTextSolid" size="18"></ng-icon>
        </button>
        <button (click)="handleRowAction({action: 'edit', row})" title="Edit Sale"
          class="w-8 h-8 flex items-center justify-center rounded-xl text-orange-500 hover:bg-orange-50 hover:text-orange-700 transition-colors">
          <ng-icon name="heroPencilSquareSolid" size="18"></ng-icon>
        </button>
        <button (click)="handleRowAction({action: 'delete', row})" title="Delete Sale"
          class="w-8 h-8 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors">
          <ng-icon name="heroTrashSolid" size="18"></ng-icon>
        </button>
      </ng-template>

      <!-- Add/Edit Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="closeModal()">
          <div class="bg-white rounded-lg shadow-2xl w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-200" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 class="text-lg font-bold text-slate-900">{{ editingEntry() ? 'Edit' : 'Add' }} Sale Entry</h3>
              <button (click)="closeModal()" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                <ng-icon name="heroXMarkSolid" size="20"></ng-icon>
              </button>
            </div>

            <div class="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <!-- Row 1: Invoice basics -->
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Invoice No *</label>
                  <input type="text" [(ngModel)]="form.invoiceNo" class="sa-input" placeholder="INV-001" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Invoice Date *</label>
                  <input type="date" [(ngModel)]="form.invoiceDate" class="sa-input" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Invoice Type</label>
                  <select [(ngModel)]="form.invoiceType" class="sa-input cursor-pointer">
                    <option value="B2B">B2B</option>
                    <option value="B2C">B2C</option>
                    <option value="EXPORT">Export</option>
                    <option value="SEZ">SEZ</option>
                    <option value="NIL">Nil Rated</option>
                    <option value="CREDIT_NOTE">Credit Note</option>
                  </select>
                </div>
              </div>

              <!-- Row 2: Customer + GSTIN -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Customer Name *</label>
                  <input type="text" [(ngModel)]="form.customerName" class="sa-input" placeholder="Customer name" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Customer GSTIN</label>
                  <input type="text" [(ngModel)]="form.gstin" class="sa-input font-mono" placeholder="22ABCDE1234F1Z5" maxlength="15" />
                </div>
              </div>

              <!-- Row 3: HSN, POS, Description -->
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">HSN/SAC</label>
                  <div class="relative group/hsn">
                    <input type="text" [(ngModel)]="form.hsnSacCode" class="sa-input font-mono !pr-10" placeholder="9988" />
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
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Place of Supply</label>
                  <select [(ngModel)]="form.placeOfSupply" class="sa-input cursor-pointer">
                    <option value="">-- Select --</option>
                    @for (s of stateList; track s.code) {
                      <option [value]="s.code">{{ s.code }} - {{ s.name }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                  <input type="text" [(ngModel)]="form.description" class="sa-input" placeholder="Item/service" />
                </div>
              </div>

              <!-- Row 4: Amount + GST Rate -->
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Base Amount (₹) *</label>
                  <input type="number" [(ngModel)]="form.baseAmount" step="0.01" class="sa-input font-mono" placeholder="0.00" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">GST Rate *</label>
                  <select [(ngModel)]="form.gstRate" class="sa-input cursor-pointer">
                    <option [value]="0">0%</option>
                    <option [value]="5">5%</option>
                    <option [value]="12">12%</option>
                    <option [value]="18">18% (Standard)</option>
                    <option [value]="28">28%</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status</label>
                  <select [(ngModel)]="form.status" class="sa-input cursor-pointer">
                    <option value="draft">Draft</option>
                    <option value="validated">Validated</option>
                    <option value="filed">Filed</option>
                    <option value="revised">Revised</option>
                  </select>
                </div>
              </div>

              <!-- Row 5: Toggles -->
              <div class="flex items-center gap-6">
                <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form.isNilRated" class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span class="font-medium">Nil Rated / Exempt</span>
                </label>
                <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form.isAdvance" class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span class="font-medium">Advance Received</span>
                </label>
              </div>

              <!-- GST Preview -->
              @if (form.baseAmount > 0) {
                <div class="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-4">
                  <p class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-3">GST Calculation Preview</p>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <span class="text-slate-600">Base Amount</span>
                    <span class="font-mono font-bold text-slate-900 text-right">₹{{ form.baseAmount | number:'1.2-2' }}</span>
                    <span class="text-slate-600">GST ({{ form.gstRate }}%)</span>
                    <span class="font-mono font-bold text-indigo-700 text-right">₹{{ (form.baseAmount * form.gstRate / 100) | number:'1.2-2' }}</span>
                  </div>
                  <div class="border-t border-indigo-200 mt-2 pt-2 grid grid-cols-2 gap-2 text-sm">
                    <span class="font-bold text-slate-900">Total</span>
                    <span class="font-mono font-bold text-slate-900 text-right">₹{{ (form.baseAmount + form.baseAmount * form.gstRate / 100) | number:'1.2-2' }}</span>
                  </div>
                </div>
              }

              <!-- Notes -->
              <div>
                <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notes</label>
                <textarea [(ngModel)]="form.notes" class="sa-input !h-auto" rows="2" placeholder="Optional remarks..."></textarea>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <button (click)="closeModal()" class="h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button>
              <button (click)="saveEntry()" [disabled]="!isFormValid()" class="h-10 px-6 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed">
                {{ editingEntry() ? 'Update' : 'Create' }}
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
    .sa-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      transition: all 0.2s ease;
    }
    .sa-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      transform: translateY(-1px);
    }
    .sa-input {
      width: 100%;
      height: 40px;
      padding: 0 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
      transition: all 0.15s ease;
    }
    .sa-input:focus {
      background: white;
      border-color: #6366f1;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }
  `]
})
export class SalesComponent implements OnInit, OnChanges {
  @Input() clientId!: string;
  @Input() month: number = 0;
  @Input() financialYear: string = '';

  dataService = inject(DataService);
  clientService = inject(ClientService);
  toast = inject(ToastService);

  entries = signal<SaleEntry[]>([]);
  showModal = signal(false);
  showHsnLookup = signal(false);
  editingId: string | null = null;
  editingEntry = signal<SaleEntry | null>(null);

  // Template Signals
  typeTpl = viewChild.required<TemplateRef<any>>('typeTpl');
  gstRateTpl = viewChild.required<TemplateRef<any>>('gstRateTpl');
  statusTpl = viewChild.required<TemplateRef<any>>('statusTpl');
  actionsTpl = viewChild.required<TemplateRef<any>>('actionsTpl');

  get columns(): TableColumn[] {
    return [
      { name: 'Invoice', prop: 'invoiceNo', type: 'text', sortable: true, width: 120 },
      { name: 'Date', prop: 'invoiceDate', type: 'date', sortable: true, width: 120 },
      { name: 'Customer', prop: 'customerName', type: 'text', sortable: true, width: 200 },
      { name: 'Type', prop: 'invoiceType', type: 'text', template: this.typeTpl(), width: 100 },
      { name: 'Base Amt', prop: 'baseAmount', type: 'currency', width: 120 },
      { name: 'GST%', prop: 'gstRate', type: 'text', template: this.gstRateTpl(), width: 80 },
      { name: 'CGST', prop: 'cgstAmount', type: 'currency', width: 100 },
      { name: 'SGST', prop: 'sgstAmount', type: 'currency', width: 100 },
      { name: 'IGST', prop: 'igstAmount', type: 'currency', width: 100 },
      { name: 'Total', prop: 'totalAmount', type: 'currency', width: 130 },
      { name: 'Status', prop: 'status', type: 'status', template: this.statusTpl(), width: 100 }
    ];
  }

  form: any = this.resetForm();

  totalSales = signal(0);
  totalGST = signal(0);
  totalWithGST = signal(0);
  b2bCount = signal(0);
  b2bValue = signal(0);

  stateList = [
    { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
    { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
    { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
    { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
    { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
    { code: '19', name: 'West Bengal' }, { code: '21', name: 'Odisha' },
    { code: '22', name: 'Chhattisgarh' }, { code: '23', name: 'Madhya Pradesh' },
    { code: '24', name: 'Gujarat' }, { code: '27', name: 'Maharashtra' },
    { code: '29', name: 'Karnataka' }, { code: '30', name: 'Goa' },
    { code: '32', name: 'Kerala' }, { code: '33', name: 'Tamil Nadu' },
    { code: '36', name: 'Telangana' }, { code: '37', name: 'Andhra Pradesh' },
    { code: '96', name: 'Foreign Country' },
  ];

  ngOnInit() { this.loadData(); }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['month'] || changes['financialYear']) this.loadData();
  }

  loadData() {
    if (!this.clientId) return;
    this.dataService.getSales(this.clientId, this.month || undefined, this.financialYear || undefined).subscribe({
      next: (res: any) => {
        if (res.success) {
          const data = res.data || [];
          this.entries.set(data);
          this.totalSales.set(data.reduce((s: number, e: any) => s + parseFloat(e.baseAmount || 0), 0));
          this.totalGST.set(data.reduce((s: number, e: any) => s + parseFloat(e.gstAmount || 0), 0));
          this.totalWithGST.set(data.reduce((s: number, e: any) => s + parseFloat(e.totalAmount || 0), 0));
          this.b2bCount.set(data.filter((e: any) => e.invoiceType === 'B2B').length);
          this.b2bValue.set(data.filter((e: any) => e.invoiceType === 'B2B').reduce((s: number, e: any) => s + parseFloat(e.baseAmount || 0), 0));
        }
      },
      error: (err) => this.toast.error('Failed to load sales', err.message)
    });
  }

  resetForm() {
    return {
      invoiceNo: '', invoiceDate: '', customerName: '', description: '',
      hsnSacCode: '', baseAmount: 0, gstRate: 18,
      gstin: '', invoiceType: 'B2B', placeOfSupply: '',
      isNilRated: false, isAdvance: false, status: 'draft', notes: ''
    };
  }

  openModal() {
    this.editingId = null;
    this.form = this.resetForm();
    this.showModal.set(true);
  }

  editEntry(entry: SaleEntry) {
    this.editingId = entry.id;
    this.form = {
      invoiceNo: entry.invoiceNo,
      invoiceDate: entry.invoiceDate,
      customerName: entry.customerName,
      description: entry.description || '',
      hsnSacCode: entry.hsnSacCode || '',
      baseAmount: entry.baseAmount,
      gstRate: entry.gstRate,
      gstin: entry.gstin || '',
      invoiceType: entry.invoiceType || 'B2B',
      placeOfSupply: entry.placeOfSupply || '',
      isNilRated: entry.isNilRated || false,
      isAdvance: entry.isAdvance || false,
      status: entry.status || 'draft',
      notes: entry.notes || ''
    };
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  isFormValid(): boolean {
    return !!(this.form.invoiceNo && this.form.invoiceDate && this.form.customerName && this.form.baseAmount > 0);
  }

  saveEntry() {
    if (!this.isFormValid()) return;
    const payload = { ...this.form };

    const obs = this.editingId
      ? this.dataService.updateSale(this.clientId, this.editingId, payload)
      : this.dataService.createSale(this.clientId, payload);

    obs.subscribe({
      next: () => {
        this.toast.success(this.editingId ? 'Sale updated' : 'Sale created');
        this.closeModal();
        this.loadData();
      },
      error: (err) => this.toast.error('Failed to save', err.message)
    });
  }

  deleteEntry(entry: SaleEntry) {
    if (!confirm(`Delete invoice ${entry.invoiceNo}?`)) return;
    this.dataService.deleteSale(this.clientId, entry.id).subscribe({
      next: () => { this.toast.success('Deleted'); this.loadData(); },
      error: (err) => this.toast.error('Delete failed', err.message)
    });
  }

  handleRowAction(event: { action: string, row: any }) {
    if (event.action === 'edit') {
      this.editEntry(event.row);
    } else if (event.action === 'delete') {
      this.deleteEntry(event.row);
    } else if (event.action === 'download') {
      this.downloadInvoice(event.row);
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

  downloadInvoice(sale: SaleEntry) {
    this.clientService.getClient(this.clientId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          PdfUtil.generateSaleInvoicePdf(res.data, sale);
          this.toast.success('Invoice generated successfully!');
        } else {
          PdfUtil.generateSaleInvoicePdf({}, sale); // fallback if client fetch fails
        }
      },
      error: () => {
        PdfUtil.generateSaleInvoicePdf({}, sale); // fallback
      }
    });
  }
}

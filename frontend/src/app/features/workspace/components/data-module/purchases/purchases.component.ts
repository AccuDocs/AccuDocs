import { Component, Input, inject, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroShoppingCartSolid, heroPlusSolid, heroPencilSquareSolid,
  heroTrashSolid, heroXMarkSolid, heroCurrencyRupeeSolid,
  heroArrowTrendingDownSolid, heroReceiptPercentSolid
} from '@ng-icons/heroicons/solid';
import { DataService, PurchaseEntry } from '@core/services/data.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DecimalPipe],
  providers: [
    provideIcons({
      heroShoppingCartSolid, heroPlusSolid, heroPencilSquareSolid,
      heroTrashSolid, heroXMarkSolid, heroCurrencyRupeeSolid,
      heroArrowTrendingDownSolid, heroReceiptPercentSolid
    })
  ],
  template: `
    <div class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[13px] font-medium text-slate-500 mb-1">Total Purchases</p>
              <h3 class="text-3xl font-bold text-slate-900">₹{{ totalPurchases() | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-teal-600 mt-2">{{ entries().length }} entries</p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroCurrencyRupeeSolid" size="24"></ng-icon>
            </div>
          </div>
        </div>
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[13px] font-medium text-slate-500 mb-1">Input GST</p>
              <h3 class="text-3xl font-bold text-slate-900">₹{{ totalGST() | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-violet-600 mt-2">GST paid on purchases</p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroReceiptPercentSolid" size="24"></ng-icon>
            </div>
          </div>
        </div>
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[13px] font-medium text-slate-500 mb-1">Total with GST</p>
              <h3 class="text-3xl font-bold text-slate-900">₹{{ totalWithGST() | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-amber-600 mt-2">Bill value</p>
            </div>
            <div class="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroArrowTrendingDownSolid" size="24"></ng-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="flex items-center justify-between">
        <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Purchase Register</p>
        <button (click)="openModal()" class="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
          <ng-icon name="heroPlusSolid" size="18"></ng-icon>
          Add Entry
        </button>
      </div>

      <!-- Data Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bill No</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vendor</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Base Amt</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">GST %</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">GST Amt</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Total</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (entry of entries(); track entry.id) {
                <tr class="hover:bg-slate-50/50 transition-colors group">
                  <td class="py-3.5 px-4 text-sm font-bold text-slate-900">{{ entry.billNo }}</td>
                  <td class="py-3.5 px-4 text-sm text-slate-600">{{ entry.billDate | date:'dd MMM yyyy' }}</td>
                  <td class="py-3.5 px-4 text-sm text-slate-700 font-medium">{{ entry.vendorName }}</td>
                  <td class="py-3.5 px-4 text-sm text-slate-900 font-mono font-bold text-right">₹{{ entry.baseAmount | number:'1.2-2' }}</td>
                  <td class="py-3.5 px-4 text-center">
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border-emerald-200': entry.gstRate === 5,
                        'bg-sky-50 text-sky-700 border-sky-200': entry.gstRate === 12,
                        'bg-indigo-50 text-indigo-700 border-indigo-200': entry.gstRate === 18,
                        'bg-rose-50 text-rose-700 border-rose-200': entry.gstRate === 28,
                        'bg-slate-50 text-slate-600 border-slate-200': entry.gstRate === 0
                      }"
                    >{{ entry.gstRate }}%</span>
                  </td>
                  <td class="py-3.5 px-4 text-sm text-violet-700 font-mono font-bold text-right">₹{{ entry.gstAmount | number:'1.2-2' }}</td>
                  <td class="py-3.5 px-4 text-sm text-slate-900 font-mono font-bold text-right">₹{{ entry.totalAmount | number:'1.2-2' }}</td>
                  <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button (click)="editEntry(entry)" class="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all">
                        <ng-icon name="heroPencilSquareSolid" size="16"></ng-icon>
                      </button>
                      <button (click)="deleteEntry(entry)" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                        <ng-icon name="heroTrashSolid" size="16"></ng-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
              @if (entries().length === 0) {
                <tr><td colspan="8" class="py-12 text-center">
                  <div class="flex flex-col items-center justify-center text-slate-400">
                    <ng-icon name="heroShoppingCartSolid" size="48" class="mb-4 opacity-20"></ng-icon>
                    <p class="font-bold">No purchase entries found</p>
                    <p class="text-xs mt-1">Click "Add Entry" to create your first purchase record.</p>
                  </div>
                </td></tr>
              }
            </tbody>
            @if (entries().length > 0) {
              <tfoot>
                <tr class="bg-violet-50/50 border-t-2 border-violet-200">
                  <td colspan="3" class="py-3 px-4 text-xs font-bold text-violet-900 uppercase tracking-widest">Totals</td>
                  <td class="py-3 px-4 text-sm font-mono font-bold text-violet-900 text-right">₹{{ totalPurchases() | number:'1.2-2' }}</td>
                  <td></td>
                  <td class="py-3 px-4 text-sm font-mono font-bold text-violet-900 text-right">₹{{ totalGST() | number:'1.2-2' }}</td>
                  <td class="py-3 px-4 text-sm font-mono font-bold text-violet-900 text-right">₹{{ totalWithGST() | number:'1.2-2' }}</td>
                  <td></td>
                </tr>
              </tfoot>
            }
          </table>
        </div>
      </div>

      <!-- Add/Edit Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="closeModal()">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-200" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 class="text-lg font-bold text-slate-900">{{ editingId ? 'Edit' : 'Add' }} Purchase Entry</h3>
              <button (click)="closeModal()" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                <ng-icon name="heroXMarkSolid" size="20"></ng-icon>
              </button>
            </div>
            <div class="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[13px] font-medium text-slate-500 mb-1.5">Bill No *</label>
                  <input type="text" [(ngModel)]="form.billNo" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div>
                  <label class="block text-[13px] font-medium text-slate-500 mb-1.5">Bill Date *</label>
                  <input type="date" [(ngModel)]="form.billDate" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
              </div>
              <div>
                <label class="block text-[13px] font-medium text-slate-500 mb-1.5">Vendor Name *</label>
                <input type="text" [(ngModel)]="form.vendorName" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
              </div>
              <div>
                <label class="block text-[13px] font-medium text-slate-500 mb-1.5">Description</label>
                <input type="text" [(ngModel)]="form.description" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[13px] font-medium text-slate-500 mb-1.5">HSN/SAC</label>
                  <input type="text" [(ngModel)]="form.hsnSacCode" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div>
                  <label class="block text-[13px] font-medium text-slate-500 mb-1.5">GST Rate *</label>
                  <select [(ngModel)]="form.gstRate" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer">
                    <option [value]="0">0%</option><option [value]="5">5%</option><option [value]="12">12%</option><option [value]="18">18%</option><option [value]="28">28%</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-[13px] font-medium text-slate-500 mb-1.5">Base Amount (₹) *</label>
                <input type="number" [(ngModel)]="form.baseAmount" step="0.01" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono" />
              </div>
              @if (form.baseAmount > 0) {
                <div class="bg-violet-50 border border-violet-100 rounded-lg p-4">
                  <p class="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-2">GST Preview</p>
                  <div class="flex justify-between text-sm"><span class="text-slate-600">Base</span><span class="font-mono font-bold">₹{{ form.baseAmount | number:'1.2-2' }}</span></div>
                  <div class="flex justify-between text-sm mt-1"><span class="text-slate-600">GST ({{ form.gstRate }}%)</span><span class="font-mono font-bold text-violet-700">₹{{ (form.baseAmount * form.gstRate / 100) | number:'1.2-2' }}</span></div>
                  <div class="border-t border-violet-200 mt-2 pt-2 flex justify-between text-sm"><span class="font-bold">Total</span><span class="font-mono font-bold">₹{{ (form.baseAmount + form.baseAmount * form.gstRate / 100) | number:'1.2-2' }}</span></div>
                </div>
              }
            </div>
            <div class="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <button (click)="closeModal()" class="h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button>
              <button (click)="saveEntry()" [disabled]="!isFormValid()" class="h-10 px-6 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                {{ editingId ? 'Update' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`:host{display:block}.sa-card{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06);transition:all .2s ease}.sa-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08);transform:translateY(-1px)}`]
})
export class PurchasesComponent implements OnInit, OnChanges {
  @Input() clientId = '';
  @Input() month = 0;
  @Input() financialYear = '';

  private dataService = inject(DataService);
  private toast = inject(ToastService);

  entries = signal<PurchaseEntry[]>([]);
  showModal = signal(false);
  editingId: string | null = null;
  form = { billNo: '', billDate: '', vendorName: '', description: '', hsnSacCode: '', baseAmount: 0, gstRate: 18 };
  totalPurchases = signal(0);
  totalGST = signal(0);
  totalWithGST = signal(0);

  ngOnInit() { this.loadData(); }
  ngOnChanges(changes: SimpleChanges) { if (changes['month'] || changes['financialYear']) this.loadData(); }

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
        }
      }, error: (err) => this.toast.error('Failed to load purchases', err.message)
    });
  }

  openModal() { this.editingId = null; this.form = { billNo: '', billDate: '', vendorName: '', description: '', hsnSacCode: '', baseAmount: 0, gstRate: 18 }; this.showModal.set(true); }
  editEntry(e: PurchaseEntry) { this.editingId = e.id; this.form = { billNo: e.billNo, billDate: e.billDate, vendorName: e.vendorName, description: e.description || '', hsnSacCode: e.hsnSacCode || '', baseAmount: e.baseAmount, gstRate: e.gstRate }; this.showModal.set(true); }
  closeModal() { this.showModal.set(false); }
  isFormValid() { return !!(this.form.billNo && this.form.billDate && this.form.vendorName && this.form.baseAmount > 0); }
  saveEntry() {
    if (!this.isFormValid()) return;
    const obs = this.editingId ? this.dataService.updatePurchase(this.clientId, this.editingId, this.form as any) : this.dataService.createPurchase(this.clientId, this.form as any);
    obs.subscribe({ next: () => { this.toast.success(this.editingId ? 'Updated' : 'Created'); this.closeModal(); this.loadData(); }, error: (err) => this.toast.error('Failed', err.message) });
  }
  deleteEntry(e: PurchaseEntry) {
    if (!confirm(`Delete bill ${e.billNo}?`)) return;
    this.dataService.deletePurchase(this.clientId, e.id).subscribe({ next: () => { this.toast.success('Deleted'); this.loadData(); }, error: (err) => this.toast.error('Failed', err.message) });
  }
}

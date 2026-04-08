import { Component, Input, inject, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroBanknotesSolid, heroPlusSolid, heroPencilSquareSolid, heroTrashSolid, heroXMarkSolid, heroCurrencyRupeeSolid, heroReceiptPercentSolid, heroShieldExclamationSolid } from '@ng-icons/heroicons/solid';
import { DataService, ExpenseEntry } from '@core/services/data.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, DecimalPipe],
  providers: [provideIcons({ heroBanknotesSolid, heroPlusSolid, heroPencilSquareSolid, heroTrashSolid, heroXMarkSolid, heroCurrencyRupeeSolid, heroReceiptPercentSolid, heroShieldExclamationSolid })],
  template: `
    <div class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Expenses</p>
              <h3 class="text-2xl font-bold text-slate-900">₹{{ totalExpenses() | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-rose-600 mt-2">{{ entries().length }} entries</p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroCurrencyRupeeSolid" size="22"></ng-icon>
            </div>
          </div>
        </div>
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">GST on Expenses</p>
              <h3 class="text-2xl font-bold text-indigo-700">₹{{ expenseGST() | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-indigo-500 mt-2">{{ gstApplicableCount() }} with GST</p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroReceiptPercentSolid" size="22"></ng-icon>
            </div>
          </div>
        </div>
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">ITC Claimable</p>
              <h3 class="text-2xl font-bold text-emerald-700">₹{{ itcClaimable() | number:'1.0-0' }}</h3>
              <p class="text-xs font-bold text-emerald-500 mt-2">Eligible credit</p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroBanknotesSolid" size="22"></ng-icon>
            </div>
          </div>
        </div>
        <div class="sa-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Top Category</p>
              <h3 class="text-xl font-bold text-slate-900 capitalize">{{ topCategory() || '—' }}</h3>
              <p class="text-xs font-bold text-amber-600 mt-2">Most frequent</p>
            </div>
            <div class="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-300">
              <ng-icon name="heroShieldExclamationSolid" size="22"></ng-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="flex items-center justify-between">
        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Expense Register</p>
        <button (click)="openModal()" class="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
          <ng-icon name="heroPlusSolid" size="18"></ng-icon> Add Expense
        </button>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200">
                <th class="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                <th class="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</th>
                <th class="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</th>
                <th class="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vendor</th>
                <th class="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Amount</th>
                <th class="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">GST</th>
                <th class="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">GST Amt</th>
                <th class="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">ITC</th>
                <th class="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                <th class="py-3 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (e of entries(); track e.id) {
                <tr class="hover:bg-slate-50/50 transition-colors group">
                  <td class="py-3 px-3 text-sm text-slate-600">{{ e.expenseDate | date:'dd MMM yy' }}</td>
                  <td class="py-3 px-3"><span class="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200 capitalize">{{ e.category }}</span></td>
                  <td class="py-3 px-3 text-sm text-slate-700 font-medium max-w-[160px] truncate">{{ e.description }}</td>
                  <td class="py-3 px-3 text-sm text-slate-500">{{ e.vendorName || '—' }}</td>
                  <td class="py-3 px-3 text-sm text-slate-900 font-mono font-bold text-right">₹{{ e.amount | number:'1.0-0' }}</td>
                  <td class="py-3 px-3 text-center">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      [ngClass]="e.gstApplicable ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'"
                    >{{ e.gstApplicable ? e.gstRate + '%' : 'N/A' }}</span>
                  </td>
                  <td class="py-3 px-3 text-sm text-indigo-700 font-mono text-right">{{ e.gstApplicable ? '₹' + (e.gstAmount | number:'1.0-0') : '—' }}</td>
                  <td class="py-3 px-3 text-center">
                    @if (e.gstApplicable) {
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        [ngClass]="e.itcAllowed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
                      >{{ e.itcAllowed ? 'YES' : 'NO' }}</span>
                    }
                  </td>
                  <td class="py-3 px-3 text-center">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                      [ngClass]="{
                        'bg-amber-50 text-amber-700': e.status === 'draft',
                        'bg-emerald-50 text-emerald-700': e.status === 'validated',
                        'bg-blue-50 text-blue-700': e.status === 'filed'
                      }"
                    >{{ e.status }}</span>
                  </td>
                  <td class="py-3 px-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button (click)="editEntry(e)" class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"><ng-icon name="heroPencilSquareSolid" size="15"></ng-icon></button>
                      <button (click)="deleteEntry(e)" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><ng-icon name="heroTrashSolid" size="15"></ng-icon></button>
                    </div>
                  </td>
                </tr>
              }
              @if (entries().length === 0) {
                <tr><td colspan="10" class="py-12 text-center"><div class="flex flex-col items-center text-slate-400"><ng-icon name="heroBanknotesSolid" size="48" class="mb-4 opacity-20"></ng-icon><p class="font-bold">No expenses found</p><p class="text-xs mt-1">Click "Add Expense" to record an expense.</p></div></td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="closeModal()">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-200" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 class="text-lg font-bold text-slate-900">{{ editingId ? 'Edit' : 'Add' }} Expense</h3>
              <button (click)="closeModal()" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><ng-icon name="heroXMarkSolid" size="20"></ng-icon></button>
            </div>
            <div class="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date *</label>
                  <input type="date" [(ngModel)]="form.expenseDate" class="sa-input" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category *</label>
                  <select [(ngModel)]="form.category" class="sa-input cursor-pointer">
                    @for (c of categories; track c) { <option [value]="c">{{ c }}</option> }
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payment Mode</label>
                  <select [(ngModel)]="form.paymentMode" class="sa-input cursor-pointer">
                    <option value="cash">Cash</option><option value="upi">UPI</option>
                    <option value="bank">Bank Transfer</option><option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description *</label>
                <input type="text" [(ngModel)]="form.description" class="sa-input" />
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Vendor</label>
                  <input type="text" [(ngModel)]="form.vendorName" class="sa-input" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount (₹) *</label>
                  <input type="number" [(ngModel)]="form.amount" step="0.01" class="sa-input font-mono" />
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Reference No</label>
                  <input type="text" [(ngModel)]="form.referenceNo" class="sa-input" />
                </div>
              </div>
              <!-- GST Section -->
              <div class="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GST Details</p>
                <div class="flex items-center gap-6">
                  <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="form.gstApplicable" class="w-4 h-4 rounded border-slate-300 text-indigo-600" />
                    <span class="font-medium">GST Applicable</span>
                  </label>
                  @if (form.gstApplicable) {
                    <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                      <input type="checkbox" [(ngModel)]="form.itcAllowed" class="w-4 h-4 rounded border-slate-300 text-emerald-600" />
                      <span class="font-medium">ITC Allowed</span>
                    </label>
                  }
                </div>
                @if (form.gstApplicable) {
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">GST Rate</label>
                      <select [(ngModel)]="form.gstRate" class="sa-input cursor-pointer">
                        <option [value]="5">5%</option><option [value]="12">12%</option>
                        <option [value]="18">18%</option><option [value]="28">28%</option>
                      </select>
                    </div>
                    @if (!form.itcAllowed) {
                      <div>
                        <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Block Reason</label>
                        <input type="text" [(ngModel)]="form.itcBlockedReason" class="sa-input" placeholder="e.g. Personal use" />
                      </div>
                    }
                  </div>
                }
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                  <select [(ngModel)]="form.status" class="sa-input cursor-pointer">
                    <option value="draft">Draft</option><option value="validated">Validated</option><option value="filed">Filed</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes</label>
                  <input type="text" [(ngModel)]="form.notes" class="sa-input" placeholder="Optional remarks" />
                </div>
              </div>
            </div>
            <div class="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
              <button (click)="closeModal()" class="h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button>
              <button (click)="saveEntry()" [disabled]="!isFormValid()" class="h-10 px-6 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50">{{ editingId ? 'Update' : 'Create' }}</button>
            </div>
          </div>
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
export class ExpensesComponent implements OnInit, OnChanges {
  @Input() clientId = '';
  @Input() month = 0;
  @Input() financialYear = '';

  private dataService = inject(DataService);
  private toast = inject(ToastService);

  entries = signal<ExpenseEntry[]>([]);
  showModal = signal(false);
  editingId: string | null = null;
  form: any = this.resetForm();
  totalExpenses = signal(0);
  expenseGST = signal(0);
  gstApplicableCount = signal(0);
  itcClaimable = signal(0);
  topCategory = signal('');
  categories = ['general', 'rent', 'salary', 'utilities', 'travel', 'office supplies', 'professional fees', 'insurance', 'maintenance', 'marketing', 'food', 'entertainment', 'other'];

  ngOnInit() { this.loadData(); }
  ngOnChanges(changes: SimpleChanges) { if (changes['month'] || changes['financialYear']) this.loadData(); }

  resetForm() {
    return {
      expenseDate: '', category: 'general', description: '', vendorName: '',
      amount: 0, paymentMode: 'cash', referenceNo: '',
      gstApplicable: false, gstRate: 18, gstAmount: 0,
      itcAllowed: false, itcBlockedReason: '', status: 'draft', notes: ''
    };
  }

  loadData() {
    if (!this.clientId) return;
    this.dataService.getExpenses(this.clientId, this.month || undefined, this.financialYear || undefined).subscribe({
      next: (res: any) => {
        if (res.success) {
          const data = res.data || [];
          this.entries.set(data);
          this.totalExpenses.set(data.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0));
          const gstItems = data.filter((e: any) => e.gstApplicable);
          this.expenseGST.set(gstItems.reduce((s: number, e: any) => s + parseFloat(e.gstAmount || 0), 0));
          this.gstApplicableCount.set(gstItems.length);
          this.itcClaimable.set(data.filter((e: any) => e.itcAllowed).reduce((s: number, e: any) => s + parseFloat(e.gstAmount || 0), 0));
          const catCount: Record<string, number> = {};
          data.forEach((e: any) => { catCount[e.category] = (catCount[e.category] || 0) + 1; });
          const top = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
          this.topCategory.set(top ? top[0] : '');
        }
      }, error: (err) => this.toast.error('Failed', err.message)
    });
  }

  openModal() { this.editingId = null; this.form = this.resetForm(); this.showModal.set(true); }
  editEntry(e: ExpenseEntry) {
    this.editingId = e.id;
    this.form = {
      expenseDate: e.expenseDate, category: e.category, description: e.description,
      vendorName: e.vendorName || '', amount: e.amount, paymentMode: e.paymentMode,
      referenceNo: e.referenceNo || '',
      gstApplicable: e.gstApplicable || false, gstRate: e.gstRate || 18,
      gstAmount: e.gstAmount || 0, itcAllowed: e.itcAllowed || false,
      itcBlockedReason: e.itcBlockedReason || '', status: e.status || 'draft', notes: e.notes || ''
    };
    this.showModal.set(true);
  }
  closeModal() { this.showModal.set(false); }
  isFormValid() { return !!(this.form.expenseDate && this.form.description && this.form.amount > 0); }
  saveEntry() {
    if (!this.isFormValid()) return;
    const obs = this.editingId ? this.dataService.updateExpense(this.clientId, this.editingId, this.form) : this.dataService.createExpense(this.clientId, this.form);
    obs.subscribe({ next: () => { this.toast.success(this.editingId ? 'Updated' : 'Created'); this.closeModal(); this.loadData(); }, error: (err) => this.toast.error('Failed', err.message) });
  }
  deleteEntry(e: ExpenseEntry) {
    if (!confirm(`Delete expense "${e.description}"?`)) return;
    this.dataService.deleteExpense(this.clientId, e.id).subscribe({ next: () => { this.toast.success('Deleted'); this.loadData(); }, error: (err) => this.toast.error('Failed', err.message) });
  }
}

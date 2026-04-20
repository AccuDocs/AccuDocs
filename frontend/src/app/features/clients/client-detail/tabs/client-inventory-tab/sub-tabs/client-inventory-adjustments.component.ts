import { Component, inject, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryService } from '@core/services/inventory.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-client-inventory-adjustments',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 class="font-bold text-[#0f2540] text-sm uppercase">Stock Adjustments</h3>
        <button (click)="openCreateModal = true" class="flex items-center gap-1 text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">
          <mat-icon class="text-[16px] w-4 h-4">add</mat-icon> New Adjustment
        </button>
      </div>

      <div class="flex-1 overflow-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0">
            <tr>
              <th class="px-4 py-3 text-left border-y border-slate-200">Date</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">Item</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">Warehouse</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Adjusted Qty</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">Reason</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">Notes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @if (loading()) {
              <tr><td colspan="6" class="py-12 text-center text-slate-400">Loading adjustments...</td></tr>
            } @else if (data().length === 0) {
              <tr><td colspan="6" class="py-12 text-center text-slate-400">No adjustments found</td></tr>
            } @else {
              @for (adj of data(); track adj.id) {
                <tr class="hover:bg-slate-50">
                  <td class="px-4 py-3 text-[11px] text-slate-600">{{ adj.transactionDate | date:'dd MMM yyyy' }}</td>
                  <td class="px-4 py-3 text-slate-900">{{ adj.item?.name || adj.itemId }}</td>
                  <td class="px-4 py-3 text-[11px]">{{ adj.warehouse?.name || '-' }}</td>
                  <td class="px-4 py-3 text-right font-mono font-bold" [class]="(adj.qtyIn || 0) - (adj.qtyOut || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'">
                    {{ ((adj.qtyIn || 0) - (adj.qtyOut || 0) > 0 ? '+' : '') }}{{ (adj.qtyIn || 0) - (adj.qtyOut || 0) }}
                  </td>
                  <td class="px-4 py-3 text-[11px]">{{ adj.notes || '-' }}</td>
                  <td class="px-4 py-3 text-[11px] text-slate-500">{{ adj.notes || '-' }}</td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- CREATE MODAL -->
    @if (openCreateModal) {
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl">
          <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 class="font-bold text-[#0f2540]">Record Stock Adjustment</h3>
            <button (click)="closeModal()" class="text-slate-400 hover:text-slate-700">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="submit()" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Item *</label>
              <select formControlName="itemId" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500">
                <option value="">Select Item</option>
                @for (item of allItems(); track item.id) {
                  <option [value]="item.id">{{ item.name }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Warehouse *</label>
              <select formControlName="warehouseId" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500">
                <option value="">Select Warehouse</option>
                @for (wh of warehouses(); track wh.id) {
                  <option [value]="wh.id">{{ wh.name }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Adjustment Qty (+/-) *</label>
              <input type="number" formControlName="adjustedQty" placeholder="0" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Reason *</label>
              <select formControlName="reason" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500">
                <option value="">Select Reason</option>
                <option value="damage">Damage</option>
                <option value="counting_error">Counting Error</option>
                <option value="theft">Theft</option>
                <option value="expiry">Expiry</option>
                <option value="production">Production</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
              <textarea formControlName="notes" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"></textarea>
            </div>
            <div class="flex gap-3 justify-end pt-4">
              <button type="button" (click)="closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button type="submit" [disabled]="saving() || form.invalid" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
                {{ saving() ? 'Saving...' : 'Record' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class ClientInventoryAdjustmentsComponent implements OnInit {
  clientId = input.required<string>();

  private service = inject(InventoryService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  data = signal<any[]>([]);
  loading = signal(false);
  saving = signal(false);
  openCreateModal = false;

  allItems = signal<any[]>([]);
  warehouses = signal<any[]>([]);
  form!: FormGroup;

  ngOnInit() {
    this.form = this.fb.group({
      itemId: ['', Validators.required],
      warehouseId: ['', Validators.required],
      adjustedQty: [0, Validators.required],
      reason: ['', Validators.required],
      notes: [''],
    });

    this.loadData();
    this.loadItems();
    this.loadWarehouses();
  }

  loadData() {
    this.loading.set(true);
    this.service.getClientStockLedger(this.clientId(), { transactionType: 'adjustment' }).subscribe({
      next: (response: any) => this.data.set(response.data || []),
      error: (err) => this.toast.error('Failed to load adjustments'),
      complete: () => this.loading.set(false),
    });
  }

  loadItems() {
    this.service.getItems({ limit: 500 }).subscribe({
      next: (response: any) => this.allItems.set(response.data || []),
      error: (err) => console.error('Failed to load items', err),
    });
  }

  loadWarehouses() {
    this.service.getWarehouses().subscribe({
      next: (response: any) => this.warehouses.set(response.data || []),
      error: (err) => console.error('Failed to load warehouses', err),
    });
  }

  submit() {
    if (this.form.invalid) return;

    this.saving.set(true);
    const dto = {
      warehouseId: this.form.value.warehouseId,
      itemId: this.form.value.itemId,
      adjustedQty: this.form.value.adjustedQty,
      reason: this.form.value.reason,
      notes: this.form.value.notes,
      clientId: this.clientId(),
    };

    this.service.recordStockAdjustment(dto).subscribe({
      next: () => {
        this.toast.success('Stock adjustment recorded');
        this.closeModal();
        this.loadData();
      },
      error: (err) => this.toast.error('Failed to record adjustment'),
      complete: () => this.saving.set(false),
    });
  }

  closeModal() {
    this.openCreateModal = false;
    this.form.reset();
  }
}

import { Component, inject, input, signal, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryService } from '@core/services/inventory.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-client-inventory-pricing',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReactiveFormsModule, DecimalPipe, DatePipe],
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 class="font-bold text-[#0f2540] text-sm uppercase">Custom Pricing</h3>
          <button (click)="openModal = true" class="flex items-center gap-1 text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">
            <mat-icon class="text-[16px] w-4 h-4">add</mat-icon> Set Price
          </button>
        </div>

        <div class="flex-1 overflow-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0">
              <tr>
                <th class="px-4 py-3 text-left border-y border-slate-200">Item</th>
                <th class="px-4 py-3 text-left border-y border-slate-200">Variant</th>
                <th class="px-4 py-3 text-right border-y border-slate-200">Std Price</th>
                <th class="px-4 py-3 text-right border-y border-slate-200">Custom Price</th>
                <th class="px-4 py-3 text-right border-y border-slate-200">Discount</th>
                <th class="px-4 py-3 text-center border-y border-slate-200">Valid Until</th>
                <th class="px-4 py-3 text-right border-y border-slate-200">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (loading()) {
                <tr><td colspan="7" class="py-12 text-center text-slate-400">Loading pricing...</td></tr>
              } @else if (data().length === 0) {
                <tr><td colspan="7" class="py-12 text-center text-slate-400">No custom prices set</td></tr>
              } @else {
                @for (price of data(); track price.id) {
                  <tr class="hover:bg-slate-50">
                    <td class="px-4 py-3 text-slate-900 font-medium">{{ price.item?.name || price.itemId }}</td>
                    <td class="px-4 py-3 text-[11px] text-slate-500">{{ price.item?.variants?.[0]?.variantName || '-' }}</td>
                    <td class="px-4 py-3 text-right font-mono">₹{{ price.item?.sellingPrice | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 text-right font-mono text-emerald-600 font-bold">₹{{ price.customSellingPrice | number:'1.2-2' }}</td>
                    <td class="px-4 py-3 text-right font-mono text-amber-600">{{ price.discountPct }}%</td>
                    <td class="px-4 py-3 text-center text-[11px]">{{ price.validTo ? (price.validTo | date:'dd MMM yyyy') : '∞' }}</td>
                    <td class="px-4 py-3 text-right flex gap-1 justify-end">
                      <button (click)="editPrice(price)" class="text-slate-400 hover:text-indigo-600" title="Edit">
                        <mat-icon class="text-[16px]">edit</mat-icon>
                      </button>
                      <button (click)="deletePrice(price)" class="text-slate-400 hover:text-rose-600" title="Delete">
                        <mat-icon class="text-[16px]">delete</mat-icon>
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="bg-slate-50 border border-slate-200 rounded-xl p-5 h-fit">
        <h3 class="font-bold text-[#0f2540] text-sm uppercase mb-3">How Pricing Works</h3>
        <p class="text-sm text-slate-600 mb-4 leading-relaxed">
          Custom prices override standard item prices when creating invoices or purchase orders for this client.
        </p>
        <div class="bg-white border border-slate-200 rounded p-3 space-y-2 text-xs">
          <div class="flex gap-2">
            <mat-icon class="text-indigo-600 text-[16px] flex-shrink-0">check_circle</mat-icon>
            <span>Set different selling prices per client</span>
          </div>
          <div class="flex gap-2">
            <mat-icon class="text-indigo-600 text-[16px] flex-shrink-0">check_circle</mat-icon>
            <span>Apply temporary discounts</span>
          </div>
          <div class="flex gap-2">
            <mat-icon class="text-indigo-600 text-[16px] flex-shrink-0">check_circle</mat-icon>
            <span>Set validity dates</span>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL -->
    @if (openModal) {
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl">
          <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 class="font-bold text-[#0f2540]">{{ editingId() ? 'Edit' : 'Set' }} Custom Price</h3>
            <button (click)="closeModal()" class="text-slate-400"><mat-icon>close</mat-icon></button>
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
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Custom Price (₹) *</label>
                <input type="number" formControlName="customPrice" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500" placeholder="0.00">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Discount %</label>
                <input type="number" formControlName="discount" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500" placeholder="0">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Valid From</label>
                <input type="date" formControlName="validFrom" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Valid To</label>
                <input type="date" formControlName="validTo" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500">
              </div>
            </div>
            <div class="flex gap-3 justify-end pt-4">
              <button type="button" (click)="closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button type="submit" [disabled]="saving() || form.invalid" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
                {{ saving() ? 'Saving...' : (editingId() ? 'Update' : 'Save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class ClientInventoryPricingComponent implements OnInit {
  clientId = input.required<string>();

  private service = inject(InventoryService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  data = signal<any[]>([]);
  loading = signal(false);
  saving = signal(false);
  openModal = false;
  editingId = signal<string | null>(null);

  allItems = signal<any[]>([]);
  form!: FormGroup;

  ngOnInit() {
    this.form = this.fb.group({
      itemId: ['', Validators.required],
      customPrice: [0, [Validators.required, Validators.min(0)]],
      discount: [0, Validators.min(0)],
      validFrom: [''],
      validTo: [''],
    });

    this.loadData();
    this.loadItems();
  }

  loadData() {
    this.loading.set(true);
    this.service.getClientPricing(this.clientId()).subscribe({
      next: (response: any) => this.data.set(response.data || response || []),
      error: (err) => this.toast.error('Failed to load pricing'),
      complete: () => this.loading.set(false),
    });
  }

  loadItems() {
    this.service.getItems({ limit: 500 }).subscribe({
      next: (response: any) => this.allItems.set(response.data || []),
      error: (err) => console.error('Failed to load items', err),
    });
  }

  editPrice(price: any) {
    this.editingId.set(price.id);
    this.form.patchValue({
      itemId: price.itemId,
      customPrice: price.customSellingPrice,
      discount: price.discountPct,
      validFrom: price.validFrom?.split('T')[0] || '',
      validTo: price.validTo?.split('T')[0] || '',
    });
    this.openModal = true;
  }

  deletePrice(price: any) {
    if (!confirm('Delete this pricing rule?')) return;

    this.service.deleteClientPrice(price.id).subscribe({
      next: () => {
        this.toast.success('Pricing rule deleted');
        this.loadData();
      },
      error: (err) => this.toast.error('Failed to delete pricing'),
    });
  }

  submit() {
    if (this.form.invalid) return;

    this.saving.set(true);
    const dto = {
      clientId: this.clientId(),
      itemId: this.form.value.itemId,
      customSellingPrice: this.form.value.customPrice,
      discountPct: this.form.value.discount,
      validFrom: this.form.value.validFrom,
      validTo: this.form.value.validTo,
    };

    const request$ = this.editingId()
      ? this.service.updateClientPrice(this.editingId()!, dto)
      : this.service.setClientItemPrice(dto);

    request$.subscribe({
      next: () => {
        this.toast.success('Pricing saved');
        this.closeModal();
        this.loadData();
      },
      error: (err) => this.toast.error('Failed to save pricing'),
      complete: () => this.saving.set(false),
    });
  }

  closeModal() {
    this.openModal = false;
    this.editingId.set(null);
    this.form.reset({ discount: 0 });
  }
}

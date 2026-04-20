import { Component, inject, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryService } from '@core/services/inventory.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-client-inventory-transfers',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 class="font-bold text-[#0f2540] text-sm uppercase">Stock Transfers</h3>
        <button (click)="openCreateModal = true" class="flex items-center gap-1 text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg">
          <mat-icon class="text-[16px] w-4 h-4">add</mat-icon> New Transfer
        </button>
      </div>

      <div class="p-4 flex gap-2 bg-white border-b border-slate-100">
        <select [(ngModel)]="statusFilter" (ngModelChange)="filterChanged()" class="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="in_transit">In Transit</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div class="flex-1 overflow-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0">
            <tr>
              <th class="px-4 py-3 text-left border-y border-slate-200">Transfer No</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">Date</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">From → To</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Items</th>
              <th class="px-4 py-3 text-center border-y border-slate-200">Status</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @if (loading()) {
              <tr><td colspan="6" class="py-12 text-center text-slate-400">Loading transfers...</td></tr>
            } @else if (filteredData().length === 0) {
              <tr><td colspan="6" class="py-12 text-center text-slate-400">No transfers found</td></tr>
            } @else {
              @for (tr of filteredData(); track tr.id) {
                <tr class="hover:bg-slate-50">
                  <td class="px-4 py-3 font-mono text-indigo-600 font-bold">{{ tr.transferNo }}</td>
                  <td class="px-4 py-3 text-[11px] text-slate-600">{{ tr.transferDate | date:'dd MMM yyyy' }}</td>
                  <td class="px-4 py-3 text-[11px]">{{ tr.fromWarehouse?.name }} → {{ tr.toWarehouse?.name }}</td>
                  <td class="px-4 py-3 text-right text-[11px]">{{ (tr.transferItems?.length || 0) }}</td>
                  <td class="px-4 py-3 text-center">
                    <span class="text-[9px] uppercase font-bold px-2 py-1 rounded-full" [ngClass]="getStatusClass(tr.status)">
                      {{ tr.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right flex gap-1 justify-end">
                    @if (tr.status === 'draft') {
                      <button (click)="dispatchTransfer(tr)" class="text-slate-400 hover:text-blue-600" title="Dispatch">
                        <mat-icon class="text-[18px]">send</mat-icon>
                      </button>
                      <button (click)="editTransfer(tr)" class="text-slate-400 hover:text-indigo-600" title="Edit">
                        <mat-icon class="text-[18px]">edit</mat-icon>
                      </button>
                    }
                    @if (tr.status === 'in_transit') {
                      <button (click)="receiveTransfer(tr)" class="text-slate-400 hover:text-emerald-600" title="Receive">
                        <mat-icon class="text-[18px]">done_all</mat-icon>
                      </button>
                    }
                  </td>
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
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 class="font-bold text-[#0f2540]">Create Stock Transfer</h3>
            <button (click)="closeModal()" class="text-slate-400"><mat-icon>close</mat-icon></button>
          </div>
          <form [formGroup]="form" (ngSubmit)="submit()" class="p-6 space-y-4 overflow-auto flex-1">
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">From Warehouse *</label>
              <select formControlName="fromWarehouseId" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500">
                <option value="">Select</option>
                @for (wh of warehouses(); track wh.id) {
                  <option [value]="wh.id">{{ wh.name }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">To Warehouse *</label>
              <select formControlName="toWarehouseId" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500">
                <option value="">Select</option>
                @for (wh of warehouses(); track wh.id) {
                  <option [value]="wh.id">{{ wh.name }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Items *</label>
              <div class="space-y-2 bg-slate-50 p-2 rounded">
                @for (item of transferItems(); track $index; let i = $index) {
                  <div class="flex gap-1 text-xs">
                    <input type="text" placeholder="Item" [(ngModel)]="item.itemName" [ngModelOptions]="{standalone: true}" readonly class="flex-1 px-2 py-1 border border-slate-300 rounded bg-white">
                    <input type="number" placeholder="Qty" [(ngModel)]="item.qty" [ngModelOptions]="{standalone: true}" class="w-16 px-2 py-1 border border-slate-300 rounded">
                    <button type="button" (click)="removeItem(i)" class="text-rose-600">
                      <mat-icon class="text-[16px]">delete</mat-icon>
                    </button>
                  </div>
                }
                <button type="button" (click)="addItem()" class="text-xs text-indigo-600 font-bold">+ Add</button>
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
              <textarea formControlName="notes" rows="2" class="w-full px-2 py-1 border border-slate-300 rounded text-xs"></textarea>
            </div>
          </form>
          <div class="p-5 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
            <button (click)="closeModal()" class="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button (click)="submit()" [disabled]="saving()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
              {{ saving() ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ClientInventoryTransfersComponent implements OnInit {
  clientId = input.required<string>();

  private service = inject(InventoryService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  data = signal<any[]>([]);
  loading = signal(false);
  saving = signal(false);
  openCreateModal = false;

  warehouses = signal<any[]>([]);
  statusFilter = '';
  form!: FormGroup;
  transferItems = signal<any[]>([{ itemId: '', itemName: '', qty: 1 }]);

  filteredData = () => {
    let result = this.data();
    if (this.statusFilter) {
      result = result.filter(t => t.status === this.statusFilter);
    }
    return result;
  };

  ngOnInit() {
    this.form = this.fb.group({
      fromWarehouseId: ['', Validators.required],
      toWarehouseId: ['', Validators.required],
      notes: [''],
    });

    this.loadData();
    this.loadWarehouses();
  }

  loadData() {
    this.loading.set(true);
    this.service.getStockTransfersForClient(this.clientId()).subscribe({
      next: (response: any) => this.data.set(response.data || response || []),
      error: (err) => this.toast.error('Failed to load transfers'),
      complete: () => this.loading.set(false),
    });
  }

  loadWarehouses() {
    this.service.getWarehouses().subscribe({
      next: (response: any) => this.warehouses.set(response.data || []),
      error: (err) => console.error('Failed to load warehouses', err),
    });
  }

  filterChanged() {
    // Filtering via computed
  }

  dispatchTransfer(transfer: any) {
    if (!confirm('Dispatch this transfer?')) return;

    this.service.dispatchTransfer(transfer.id).subscribe({
      next: () => {
        this.toast.success(`Transfer ${transfer.transferNo} dispatched`);
        this.loadData();
      },
      error: (err) => this.toast.error('Failed to dispatch transfer'),
    });
  }

  receiveTransfer(transfer: any) {
    if (!confirm('Mark this transfer as received?')) return;

    this.service.receiveTransfer(transfer.id).subscribe({
      next: () => {
        this.toast.success(`Transfer ${transfer.transferNo} received`);
        this.loadData();
      },
      error: (err) => this.toast.error('Failed to receive transfer'),
    });
  }

  editTransfer(transfer: any) {
    this.toast.info('Edit transfer not yet implemented');
  }

  addItem() {
    const items = this.transferItems();
    items.push({ itemId: '', itemName: '', qty: 1 });
    this.transferItems.set([...items]);
  }

  removeItem(index: number) {
    const items = this.transferItems().filter((_, i) => i !== index);
    this.transferItems.set(items);
  }

  submit() {
    if (this.form.invalid || this.transferItems().length === 0) {
      this.toast.error('Please fill all required fields');
      return;
    }

    this.saving.set(true);
    const dto = {
      fromWarehouseId: this.form.value.fromWarehouseId,
      toWarehouseId: this.form.value.toWarehouseId,
      items: this.transferItems().map(i => ({ itemId: i.itemId, qty: i.qty })),
      notes: this.form.value.notes,
    };

    this.service.createStockTransferForClient(this.clientId(), dto).subscribe({
      next: (tr) => {
        this.toast.success(`Transfer ${tr.transferNo} created`);
        this.closeModal();
        this.loadData();
      },
      error: (err) => this.toast.error('Failed to create transfer'),
      complete: () => this.saving.set(false),
    });
  }

  closeModal() {
    this.openCreateModal = false;
    this.form.reset();
    this.transferItems.set([{ itemId: '', itemName: '', qty: 1 }]);
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'draft': 'bg-slate-100 text-slate-700',
      'in_transit': 'bg-blue-100 text-blue-700',
      'received': 'bg-emerald-100 text-emerald-700',
      'cancelled': 'bg-rose-100 text-rose-700',
    };
    return map[status] || 'bg-slate-100 text-slate-700';
  }
}

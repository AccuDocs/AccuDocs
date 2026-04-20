import { Component, inject, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryService } from '@core/services/inventory.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-client-inventory-items',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          <h3 class="font-bold text-[#0f2540] text-sm uppercase">Item Catalog</h3>
          <p class="text-xs text-slate-500 mt-1">View and manage your product items</p>
        </div>
        <button (click)="openAddModal()" class="flex items-center gap-1 text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow">
          <mat-icon class="text-[16px] w-4 h-4">add</mat-icon> New Item
        </button>
      </div>

      <!-- Filters -->
      <div class="p-4 flex flex-col md:flex-row gap-3 bg-white border-b border-slate-100">
        <div class="flex-1 relative">
          <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-[18px]">search</mat-icon>
          <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="onFilterChange()" placeholder="Search items..." class="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500">
        </div>
        <select [(ngModel)]="typeFilter" (ngModelChange)="onFilterChange()" class="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500">
          <option value="">All Types</option>
          <option value="raw_material">Raw Material</option>
          <option value="finished_goods">Finished Goods</option>
          <option value="service">Service</option>
          <option value="other">Other</option>
        </select>
        <select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()" class="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <!-- Table -->
      <div class="flex-1 overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0">
            <tr>
              <th class="px-4 py-3 text-left border-y border-slate-200">Item Name</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">SKU</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">Type</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">UOM</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Purchase Price</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Selling Price</th>
              <th class="px-4 py-3 text-center border-y border-slate-200">Status</th>
              <th class="px-4 py-3 text-center border-y border-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @if (loading()) {
              <tr><td colspan="8" class="py-12 text-center text-slate-400">Loading items...</td></tr>
            } @else if (filteredData().length === 0) {
              <tr><td colspan="8" class="py-12 text-center text-slate-400">No items found</td></tr>
            } @else {
              @for (item of filteredData(); track item.id) {
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3 font-medium text-slate-900">{{ item.name }}</td>
                  <td class="px-4 py-3 font-mono text-slate-600 text-[11px]">{{ item.sku }}</td>
                  <td class="px-4 py-3 text-[11px]">
                    <span class="px-2 py-1 rounded-full text-[9px] font-bold" [ngClass]="getTypeClass(item.type)">
                      {{ item.type }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-[11px] text-slate-600">{{ item.unitOfMeasure }}</td>
                  <td class="px-4 py-3 text-right font-mono text-slate-900">₹{{ item.purchasePrice | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-right font-mono font-bold text-emerald-600">₹{{ item.sellingPrice | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-center">
                    <span class="px-2 py-1 rounded-full text-[9px] font-bold" [ngClass]="getStatusClass(item.status)">
                      {{ item.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <div class="flex gap-2 justify-center items-center">
                      <button (click)="viewItem(item)" title="View" class="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <mat-icon class="text-[18px] w-[18px] h-[18px]">visibility</mat-icon>
                      </button>
                      <button (click)="editItem(item)" title="Edit" class="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                        <mat-icon class="text-[18px] w-[18px] h-[18px]">edit</mat-icon>
                      </button>
                      <button (click)="toggleStatus(item)" title="Toggle Status" class="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors">
                        <mat-icon class="text-[18px] w-[18px] h-[18px]">{{ item.status === 'active' ? 'block' : 'check_circle' }}</mat-icon>
                      </button>
                      <button (click)="duplicateItem(item)" title="Duplicate" class="p-1 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors">
                        <mat-icon class="text-[18px] w-[18px] h-[18px]">content_copy</mat-icon>
                      </button>
                      <button (click)="deleteItem(item)" title="Delete" class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors">
                        <mat-icon class="text-[18px] w-[18px] h-[18px]">delete</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- VIEW MODAL -->
    @if (viewingItem()) {
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 class="font-bold text-[#0f2540]">Item Details</h3>
            <button (click)="viewingItem.set(null)" class="text-slate-400 hover:text-slate-700">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <div class="grid grid-cols-2 gap-6">
              <div>
                <span class="text-xs font-bold text-slate-500 uppercase block mb-1">Item Name</span>
                <div class="text-slate-900 font-medium">{{ viewingItem()?.name }}</div>
              </div>
              <div>
                <span class="text-xs font-bold text-slate-500 uppercase block mb-1">SKU</span>
                <div class="text-slate-900 font-mono">{{ viewingItem()?.sku }}</div>
              </div>
              <div>
                <span class="text-xs font-bold text-slate-500 uppercase block mb-1">Type</span>
                <div class="text-slate-900">{{ viewingItem()?.type }}</div>
              </div>
              <div>
                <span class="text-xs font-bold text-slate-500 uppercase block mb-1">Unit of Measure</span>
                <div class="text-slate-900">{{ viewingItem()?.unitOfMeasure }}</div>
              </div>
              <div>
                <span class="text-xs font-bold text-slate-500 uppercase block mb-1">Purchase Price</span>
                <div class="text-slate-900 font-mono">₹{{ viewingItem()?.purchasePrice | number:'1.2-2' }}</div>
              </div>
              <div>
                <span class="text-xs font-bold text-slate-500 uppercase block mb-1">Selling Price</span>
                <div class="text-slate-900 font-mono font-bold text-emerald-600">₹{{ viewingItem()?.sellingPrice | number:'1.2-2' }}</div>
              </div>
              <div>
                <span class="text-xs font-bold text-slate-500 uppercase block mb-1">Status</span>
                <div class="text-slate-900 capitalize">{{ viewingItem()?.status }}</div>
              </div>
              <div>
                <span class="text-xs font-bold text-slate-500 uppercase block mb-1">HSN/SAC Code</span>
                <div class="text-slate-900 font-mono">{{ viewingItem()?.hsnSacCode || '-' }}</div>
              </div>
            </div>
            @if (viewingItem()?.description) {
              <div>
                <span class="text-xs font-bold text-slate-500 uppercase block mb-2">Description</span>
                <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700">{{ viewingItem()?.description }}</div>
              </div>
            }
          </div>
          <div class="p-5 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
            <button (click)="editItem(viewingItem()!); viewingItem.set(null)" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm">Edit Item</button>
            <button (click)="viewingItem.set(null)" class="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-bold text-sm">Close</button>
          </div>
        </div>
      </div>
    }

    <!-- ADD/EDIT MODAL -->
    @if (showFormModal()) {
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 class="font-bold text-[#0f2540]">{{ editingItem() ? 'Edit' : 'Add New' }} Item</h3>
            <button (click)="closeFormModal()" class="text-slate-400 hover:text-slate-700">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-6">
            <form [formGroup]="itemForm" class="space-y-6">
              <!-- Section 1: Basic Info -->
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h4 class="font-bold text-slate-900 uppercase text-sm mb-4">Basic Information</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="label-text">Item Name *</label>
                    <input type="text" formControlName="name" class="input-field" placeholder="e.g., Laptop Dell XPS">
                  </div>
                  <div>
                    <label class="label-text">SKU (Code) *</label>
                    <input type="text" formControlName="sku" class="input-field" placeholder="e.g., LAPTOP-001">
                  </div>
                  <div>
                    <label class="label-text">Type *</label>
                    <select formControlName="type" class="input-field">
                      <option value="">Select Type</option>
                      <option value="raw_material">Raw Material</option>
                      <option value="finished_goods">Finished Goods</option>
                      <option value="service">Service</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label class="label-text">Unit of Measure *</label>
                    <select formControlName="unitOfMeasure" class="input-field">
                      <option value="">Select UOM</option>
                      <option value="PCS">PCS (Pieces)</option>
                      <option value="KG">KG (Kilogram)</option>
                      <option value="LTR">LTR (Liter)</option>
                      <option value="MTR">MTR (Meter)</option>
                      <option value="BOX">BOX</option>
                      <option value="SET">SET</option>
                    </select>
                  </div>
                  <div>
                    <label class="label-text">HSN/SAC Code</label>
                    <input type="text" formControlName="hsnSacCode" class="input-field" placeholder="e.g., 9988">
                  </div>
                </div>
              </div>

              <!-- Section 2: Pricing -->
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h4 class="font-bold text-slate-900 uppercase text-sm mb-4">Pricing</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="label-text">Purchase Price (₹) *</label>
                    <input type="number" formControlName="purchasePrice" class="input-field" placeholder="0.00" step="0.01">
                  </div>
                  <div>
                    <label class="label-text">Selling Price (₹) *</label>
                    <input type="number" formControlName="sellingPrice" class="input-field" placeholder="0.00" step="0.01">
                  </div>
                  <div>
                    <label class="label-text">Profit Margin %</label>
                    <div class="text-slate-600 font-mono text-sm bg-slate-100 rounded-lg px-3 py-2 text-center">
                      {{ calculateMargin() }}%
                    </div>
                  </div>
                </div>
              </div>

              <!-- Section 3: Description -->
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h4 class="font-bold text-slate-900 uppercase text-sm mb-4">Additional Details</h4>
                <div>
                  <label class="label-text">Description</label>
                  <textarea formControlName="description" class="input-field resize-none" rows="3" placeholder="Item description (optional)"></textarea>
                </div>
                <div class="mt-4 flex items-center gap-2">
                  <input type="checkbox" formControlName="isActive" id="active-check" class="w-4 h-4 rounded border-slate-300">
                  <label for="active-check" class="text-sm text-slate-700 font-medium">Active Item</label>
                </div>
              </div>
            </form>
          </div>
          <div class="p-5 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
            <button (click)="closeFormModal()" class="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-bold text-sm">Cancel</button>
            <button (click)="saveItem()" [disabled]="saving() || itemForm.invalid" class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 font-bold text-sm">
              {{ saving() ? 'Saving...' : (editingItem() ? 'Update Item' : 'Create Item') }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .label-text { @apply block text-xs font-bold text-slate-600 uppercase mb-2 tracking-wide; }
    .input-field { @apply w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500; }
  `],
})
export class ClientInventoryItemsComponent implements OnInit {
  clientId = input.required<string>();

  private service = inject(InventoryService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  data = signal<any[]>([]);
  loading = signal(false);
  saving = signal(false);
  showFormModal = signal(false);
  viewingItem = signal<any | null>(null);
  editingItem = signal<any | null>(null);

  searchQuery = '';
  typeFilter = '';
  statusFilter = '';

  itemForm!: FormGroup;

  filteredData = () => {
    let result = this.data();

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      );
    }

    if (this.typeFilter) {
      result = result.filter(item => item.type === this.typeFilter);
    }

    if (this.statusFilter) {
      result = result.filter(item => item.status === this.statusFilter);
    }

    return result;
  };

  ngOnInit() {
    this.initForm();
    this.loadItems();
  }

  private initForm() {
    this.itemForm = this.fb.group({
      name: ['', Validators.required],
      sku: ['', Validators.required],
      type: ['', Validators.required],
      unitOfMeasure: ['PCS', Validators.required],
      hsnSacCode: [''],
      purchasePrice: [0, [Validators.required, Validators.min(0)]],
      sellingPrice: [0, [Validators.required, Validators.min(0)]],
      description: [''],
      isActive: [true],
    });
  }

  loadItems() {
    this.loading.set(true);
    this.service.getItems({ limit: 500 }).subscribe({
      next: (response: any) => {
        this.data.set(response.data || response || []);
      },
      error: (err) => {
        console.error('Failed to load items', err);
        this.toast.error('Failed to load items');
      },
      complete: () => this.loading.set(false),
    });
  }

  onFilterChange() {
    // Filtering happens via computed signal
  }

  calculateMargin(): string {
    const purchase = this.itemForm.get('purchasePrice')?.value || 0;
    const selling = this.itemForm.get('sellingPrice')?.value || 0;
    if (purchase === 0) return '0';
    const margin = ((selling - purchase) / purchase * 100).toFixed(1);
    return margin;
  }

  viewItem(item: any) {
    this.viewingItem.set(item);
  }

  openAddModal() {
    this.editingItem.set(null);
    this.itemForm.reset({ isActive: true, unitOfMeasure: 'PCS' });
    this.showFormModal.set(true);
  }

  editItem(item: any) {
    this.editingItem.set(item);
    this.itemForm.patchValue({
      name: item.name,
      sku: item.sku,
      type: item.type,
      unitOfMeasure: item.unitOfMeasure,
      hsnSacCode: item.hsnSacCode,
      purchasePrice: item.purchasePrice,
      sellingPrice: item.sellingPrice,
      description: item.description,
      isActive: item.status === 'active',
    });
    this.showFormModal.set(true);
    this.viewingItem.set(null);
  }

  saveItem() {
    if (this.itemForm.invalid) return;

    this.saving.set(true);
    const dto = {
      ...this.itemForm.value,
      status: this.itemForm.value.isActive ? 'active' : 'inactive',
    };
    delete dto.isActive;

    const request$ = this.editingItem()
      ? this.service.updateItem(this.editingItem().id, dto)
      : this.service.createItem(dto);

    request$.subscribe({
      next: () => {
        this.toast.success(this.editingItem() ? 'Item updated' : 'Item created');
        this.closeFormModal();
        this.loadItems();
      },
      error: (err) => {
        console.error('Failed to save item', err);
        this.toast.error('Failed to save item');
      },
      complete: () => this.saving.set(false),
    });
  }

  toggleStatus(item: any) {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    this.service.updateItem(item.id, { status: newStatus }).subscribe({
      next: () => {
        this.toast.success(`Item ${newStatus}`);
        this.loadItems();
      },
      error: (err) => this.toast.error('Failed to update status'),
    });
  }

  duplicateItem(item: any) {
    const newItem = { ...item, sku: `${item.sku}-COPY`, name: `${item.name} (Copy)` };
    delete newItem.id;
    delete newItem.createdAt;
    delete newItem.updatedAt;

    this.service.createItem(newItem).subscribe({
      next: () => {
        this.toast.success('Item duplicated');
        this.loadItems();
      },
      error: (err) => this.toast.error('Failed to duplicate item'),
    });
  }

  deleteItem(item: any) {
    if (!confirm(`Delete "${item.name}"?`)) return;

    this.service.deleteItem(item.id).subscribe({
      next: () => {
        this.toast.success('Item deleted');
        this.loadItems();
      },
      error: (err) => this.toast.error('Failed to delete item'),
    });
  }

  closeFormModal() {
    this.showFormModal.set(false);
    this.editingItem.set(null);
    this.itemForm.reset({ isActive: true, unitOfMeasure: 'PCS' });
  }

  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      'raw_material': 'bg-orange-100 text-orange-700',
      'finished_goods': 'bg-blue-100 text-blue-700',
      'service': 'bg-purple-100 text-purple-700',
      'other': 'bg-slate-100 text-slate-700',
    };
    return classes[type] || 'bg-slate-100 text-slate-700';
  }

  getStatusClass(status: string): string {
    return status === 'active'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-slate-100 text-slate-700';
  }
}

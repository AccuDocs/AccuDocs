import { Component, inject, input, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryService } from '@core/services/inventory.service';
import { ToastService } from '@core/services/toast.service';
import type { PurchaseOrder, POLineItem, Item } from '@app/features/inventory/models/inventory.models';

@Component({
  selector: 'app-client-inventory-po',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReactiveFormsModule, DatePipe],
  template: `
    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 class="font-bold text-[#0f2540] text-sm uppercase">Purchase Orders</h3>
        <button (click)="openCreateModal.set(true)" class="flex items-center gap-1 text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow">
          <mat-icon class="text-[16px] w-4 h-4">add</mat-icon> New PO
        </button>
      </div>

      <!-- Filters -->
      <div class="p-4 flex flex-col md:flex-row gap-4 bg-white border-b border-slate-100">
        <select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()" class="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="partial">Partial</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input type="date" [(ngModel)]="dateFrom" (ngModelChange)="onFilterChange()" class="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500" title="From">
        <input type="date" [(ngModel)]="dateTo" (ngModelChange)="onFilterChange()" class="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-indigo-500" title="To">
        <div class="flex-1 relative">
          <mat-icon class="absolute left-3 top-2.5 text-slate-400">search</mat-icon>
          <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="onFilterChange()" placeholder="Search PO..." class="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500">
        </div>
      </div>

      <!-- Table -->
      <div class="flex-1 overflow-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider sticky top-0">
            <tr>
              <th class="px-4 py-3 text-left border-y border-slate-200">PO Number</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">Date</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">Line Items</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Total</th>
              <th class="px-4 py-3 text-left border-y border-slate-200">Expected Delivery</th>
              <th class="px-4 py-3 text-center border-y border-slate-200">Status</th>
              <th class="px-4 py-3 text-right border-y border-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @if (loading()) {
              <tr><td colspan="7" class="py-12 text-center text-slate-400">Loading purchase orders...</td></tr>
            } @else if (filteredData().length === 0) {
              <tr><td colspan="7" class="py-12 text-center text-slate-400">No purchase orders found</td></tr>
            } @else {
              @for (po of filteredData(); track po.id) {
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3 font-mono text-indigo-600 font-bold cursor-pointer" (click)="expandRow(po.id)">{{ po.poNumber }}</td>
                  <td class="px-4 py-3 text-[11px] text-slate-600">{{ po.poDate | date:'dd MMM yyyy' }}</td>
                  <td class="px-4 py-3 text-slate-500 text-[11px]">{{ (po.items?.length || 0) }} item(s)</td>
                  <td class="px-4 py-3 text-right font-mono font-bold text-slate-900">₹{{ po.total | number:'1.2-2' }}</td>
                  <td class="px-4 py-3 text-[11px] text-slate-500">{{ po.expectedDeliveryDate ? (po.expectedDeliveryDate | date:'dd MMM yyyy') : '-' }}</td>
                  <td class="px-4 py-3 text-center">
                    <span class="text-[9px] uppercase font-bold px-2 py-1 rounded-full" [ngClass]="getStatusBadgeClass(po.status)">
                      {{ po.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right flex items-center justify-end gap-2">
                    @if (po.status === 'sent' || po.status === 'partial') {
                      <button (click)="showReceiveModal(po)" title="Receive" class="text-slate-400 hover:text-emerald-600 transition-colors">
                        <mat-icon class="text-[18px] w-[18px] h-[18px]">inventory_2</mat-icon>
                      </button>
                    }
                    @if (po.status === 'draft') {
                      <button (click)="editPO(po)" title="Edit" class="text-slate-400 hover:text-blue-600 transition-colors">
                        <mat-icon class="text-[18px] w-[18px] h-[18px]">edit</mat-icon>
                      </button>
                    }
                    <button (click)="downloadPDF(po)" title="Download PDF" class="text-slate-400 hover:text-indigo-600 transition-colors">
                      <mat-icon class="text-[18px] w-[18px] h-[18px]">download</mat-icon>
                    </button>
                    @if (po.status === 'draft') {
                      <button (click)="cancelPO(po)" title="Cancel" class="text-slate-400 hover:text-rose-600 transition-colors">
                        <mat-icon class="text-[18px] w-[18px] h-[18px]">close</mat-icon>
                      </button>
                    }
                  </td>
                </tr>
                @if (expandedRowId() === po.id) {
                  <tr class="bg-slate-50">
                    <td colspan="7" class="px-4 py-4">
                      <div class="bg-white border border-slate-200 rounded-lg p-4">
                        <h4 class="font-bold text-slate-900 mb-3">Line Items</h4>
                        <table class="w-full text-xs">
                          <thead class="bg-slate-100">
                            <tr>
                              <th class="px-2 py-2 text-left">Item</th>
                              <th class="px-2 py-2 text-right">Ordered</th>
                              <th class="px-2 py-2 text-right">Received</th>
                              <th class="px-2 py-2 text-right">Price</th>
                              <th class="px-2 py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y">
                            @for (item of po.items; track item.id) {
                              <tr>
                                <td class="px-2 py-2">{{ item.item?.name || item.itemId }}</td>
                                <td class="px-2 py-2 text-right font-mono">{{ item.qtyOrdered }}</td>
                                <td class="px-2 py-2 text-right font-mono">{{ item.qtyReceived }}</td>
                                <td class="px-2 py-2 text-right font-mono">₹{{ item.unitPrice | number:'1.2-2' }}</td>
                                <td class="px-2 py-2 text-right font-mono font-bold">₹{{ item.total | number:'1.2-2' }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                }
              }
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- CREATE/EDIT PO MODAL -->
    @if (openCreateModal()) {
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 class="font-bold text-[#0f2540]">Create Purchase Order</h3>
            <button (click)="closeModals()" class="text-slate-400 hover:text-slate-700">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="flex-1 overflow-auto p-6 space-y-4">
            <form [formGroup]="poForm" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Supplier</label>
                  <input type="text" [value]="clientId()" disabled class="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600">
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
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">PO Date *</label>
                  <input type="date" formControlName="poDate" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Expected Delivery</label>
                  <input type="date" formControlName="expectedDeliveryDate" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500">
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Line Items *</label>
                <div class="space-y-2 bg-slate-50 p-3 rounded-lg">
                  @for (item of lineItems(); track $index; let i = $index) {
                    <div class="flex gap-2 items-end">
                      <input type="text" placeholder="Item" [(ngModel)]="item.itemName" [ngModelOptions]="{standalone: true}" readonly class="flex-1 px-2 py-2 border border-slate-300 rounded text-xs bg-white">
                      <input type="number" placeholder="Qty" [(ngModel)]="item.qty" [ngModelOptions]="{standalone: true}" class="w-16 px-2 py-2 border border-slate-300 rounded text-xs">
                      <input type="number" placeholder="Price" [(ngModel)]="item.price" [ngModelOptions]="{standalone: true}" class="w-24 px-2 py-2 border border-slate-300 rounded text-xs">
                      <button type="button" (click)="removeLineItem(i)" class="text-rose-600 hover:text-rose-700">
                        <mat-icon class="text-[18px]">delete</mat-icon>
                      </button>
                    </div>
                  }
                  <button type="button" (click)="addLineItem()" class="text-xs text-indigo-600 hover:text-indigo-700 font-bold">
                    + Add Item
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                <textarea formControlName="notes" placeholder="Any special instructions..." rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"></textarea>
              </div>
            </form>
          </div>
          <div class="p-5 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
            <button (click)="closeModals()" class="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button (click)="savePO()" [disabled]="saving()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
              {{ saving() ? 'Saving...' : 'Create PO' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- RECEIVE PO MODAL -->
    @if (showReceiveModalFlag() && selectedPO()) {
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 class="font-bold text-[#0f2540]">Receive PO {{ selectedPO()?.poNumber }}</h3>
            <button (click)="closeModals()" class="text-slate-400 hover:text-slate-700">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="flex-1 overflow-auto p-6 space-y-4">
            <form [formGroup]="receiveForm" class="space-y-4">
              @for (item of selectedPO()?.items; track item.id) {
                <div class="border border-slate-200 rounded-lg p-4">
                  <div class="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <span class="text-xs font-bold text-slate-500 uppercase">Item</span>
                      <div class="text-slate-900">{{ item.item?.name }}</div>
                    </div>
                    <div>
                      <span class="text-xs font-bold text-slate-500 uppercase">Ordered Qty</span>
                      <div class="text-slate-900">{{ item.qtyOrdered }}</div>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Receiving Qty *</label>
                      <input type="number" [formControl]="getReceivingQtyControl(item.id)" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500">
                    </div>
                    <div>
                      <label class="text-xs font-bold text-slate-500 uppercase block mb-1">Batch Number</label>
                      <input type="text" [formControl]="getBatchNoControl(item.id)" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500">
                    </div>
                  </div>
                </div>
              }
            </form>
          </div>
          <div class="p-5 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
            <button (click)="closeModals()" class="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <button (click)="submitReceive()" [disabled]="receiving()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50">
              {{ receiving() ? 'Receiving...' : 'Confirm Receipt' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
  `],
})
export class ClientInventoryPOComponent implements OnInit {
  clientId = input.required<string>();

  private service = inject(InventoryService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  data = signal<PurchaseOrder[]>([]);
  loading = signal(false);
  saving = signal(false);
  receiving = signal(false);
  warehouses = signal<any[]>([]);

  statusFilter = '';
  dateFrom = '';
  dateTo = '';
  searchQuery = '';

  openCreateModal = signal(false);
  showReceiveModalFlag = signal(false);
  expandedRowId = signal<string | null>(null);
  selectedPO = signal<PurchaseOrder | null>(null);

  poForm!: FormGroup;
  receiveForm!: FormGroup;
  
  lineItems = signal<any[]>([{ itemId: '', itemName: '', qty: 1, price: 0 }]);

  receivingQtyControls = new Map<string, any>();
  batchNoControls = new Map<string, any>();

  filteredData = () => {
    let result = this.data();
    
    if (this.statusFilter) {
      result = result.filter(po => po.status === this.statusFilter);
    }
    
    if (this.dateFrom) {
      const from = new Date(this.dateFrom).getTime();
      result = result.filter(po => new Date(po.poDate).getTime() >= from);
    }
    
    if (this.dateTo) {
      const to = new Date(this.dateTo).getTime();
      result = result.filter(po => new Date(po.poDate).getTime() <= to);
    }
    
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(po => po.poNumber.toLowerCase().includes(q));
    }
    
    return result;
  };

  ngOnInit() {
    this.initForms();
    this.loadData();
    this.loadWarehouses();
  }

  private initForms() {
    this.poForm = this.fb.group({
      warehouseId: ['', Validators.required],
      poDate: [new Date().toISOString().split('T')[0], Validators.required],
      expectedDeliveryDate: [''],
      notes: [''],
    });

    this.receiveForm = this.fb.group({});
  }

  loadData() {
    this.loading.set(true);
    this.service.getPurchaseOrders({ clientId: this.clientId() }).subscribe({
      next: (response: any) => {
        this.data.set(response.data || response || []);
      },
      error: (err) => {
        console.error('Failed to load POs', err);
        this.toast.error('Failed to load purchase orders');
      },
      complete: () => this.loading.set(false),
    });
  }

  loadWarehouses() {
    this.service.getWarehouses().subscribe({
      next: (response: any) => {
        this.warehouses.set(response.data || response || []);
      },
      error: (err) => console.error('Failed to load warehouses', err),
    });
  }

  onFilterChange() {
    // Filtering happens via computed signal
  }

  expandRow(poId: string) {
    this.expandedRowId.set(this.expandedRowId() === poId ? null : poId);
  }

  showReceiveModal(po: PurchaseOrder) {
    this.selectedPO.set(po);
    this.showReceiveModalFlag.set(true);
    
    // Initialize receive form controls
    this.receivingQtyControls.clear();
    this.batchNoControls.clear();
    (po.items || []).forEach(item => {
      this.receivingQtyControls.set(item.id, this.fb.control(item.qtyOrdered - item.qtyReceived));
      this.batchNoControls.set(item.id, this.fb.control(''));
    });
  }

  getReceivingQtyControl(itemId: string) {
    return this.receivingQtyControls.get(itemId) || this.fb.control(0);
  }

  getBatchNoControl(itemId: string) {
    return this.batchNoControls.get(itemId) || this.fb.control('');
  }

  editPO(po: PurchaseOrder) {
    // Navigate to edit page or open modal
    this.toast.info('Edit PO not yet implemented');
  }

  downloadPDF(po: PurchaseOrder) {
    this.service.downloadPOPdf(po.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `PO_${po.poNumber}.pdf`;
        link.click();
      },
      error: (err) => {
        console.error('Failed to download PO PDF', err);
        this.toast.error('Failed to download PO');
      },
    });
  }

  cancelPO(po: PurchaseOrder) {
    if (!confirm('Are you sure you want to cancel this PO?')) return;

    this.service.cancelPurchaseOrder(po.id).subscribe({
      next: () => {
        this.toast.success(`PO ${po.poNumber} cancelled`);
        this.loadData();
      },
      error: (err) => {
        console.error('Failed to cancel PO', err);
        this.toast.error('Failed to cancel PO');
      },
    });
  }

  addLineItem() {
    const items = this.lineItems();
    items.push({ itemId: '', itemName: '', qty: 1, price: 0 });
    this.lineItems.set([...items]);
  }

  removeLineItem(index: number) {
    const items = this.lineItems().filter((_, i) => i !== index);
    this.lineItems.set(items);
  }

  savePO() {
    if (this.poForm.invalid) {
      this.toast.error('Please fill required fields');
      return;
    }

    this.saving.set(true);
    const dto = {
      supplierClientId: this.clientId(),
      warehouseId: this.poForm.value.warehouseId,
      poDate: this.poForm.value.poDate,
      expectedDeliveryDate: this.poForm.value.expectedDeliveryDate,
      notes: this.poForm.value.notes,
      lineItems: this.lineItems().map(li => ({
        itemId: li.itemId,
        qtyOrdered: li.qty,
        unitPrice: li.price,
      })),
    };

    this.service.createPurchaseOrder(dto).subscribe({
      next: (po) => {
        this.toast.success(`PO ${po.poNumber} created`);
        this.closeModals();
        this.loadData();
      },
      error: (err) => {
        console.error('Failed to create PO', err);
        this.toast.error('Failed to create PO');
      },
      complete: () => this.saving.set(false),
    });
  }

  submitReceive() {
    const po = this.selectedPO();
    if (!po) return;

    this.receiving.set(true);
    const receivedItems = (po.items || []).map(item => ({
      poItemId: item.id,
      qtyReceived: this.receivingQtyControls.get(item.id)?.value || 0,
      batchNo: this.batchNoControls.get(item.id)?.value || undefined,
    }));

    this.service.receivePurchaseOrder(po.id, { receivedItems }).subscribe({
      next: () => {
        this.toast.success(`PO ${po.poNumber} receipt recorded`);
        this.closeModals();
        this.loadData();
      },
      error: (err) => {
        console.error('Failed to receive PO', err);
        this.toast.error('Failed to receive PO');
      },
      complete: () => this.receiving.set(false),
    });
  }

  closeModals() {
    this.openCreateModal.set(false);
    this.showReceiveModalFlag.set(false);
    this.selectedPO.set(null);
    this.lineItems.set([{ itemId: '', itemName: '', qty: 1, price: 0 }]);
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'draft': 'bg-slate-200 text-slate-600',
      'sent': 'bg-blue-100 text-blue-700',
      'partial': 'bg-amber-100 text-amber-700',
      'received': 'bg-emerald-100 text-emerald-700',
      'cancelled': 'bg-rose-100 text-rose-700',
    };
    return classes[status] || 'bg-slate-100 text-slate-600';
  }
}

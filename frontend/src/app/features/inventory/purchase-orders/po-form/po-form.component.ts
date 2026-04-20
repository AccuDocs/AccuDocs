import { Component, inject, signal, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '@core/services/inventory.service';
import { ClientService } from '@core/services/client.service';

@Component({
  selector: 'app-po-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6">
      <div class="flex items-center gap-3 mb-8">
        @if(!inlineMode) {
          <a routerLink="/inventory/purchase-orders" class="text-slate-400 hover:text-white"><mat-icon>arrow_back</mat-icon></a>
        }
        <h1 class="text-xl font-bold">New Purchase Order</h1>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="max-w-5xl space-y-6">

        <!-- Header -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <h2 class="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-5">Order Details</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="md:col-span-2">
              <label class="label-sm">Supplier (Client) *</label>
              <select formControlName="supplierClientId" class="input-field" (change)="onSupplierChange()">
                <option value="">— Select Supplier —</option>
                @for (c of clients(); track c.id) {
                  <option [value]="c.id">{{ c.user?.name || c.businessName }}</option>
                }
              </select>
              @if (selectedSupplier()) {
                <a [routerLink]="['/clients/client', form.value.supplierClientId]"
                   class="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-flex items-center gap-1">
                  <mat-icon class="text-[12px] w-3 h-3">open_in_new</mat-icon> View Supplier Workspace
                </a>
              }
            </div>
            <div>
              <label class="label-sm">Warehouse *</label>
              <select formControlName="warehouseId" class="input-field">
                <option value="">— Select Warehouse —</option>
                @for (wh of warehouses(); track wh.id) {
                  <option [value]="wh.id">{{ wh.name }}</option>
                }
              </select>
            </div>
            <div>
              <label class="label-sm">PO Date</label>
              <input formControlName="poDate" type="date" class="input-field"/>
            </div>
            <div>
              <label class="label-sm">Expected Delivery</label>
              <input formControlName="expectedDeliveryDate" type="date" class="input-field"/>
            </div>
            <div class="md:col-span-2">
              <label class="label-sm">Notes</label>
              <textarea formControlName="notes" rows="2" class="input-field resize-none" placeholder="Internal notes…"></textarea>
            </div>
          </div>
        </div>

        <!-- Line Items -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-sm font-bold text-emerald-400 uppercase tracking-wider">Line Items</h2>
            <button type="button" (click)="addLine()"
                    class="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg transition-all">
              <mat-icon class="text-[14px] w-3.5 h-3.5">add</mat-icon> Add Line
            </button>
          </div>

          <!-- Table Header -->
          <div class="grid grid-cols-12 gap-2 text-[10px] text-slate-400 uppercase tracking-wider mb-2 px-1">
            <div class="col-span-4">Item</div>
            <div class="col-span-2">HSN/SAC</div>
            <div class="col-span-1">Qty</div>
            <div class="col-span-2">Unit Price</div>
            <div class="col-span-1">GST%</div>
            <div class="col-span-1">Total</div>
            <div class="col-span-1"></div>
          </div>

          <div formArrayName="lineItems" class="space-y-2">
            @for (line of lineItems.controls; track $index) {
              <div [formGroupName]="$index" class="grid grid-cols-12 gap-2 items-center bg-slate-800/40 rounded-lg px-2 py-2">
                <div class="col-span-4">
                  <select formControlName="itemId" class="input-sm" (change)="onItemChange($index)">
                    <option value="">— Item —</option>
                    @for (item of items(); track item.id) {
                      <option [value]="item.id">{{ item.name }}</option>
                    }
                  </select>
                </div>
                <div class="col-span-2">
                  <input formControlName="hsnSacCode" type="text" class="input-sm" placeholder="HSN"/>
                </div>
                <div class="col-span-1">
                  <input formControlName="qtyOrdered" type="number" min="0.001" step="0.001" class="input-sm text-right"
                         (input)="calcLine($index)"/>
                </div>
                <div class="col-span-2">
                  <input formControlName="unitPrice" type="number" min="0" step="0.01" class="input-sm text-right"
                         (input)="calcLine($index)"/>
                </div>
                <div class="col-span-1">
                  <select formControlName="gstRate" class="input-sm" (change)="calcLine($index)">
                    @for (r of [0,5,12,18,28]; track r) { <option [value]="r">{{ r }}%</option> }
                  </select>
                </div>
                <div class="col-span-1 text-right font-mono text-sm text-emerald-400 font-bold">
                  ₹{{ lineTotal($index) | number:'1.0-0' }}
                </div>
                <div class="col-span-1 flex justify-center">
                  <button type="button" (click)="removeLine($index)"
                          class="text-slate-500 hover:text-rose-400 transition-colors">
                    <mat-icon class="text-[16px] w-4 h-4">delete</mat-icon>
                  </button>
                </div>
              </div>
            } @empty {
              <div class="text-center py-8 text-slate-500 text-sm">No line items. Click "Add Line" to begin.</div>
            }
          </div>

          <!-- Totals -->
          @if (lineItems.length > 0) {
            <div class="mt-4 pt-4 border-t border-slate-700 flex justify-end">
              <div class="w-64 space-y-1 text-sm">
                <div class="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span class="font-mono">₹{{ grandSubtotal() | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between text-slate-400">
                  <span>GST</span>
                  <span class="font-mono">₹{{ grandGst() | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between text-white font-bold border-t border-slate-600 pt-1 text-base">
                  <span>Total</span>
                  <span class="font-mono text-emerald-400">₹{{ grandTotal() | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Submit -->
        <div class="flex gap-4 pb-10">
          <button type="submit" [disabled]="saving() || form.invalid || lineItems.length === 0"
                  class="flex-1 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all disabled:opacity-60">
            {{ saving() ? 'Creating…' : 'Create Purchase Order' }}
          </button>
          @if(inlineMode) {
            <button type="button" (click)="cancelled.emit()"
               class="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all">
              Cancel
            </button>
          } @else {
            <a routerLink="/inventory/purchase-orders"
               class="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all">
              Cancel
            </a>
          }
        </div>
      </form>
    </div>
  `,
  styles: [`
    .label-sm { @apply block text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide; }
    .input-field { @apply w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500; }
    .input-sm { @apply w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500; }
  `],
})
export class PoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(InventoryService);
  private clientService = inject(ClientService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  saving = signal(false);
  
  @Input() inlineMode = false;
  @Input() inlineId: string | null = null;
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();
  
  clients = signal<any[]>([]);
  warehouses = signal<any[]>([]);
  items = signal<any[]>([]);
  selectedSupplier = signal<any>(null);
  private lineTotals: number[] = [];

  form: FormGroup = this.fb.group({
    supplierClientId:     ['', Validators.required],
    warehouseId:          ['', Validators.required],
    poDate:               [new Date().toISOString().substr(0, 10)],
    expectedDeliveryDate: [null],
    notes:                [''],
    lineItems:            this.fb.array([], Validators.minLength(1)),
  });

  get lineItems() { return this.form.get('lineItems') as FormArray; }

  ngOnInit() {
    this.clientService.getClients().subscribe((res: any) => this.clients.set(res.data ?? []));
    this.service.getWarehouses().subscribe((res: any) => this.warehouses.set(res.data ?? []));
    this.service.getItems({ limit: 500 }).subscribe((res: any) => this.items.set(res.data ?? []));

    const itemId = this.inlineMode ? null : this.route.snapshot.queryParamMap.get('itemId');
    const qty    = this.inlineMode ? null : this.route.snapshot.queryParamMap.get('qty');
    if (itemId) { this.addLine(itemId, Number(qty) || 1); }
  }

  onSupplierChange() {
    const id = this.form.value.supplierClientId;
    this.selectedSupplier.set(this.clients().find(c => c.id === id) ?? null);
  }

  addLine(itemId = '', qty = 1) {
    this.lineItems.push(this.fb.group({
      itemId:     [itemId],
      hsnSacCode: [''],
      qtyOrdered: [qty, [Validators.required, Validators.min(0.001)]],
      unitPrice:  [0, Validators.required],
      gstRate:    [18],
      variantId:  [null],
      batchNo:    [''],
    }));
    this.lineTotals.push(0);
  }

  removeLine(i: number) { this.lineItems.removeAt(i); this.lineTotals.splice(i, 1); }

  onItemChange(i: number) {
    const itemId = this.lineItems.at(i).value.itemId;
    const item = this.items().find((it: any) => it.id === itemId);
    if (item) {
      this.lineItems.at(i).patchValue({
        hsnSacCode: item.hsnSacCode ?? '',
        unitPrice: item.purchasePrice,
        gstRate: item.gstRate,
      });
      this.calcLine(i);
    }
  }

  calcLine(i: number) {
    const v = this.lineItems.at(i).value;
    const subtotal = (v.qtyOrdered ?? 0) * (v.unitPrice ?? 0);
    const gst = subtotal * ((v.gstRate ?? 0) / 100);
    this.lineTotals[i] = subtotal + gst;
  }

  lineTotal(i: number): number { return this.lineTotals[i] ?? 0; }

  grandSubtotal() {
    return this.lineItems.controls.reduce((s, c) => {
      const v = c.value; return s + (v.qtyOrdered ?? 0) * (v.unitPrice ?? 0);
    }, 0);
  }

  grandGst() {
    return this.lineItems.controls.reduce((s, c) => {
      const v = c.value; const sub = (v.qtyOrdered ?? 0) * (v.unitPrice ?? 0);
      return s + sub * ((v.gstRate ?? 0) / 100);
    }, 0);
  }

  grandTotal() { return this.grandSubtotal() + this.grandGst(); }

  submit() {
    if (this.form.invalid || this.lineItems.length === 0) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.service.createPurchaseOrder(this.form.value).subscribe({
      next: (res) => {
        if (this.inlineMode) {
          this.saved.emit(res);
        } else {
          this.router.navigate(['/inventory/purchase-orders']);
        }
      },
      error: () => this.saving.set(false),
    });
  }
}

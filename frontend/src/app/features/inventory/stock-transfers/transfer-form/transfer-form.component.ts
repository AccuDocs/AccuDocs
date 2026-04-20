import { Component, inject, signal, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '@core/services/inventory.service';

@Component({
  selector: 'app-transfer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6">
      <div class="flex items-center gap-3 mb-8">
        @if(!inlineMode) {
          <a routerLink="/inventory/transfers" class="text-slate-400 hover:text-white"><mat-icon>arrow_back</mat-icon></a>
        }
        <h1 class="text-xl font-bold">New Stock Transfer</h1>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="max-w-4xl space-y-6">
        <!-- Header -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <h2 class="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-5">Transfer Details</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="label-sm">From Warehouse *</label>
              <select formControlName="fromWarehouseId" class="input-field">
                <option value="">— Select —</option>
                @for (wh of warehouses(); track wh.id) { <option [value]="wh.id">{{ wh.name }}</option> }
              </select>
            </div>
            <div>
              <label class="label-sm">To Warehouse *</label>
              <select formControlName="toWarehouseId" class="input-field">
                <option value="">— Select —</option>
                @for (wh of warehouses(); track wh.id) { <option [value]="wh.id">{{ wh.name }}</option> }
              </select>
            </div>
            <div>
              <label class="label-sm">Transfer Date</label>
              <input formControlName="transferDate" type="date" class="input-field"/>
            </div>
            <div class="md:col-span-3">
              <label class="label-sm">Notes</label>
              <input formControlName="notes" type="text" class="input-field" placeholder="Optional notes"/>
            </div>
          </div>
        </div>

        <!-- Items -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-sm font-bold text-emerald-400 uppercase tracking-wider">Items to Transfer</h2>
            <button type="button" (click)="addLine()"
                    class="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg">
              <mat-icon class="text-[14px] w-3.5 h-3.5">add</mat-icon> Add Item
            </button>
          </div>

          <div formArrayName="items" class="space-y-2">
            @for (ctrl of itemLines.controls; track $index) {
              <div [formGroupName]="$index" class="grid grid-cols-10 gap-3 items-center bg-slate-800/40 rounded-lg px-3 py-3">
                <div class="col-span-4">
                  <select formControlName="itemId" class="input-sm" (change)="onItemPick($index)">
                    <option value="">— Item —</option>
                    @for (item of items(); track item.id) { <option [value]="item.id">{{ item.name }}</option> }
                  </select>
                </div>
                <div class="col-span-2">
                  <label class="text-[9px] text-slate-500 uppercase block mb-0.5">Available</label>
                  <span class="text-xs font-mono text-emerald-400 font-bold">{{ availableQty($index) }}</span>
                </div>
                <div class="col-span-2">
                  <input formControlName="qty" type="number" min="0.001" step="0.001" placeholder="Qty"
                         class="input-sm text-right" [max]="availableQty($index)"/>
                </div>
                <div class="col-span-1">
                  <input formControlName="batchNo" type="text" placeholder="Batch" class="input-sm"/>
                </div>
                <div class="col-span-1 flex justify-center">
                  <button type="button" (click)="removeLine($index)" class="text-slate-500 hover:text-rose-400">
                    <mat-icon class="text-[16px] w-4 h-4">delete</mat-icon>
                  </button>
                </div>
              </div>
            } @empty {
              <div class="text-center py-8 text-slate-500 text-sm">Click "Add Item" to begin</div>
            }
          </div>
        </div>

        <div class="flex gap-4 pb-10">
          <button type="submit" [disabled]="saving() || form.invalid || itemLines.length === 0"
                  class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-60">
            {{ saving() ? 'Creating…' : 'Create Transfer' }}
          </button>
          @if(inlineMode) {
            <button type="button" (click)="cancelled.emit()"
               class="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl">
              Cancel
            </button>
          } @else {
            <a routerLink="/inventory/transfers" class="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl">Cancel</a>
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
export class TransferFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(InventoryService);
  private router = inject(Router);

  saving = signal(false);
  
  @Input() inlineMode = false;
  @Input() inlineId: string | null = null;
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();
  
  warehouses = signal<any[]>([]);
  items = signal<any[]>([]);
  private stockMap = new Map<string, number>();

  form = this.fb.group({
    fromWarehouseId: ['', Validators.required],
    toWarehouseId:   ['', Validators.required],
    transferDate:    [new Date().toISOString().substr(0, 10)],
    notes:           [''],
    items:           this.fb.array([], Validators.minLength(1)),
  });

  get itemLines() { return this.form.get('items') as FormArray; }

  ngOnInit() {
    this.service.getWarehouses().subscribe((res: any) => this.warehouses.set(res.data ?? []));
    this.service.getItems({ limit: 500 }).subscribe((res: any) => this.items.set(res.data ?? []));
  }

  addLine() {
    this.itemLines.push(this.fb.group({
      itemId:    ['', Validators.required],
      variantId: [null],
      qty:       [1, [Validators.required, Validators.min(0.001)]],
      unitCost:  [0],
      batchNo:   [''],
      serialNo:  [''],
    }));
  }

  removeLine(i: number) { this.itemLines.removeAt(i); }

  onItemPick(i: number) {
    const itemId = this.itemLines.at(i).value.itemId;
    const item = this.items().find((it: any) => it.id === itemId);
    if (item) {
      this.itemLines.at(i).patchValue({ unitCost: item.purchasePrice });
      // Fetch available qty from warehouse stock if warehouse selected
      const warehouseId = this.form.value.fromWarehouseId;
      if (warehouseId) {
        this.service.getStockLedger({ warehouseId, itemId, limit: 1 }).subscribe({
          next: (res: any) => {
            const bal = res.data?.[0]?.runningBalance ?? 0;
            this.stockMap.set(`${warehouseId}_${itemId}`, bal);
          },
        });
      }
    }
  }

  availableQty(i: number): number {
    const v = this.itemLines.at(i).value;
    const key = `${this.form.value.fromWarehouseId}_${v.itemId}`;
    return this.stockMap.get(key) ?? 0;
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.service.createTransfer(this.form.value as any).subscribe({
      next: (res) => {
        if (this.inlineMode) {
          this.saved.emit(res);
        } else {
          this.router.navigate(['/inventory/transfers']);
        }
      },
      error: () => this.saving.set(false),
    });
  }
}

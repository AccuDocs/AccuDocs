import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '@core/services/inventory.service';

@Component({
  selector: 'app-po-receive',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6">
      <div class="flex items-center gap-3 mb-8">
        <a routerLink="/inventory/purchase-orders" class="text-slate-400 hover:text-white"><mat-icon>arrow_back</mat-icon></a>
        <h1 class="text-xl font-bold">Receive Purchase Order</h1>
      </div>

      @if (po()) {
        <!-- PO Header -->
        <div class="bg-slate-900/60 border border-emerald-700/30 rounded-xl p-5 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs text-slate-400 mb-1">Purchase Order</div>
              <div class="font-mono font-bold text-emerald-400 text-lg">{{ po()!.poNumber }}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-slate-400 mb-1">Supplier</div>
              <div class="font-semibold">{{ po()!.supplier?.name }}</div>
              <a [routerLink]="['/clients/client', po()!.supplierClientId]"
                 class="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 justify-end mt-0.5">
                <mat-icon class="text-[11px] w-3 h-3">open_in_new</mat-icon> View Supplier
              </a>
            </div>
            <div class="text-right">
              <div class="text-xs text-slate-400 mb-1">Warehouse</div>
              <div class="font-semibold">{{ po()!.warehouse?.name }}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-slate-400 mb-1">Total</div>
              <div class="font-mono font-bold text-white">₹{{ po()!.total | number:'1.0-0' }}</div>
            </div>
          </div>
        </div>

        <!-- Line Items -->
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden mb-6">
            <div class="px-5 py-4 border-b border-slate-800">
              <h2 class="text-sm font-bold text-emerald-400 uppercase tracking-wider">Items to Receive</h2>
            </div>
            <div formArrayName="receivedItems" class="divide-y divide-slate-800/50">
              @for (ctrl of receivedArr.controls; track $index) {
                <div [formGroupName]="$index" class="grid grid-cols-12 gap-4 px-5 py-4 items-center">
                  <div class="col-span-4">
                    <div class="font-semibold text-white">{{ lineItemName($index) }}</div>
                    <div class="text-xs text-slate-400 mt-0.5">Ordered: {{ orderedQty($index) }}</div>
                  </div>
                  <div class="col-span-3">
                    <label class="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Qty Received *</label>
                    <input formControlName="qtyReceived" type="number" min="0.001" step="0.001"
                           [max]="pendingQty($index)"
                           class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"/>
                    <div class="text-[10px] text-slate-500 mt-0.5">
                      Already received: {{ receivedSoFar($index) }} | Pending: {{ pendingQty($index) }}
                    </div>
                  </div>
                  <div class="col-span-3">
                    <label class="text-[10px] text-slate-500 uppercase tracking-wide block mb-1">Batch No.</label>
                    <input formControlName="batchNo" type="text"
                           class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                           placeholder="Optional"/>
                  </div>
                  <div class="col-span-2 text-right">
                    <span class="text-xs font-mono text-emerald-400 font-bold">
                      ₹{{ ((ctrl.value.qtyReceived || 0) * lineUnitPrice($index)) | number:'1.0-0' }}
                    </span>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="flex gap-4">
            <button type="submit" [disabled]="saving()"
                    class="flex-1 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all disabled:opacity-60">
              {{ saving() ? 'Processing…' : 'Confirm Receipt & Update Stock' }}
            </button>
            <a routerLink="/inventory/purchase-orders"
               class="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all">
              Cancel
            </a>
          </div>
        </form>
      } @else if (!loading()) {
        <p class="text-slate-500 text-center py-20">Purchase order not found</p>
      } @else {
        <div class="space-y-4 max-w-2xl">
          @for (i of [1,2,3]; track i) {
            <div class="h-20 bg-slate-900 rounded-xl animate-pulse"></div>
          }
        </div>
      }
    </div>
  `,
})
export class PoReceiveComponent implements OnInit {
  private service = inject(InventoryService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  po = signal<any>(null);
  loading = signal(true);
  saving = signal(false);

  form = this.fb.group({ receivedItems: this.fb.array([]) });
  get receivedArr() { return this.form.get('receivedItems') as FormArray; }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.service.getPurchaseOrderById(id).subscribe({
      next: (res: any) => {
        const poData = res.data;
        this.po.set(poData);
        (poData.items ?? []).forEach((item: any) => {
          this.receivedArr.push(this.fb.group({
            poItemId:    [item.id, Validators.required],
            qtyReceived: [Math.max(0, item.qtyOrdered - item.qtyReceived), [Validators.required, Validators.min(0)]],
            batchNo:     [''],
          }));
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  lineItemName(i: number): string { return this.po()?.items?.[i]?.item?.name ?? `Item ${i + 1}`; }
  orderedQty(i: number): number { return this.po()?.items?.[i]?.qtyOrdered ?? 0; }
  receivedSoFar(i: number): number { return this.po()?.items?.[i]?.qtyReceived ?? 0; }
  pendingQty(i: number): number { return this.orderedQty(i) - this.receivedSoFar(i); }
  lineUnitPrice(i: number): number { return this.po()?.items?.[i]?.unitPrice ?? 0; }

  submit() {
    this.saving.set(true);
    const id = this.po()?.id;
    const dto = { receivedItems: this.receivedArr.value.filter((r: any) => r.qtyReceived > 0) };
    this.service.receivePurchaseOrder(id, dto).subscribe({
      next: () => this.router.navigate(['/inventory/purchase-orders']),
      error: () => this.saving.set(false),
    });
  }
}

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '@core/services/inventory.service';

const GST_RATES = [0, 5, 12, 18, 28];
const UOM_OPTIONS = ['PCS', 'KG', 'G', 'LTR', 'ML', 'MTR', 'CM', 'BOX', 'PACK', 'DOZEN', 'NOS', 'SET'];

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-white p-6">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-8">
        <a routerLink="/inventory/items" class="text-slate-400 hover:text-white">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <h1 class="text-xl font-bold">{{ isEdit() ? 'Edit Item' : 'New Item' }}</h1>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="max-w-4xl space-y-6">

        <!-- Section 1: Basic Info -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <h2 class="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-5">Basic Information</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="label-sm">Item Name *</label>
              <input formControlName="name" type="text" class="input-field" placeholder="e.g. Wireless Mouse"/>
              @if (f['name'].invalid && f['name'].touched) {
                <p class="err-msg">Name is required</p>
              }
            </div>
            <div>
              <label class="label-sm">SKU (leave blank to auto-generate)</label>
              <input formControlName="sku" type="text" class="input-field" placeholder="e.g. ITEM-001"/>
            </div>
            <div>
              <label class="label-sm">Barcode</label>
              <input formControlName="barcode" type="text" class="input-field" placeholder="EAN-13 / QR"/>
            </div>
            <div>
              <label class="label-sm">Item Type *</label>
              <select formControlName="itemType" class="input-field">
                <option value="goods">Goods</option>
                <option value="service">Service</option>
              </select>
            </div>
            <div>
              <label class="label-sm">Unit of Measure *</label>
              <select formControlName="unitOfMeasure" class="input-field">
                @for (u of uoms; track u) { <option [value]="u">{{ u }}</option> }
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="label-sm">Description</label>
              <textarea formControlName="description" rows="2" class="input-field resize-none" placeholder="Optional description"></textarea>
            </div>
          </div>
        </div>

        <!-- Section 2: Pricing -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <h2 class="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-5">Pricing</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="label-sm">Purchase Price (₹) *</label>
              <input formControlName="purchasePrice" type="number" min="0" step="0.01" class="input-field"/>
            </div>
            <div>
              <label class="label-sm">Selling Price (₹) *</label>
              <input formControlName="sellingPrice" type="number" min="0" step="0.01" class="input-field"/>
            </div>
            <div>
              <label class="label-sm">MRP (₹)</label>
              <input formControlName="mrp" type="number" min="0" step="0.01" class="input-field"/>
            </div>
          </div>
        </div>

        <!-- Section 3: Tax -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <h2 class="text-sm font-bold uppercase tracking-wider text-amber-400 mb-5">Tax Settings</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="label-sm">HSN / SAC Code</label>
              <input formControlName="hsnSacCode" type="text" class="input-field" placeholder="e.g. 8471"/>
            </div>
            <div>
              <label class="label-sm">GST Rate *</label>
              <select formControlName="gstRate" class="input-field">
                @for (r of gstRates; track r) {
                  <option [value]="r">{{ r }}%</option>
                }
              </select>
            </div>
            <div>
              <label class="label-sm">Cess Rate (%)</label>
              <input formControlName="cessRate" type="number" min="0" step="0.1" class="input-field"/>
            </div>
          </div>
        </div>

        <!-- Section 4: Inventory Settings -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <h2 class="text-sm font-bold uppercase tracking-wider text-purple-400 mb-5">Inventory Settings</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center gap-3">
              <input formControlName="trackInventory" type="checkbox" id="trackInv" class="w-4 h-4 accent-indigo-500"/>
              <label for="trackInv" class="text-sm text-slate-300 cursor-pointer">Track Inventory</label>
            </div>
            <div class="flex items-center gap-3">
              <input formControlName="allowNegativeStock" type="checkbox" id="allowNeg" class="w-4 h-4 accent-amber-500"/>
              <label for="allowNeg" class="text-sm text-slate-300 cursor-pointer">Allow Negative Stock</label>
            </div>
            <div>
              <label class="label-sm">Reorder Point</label>
              <input formControlName="reorderPoint" type="number" min="0" class="input-field" placeholder="Alert when stock ≤ this"/>
            </div>
            <div>
              <label class="label-sm">Reorder Quantity</label>
              <input formControlName="reorderQty" type="number" min="0" class="input-field" placeholder="Suggested PO qty"/>
            </div>
          </div>
          <div class="mt-4 flex items-center gap-3">
            <input formControlName="isActive" type="checkbox" id="isActive" class="w-4 h-4 accent-emerald-500"/>
            <label for="isActive" class="text-sm text-slate-300 cursor-pointer">Item is Active</label>
          </div>
        </div>

        <!-- Section 5: Variants -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-sm font-bold uppercase tracking-wider text-rose-400">Variants (Optional)</h2>
            <button type="button" (click)="addVariantRow()"
                    class="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded-lg transition-all">
              <mat-icon class="text-[14px] w-3.5 h-3.5">add</mat-icon> Add Variant
            </button>
          </div>

          @if (variants.length === 0) {
            <p class="text-slate-500 text-sm text-center py-4">No variants — item has single SKU</p>
          } @else {
            <div class="space-y-3">
              @for (v of variants.controls; track $index) {
                <div [formGroup]="asGroup(v)" class="grid grid-cols-5 gap-3 items-end bg-slate-800/40 rounded-lg p-3">
                  <div class="col-span-2">
                    <label class="label-sm">Variant Name</label>
                    <input formControlName="variantName" type="text" class="input-field-sm" placeholder="e.g. Red / Large"/>
                  </div>
                  <div>
                    <label class="label-sm">SKU Suffix</label>
                    <input formControlName="skuSuffix" type="text" class="input-field-sm" placeholder="-RED"/>
                  </div>
                  <div>
                    <label class="label-sm">Extra Price</label>
                    <input formControlName="additionalPrice" type="number" min="0" class="input-field-sm"/>
                  </div>
                  <div class="flex justify-center pt-5">
                    <button type="button" (click)="removeVariantRow($index)"
                            class="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded transition-all">
                      <mat-icon class="text-[16px] w-4 h-4">delete</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Submit -->
        <div class="flex gap-4 pb-10">
          <button type="submit" [disabled]="saving()"
                  class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-60">
            {{ saving() ? 'Saving…' : isEdit() ? 'Update Item' : 'Create Item' }}
          </button>
          <a routerLink="/inventory/items"
             class="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all">
            Cancel
          </a>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .label-sm { @apply block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide; }
    .input-field { @apply w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors; }
    .input-field-sm { @apply w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500; }
    .err-msg { @apply text-rose-400 text-xs mt-1; }
  `],
})
export class ItemFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(InventoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  gstRates = GST_RATES;
  uoms = UOM_OPTIONS;

  isEdit = signal(false);
  saving = signal(false);
  private itemId: string | null = null;

  form: FormGroup = this.fb.group({
    name:               ['', Validators.required],
    sku:                [''],
    barcode:            [''],
    hsnSacCode:         [''],
    itemType:           ['goods', Validators.required],
    unitOfMeasure:      ['PCS', Validators.required],
    description:        [''],
    purchasePrice:      [0, [Validators.required, Validators.min(0)]],
    sellingPrice:       [0, [Validators.required, Validators.min(0)]],
    mrp:                [null],
    gstRate:            [18, Validators.required],
    cessRate:           [0],
    trackInventory:     [true],
    allowNegativeStock: [false],
    reorderPoint:       [null],
    reorderQty:         [null],
    isActive:           [true],
    variants:           this.fb.array([]),
  });

  get f() { return this.form.controls; }
  get variants() { return this.form.get('variants') as FormArray; }
  asGroup(c: any): FormGroup { return c as FormGroup; }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.itemId = id;
      this.service.getItemById(id).subscribe({
        next: (res: any) => this.patchForm(res.data),
      });
    }
  }

  private patchForm(item: any) {
    this.form.patchValue(item);
    (item.variants ?? []).forEach((v: any) => this.addVariantRow(v));
  }

  addVariantRow(data?: any) {
    this.variants.push(this.fb.group({
      variantName:     [data?.variantName ?? '', Validators.required],
      skuSuffix:       [data?.skuSuffix ?? ''],
      additionalPrice: [data?.additionalPrice ?? 0],
      isActive:        [data?.isActive ?? true],
    }));
  }

  removeVariantRow(i: number) { this.variants.removeAt(i); }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const value = this.form.value;
    const obs = this.isEdit() && this.itemId
      ? this.service.updateItem(this.itemId, value)
      : this.service.createItem(value);

    obs.subscribe({
      next: () => this.router.navigate(['/inventory/items']),
      error: () => this.saving.set(false),
    });
  }
}

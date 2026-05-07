import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InventoryService } from '@core/services/inventory.service';
import { CategoryService, CategoryNode } from '@core/services/category.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroSquares2x2,
  heroXMark,
  heroPlus,
  heroCheckCircle,
  heroDocumentText,
  heroQueueList,
  heroTrash,
  heroBolt,
  heroShieldCheck,
  heroClipboardDocumentCheck,
  heroPaperAirplane,
} from '@ng-icons/heroicons/outline';

const GST_RATES = [0, 5, 12, 18, 28];
const UOM_OPTIONS = ['PCS', 'KG', 'G', 'LTR', 'ML', 'MTR', 'CM', 'BOX', 'PACK', 'DOZEN', 'NOS', 'SET'];

interface CategoryOption extends CategoryNode {
  prefix: string;
  label: string;
}

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NgIconComponent],
  providers: [
    provideIcons({
      heroSquares2x2,
      heroXMark,
      heroPlus,
      heroCheckCircle,
      heroDocumentText,
      heroQueueList,
      heroTrash,
      heroBolt,
      heroShieldCheck,
      heroClipboardDocumentCheck,
      heroPaperAirplane,
    }),
  ],
  template: `
    <div class="inventory-studio-container p-6 animate-fade-in" [class.embedded]="inlineMode">
      <header class="studio-header mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div class="space-y-3">
          <div class="studio-badge">
            <ng-icon name="heroSquares2x2" size="14"></ng-icon>
            <span>Inventory Item</span>
          </div>
          <div>
            <h1 class="text-3xl font-black tracking-tight text-slate-900">{{ isEdit() ? 'Edit Inventory Item' : 'Create Inventory Item' }}</h1>
            <p class="mt-2 max-w-2xl text-sm font-medium text-slate-500">
              Manage item identity, pricing, GST settings, stock controls, and variants in a clean ERP-ready form.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          @if (inlineMode) {
            <button type="button" class="btn-studio-secondary" (click)="onCancel()" [disabled]="saving()">
              <ng-icon name="heroXMark" size="18"></ng-icon>
              <span>Cancel</span>
            </button>
          } @else {
            <a routerLink="/inventory/items" class="btn-studio-secondary">
              <ng-icon name="heroXMark" size="18"></ng-icon>
              <span>Back To Items</span>
            </a>
          }

          <button type="submit" class="btn-studio-primary" [disabled]="saving()" (click)="submit()">
            @if (saving()) {
              <div class="loader-sm"></div>
              <span>Saving...</span>
            } @else {
              <ng-icon [name]="isEdit() ? 'heroCheckCircle' : 'heroPaperAirplane'" size="18"></ng-icon>
              <span>{{ isEdit() ? 'Update Item' : 'Create Item' }}</span>
            }
          </button>
        </div>
      </header>

      @if (loadingItem()) {
        <div class="glass-card flex flex-col items-center justify-center py-24">
          <div class="loader-lg"></div>
          <p class="mt-4 text-xs font-black uppercase tracking-[0.24em] text-slate-400">Loading Inventory Record</p>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" class="studio-layout grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <main class="space-y-6">
            <section class="glass-card p-6">
              <div class="mb-6 flex items-center gap-3">
                <div class="section-icon">
                  <ng-icon name="heroDocumentText" size="20"></ng-icon>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-slate-900">Identity & Basics</h2>
                  <p class="mt-1 text-sm text-slate-500">Start with the catalog information customers and teams will rely on.</p>
                </div>
              </div>

              <div class="space-y-6">
                <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div class="md:col-span-2">
                    <label class="studio-label">Item Name</label>
                    <input formControlName="name" type="text" class="studio-input h-12" placeholder="e.g. Wireless Mouse" />
                    @if (f['name'].invalid && f['name'].touched) {
                      <p class="err-msg">Item name is required.</p>
                    }
                  </div>

                  <div class="md:col-span-2">
                    <label class="studio-label">Item Group / Category</label>
                    <select formControlName="categoryId" class="studio-select h-12" (change)="onCategoryChanged()">
                      <option [ngValue]="null">
                        {{ categoriesLoading() ? 'Loading groups...' : 'Select inventory group...' }}
                      </option>
                      @for (category of categoryOptions(); track category.id) {
                        <option [ngValue]="category.id">
                          {{ category.prefix }}{{ category.name }}{{ category.code ? ' (' + category.code + ')' : '' }}
                        </option>
                      }
                    </select>
                    @if (selectedCategory()) {
                      <div class="category-defaults mt-3">
                        <span>HSN: {{ selectedCategory()?.default_hsn || 'Not set' }}</span>
                        <span>GST: {{ selectedCategory()?.default_gst_rate != null ? selectedCategory()?.default_gst_rate + '%' : 'Not set' }}</span>
                        <span>UOM: {{ selectedCategory()?.default_uom || 'Not set' }}</span>
                        <button type="button" class="btn-studio-mini" (click)="applyCategoryDefaults()">Apply defaults</button>
                      </div>
                    } @else {
                      <p class="mt-2 text-xs font-semibold text-slate-400">Choose the group where this SKU should appear in Category Master.</p>
                    }
                  </div>

                  <div>
                    <label class="studio-label">SKU</label>
                    <input formControlName="sku" type="text" class="studio-input h-12" placeholder="Leave blank to auto-generate" />
                  </div>

                  <div>
                    <label class="studio-label">Barcode</label>
                    <input formControlName="barcode" type="text" class="studio-input h-12" placeholder="EAN-13 / QR / internal code" />
                  </div>

                  <div>
                    <label class="studio-label">Unit Of Measure</label>
                    <select formControlName="unitOfMeasure" class="studio-select h-12">
                      @for (u of uoms; track u) {
                        <option [value]="u">{{ u }}</option>
                      }
                    </select>
                  </div>

                  <div class="md:col-span-2">
                    <label class="studio-label">Description</label>
                    <textarea formControlName="description" rows="3" class="studio-input py-3" placeholder="Optional description for internal and billing use"></textarea>
                  </div>
                </div>

                <div>
                  <label class="studio-label">Item Type</label>
                  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label class="radio-tile" [class.active]="f['itemType'].value === 'goods'">
                      <input type="radio" formControlName="itemType" value="goods" class="hidden" />
                      <div>
                        <p class="text-sm font-bold text-slate-900">Goods</p>
                        <p class="mt-1 text-[11px] font-medium text-slate-500">Physical inventory with stock tracking, reorder logic, and warehouse movement.</p>
                      </div>
                    </label>
                    <label class="radio-tile" [class.active]="f['itemType'].value === 'service'">
                      <input type="radio" formControlName="itemType" value="service" class="hidden" />
                      <div>
                        <p class="text-sm font-bold text-slate-900">Service</p>
                        <p class="mt-1 text-[11px] font-medium text-slate-500">Non-stock service item used in billing, catalog, and tax workflows.</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section class="glass-card p-6">
              <div class="mb-6 flex items-center gap-3">
                <div class="section-icon">
                  <ng-icon name="heroBolt" size="20"></ng-icon>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-slate-900">Pricing Studio</h2>
                  <p class="mt-1 text-sm text-slate-500">Capture buy rate, sell rate, and price ceiling with the same clean studio treatment.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label class="studio-label">Purchase Price</label>
                  <div class="currency-field">
                    <span>&#8377;</span>
                    <input formControlName="purchasePrice" type="number" min="0" step="0.01" class="studio-input h-12 pl-8 text-right" />
                  </div>
                </div>

                <div>
                  <label class="studio-label">Selling Price</label>
                  <div class="currency-field">
                    <span>&#8377;</span>
                    <input formControlName="sellingPrice" type="number" min="0" step="0.01" class="studio-input h-12 pl-8 text-right" />
                  </div>
                </div>

                <div>
                  <label class="studio-label">MRP</label>
                  <div class="currency-field">
                    <span>&#8377;</span>
                    <input formControlName="mrp" type="number" min="0" step="0.01" class="studio-input h-12 pl-8 text-right" />
                  </div>
                </div>
              </div>
            </section>

            <section class="glass-card p-6">
              <div class="mb-6 flex items-center gap-3">
                <div class="section-icon">
                  <ng-icon name="heroShieldCheck" size="20"></ng-icon>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-slate-900">Tax Configuration</h2>
                  <p class="mt-1 text-sm text-slate-500">Keep billing-ready tax data beside the core catalog record.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label class="studio-label">HSN / SAC Code</label>
                  <input formControlName="hsnSacCode" type="text" class="studio-input h-12" placeholder="e.g. 8471" />
                </div>

                <div>
                  <label class="studio-label">GST Rate</label>
                  <select formControlName="gstRate" class="studio-select h-12">
                    @for (r of gstRates; track r) {
                      <option [value]="r">{{ r }}%</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="studio-label">Cess Rate</label>
                  <input formControlName="cessRate" type="number" min="0" step="0.1" class="studio-input h-12" placeholder="Optional" />
                </div>
              </div>
            </section>

            <section class="glass-card p-6">
              <div class="mb-6 flex items-center gap-3">
                <div class="section-icon">
                  <ng-icon name="heroClipboardDocumentCheck" size="20"></ng-icon>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-slate-900">Inventory Controls</h2>
                  <p class="mt-1 text-sm text-slate-500">Configure stock behavior, reorder triggers, and operational status.</p>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label class="toggle-card" [class.active]="!!f['trackInventory'].value">
                  <div>
                    <p class="text-sm font-bold text-slate-900">Track Inventory</p>
                    <p class="mt-1 text-[11px] font-medium text-slate-500">Enable quantity movement, stock reports, and replenishment controls.</p>
                  </div>
                  <input formControlName="trackInventory" type="checkbox" class="studio-checkbox" />
                </label>

                <label class="toggle-card" [class.active]="!!f['allowNegativeStock'].value">
                  <div>
                    <p class="text-sm font-bold text-slate-900">Allow Negative Stock</p>
                    <p class="mt-1 text-[11px] font-medium text-slate-500">Permit issue transactions even when available stock is below zero.</p>
                  </div>
                  <input formControlName="allowNegativeStock" type="checkbox" class="studio-checkbox" />
                </label>

                <div>
                  <label class="studio-label">Reorder Point</label>
                  <input formControlName="reorderPoint" type="number" min="0" class="studio-input h-12" placeholder="Alert threshold" />
                </div>

                <div>
                  <label class="studio-label">Reorder Quantity</label>
                  <input formControlName="reorderQty" type="number" min="0" class="studio-input h-12" placeholder="Suggested purchase quantity" />
                </div>

                <label class="toggle-card md:col-span-2" [class.active]="!!f['isActive'].value">
                  <div>
                    <p class="text-sm font-bold text-slate-900">Item Active</p>
                    <p class="mt-1 text-[11px] font-medium text-slate-500">Keep this item available in lists, selectors, and transactions.</p>
                  </div>
                  <input formControlName="isActive" type="checkbox" class="studio-checkbox" />
                </label>
              </div>
            </section>

            <section class="glass-card p-6">
              <div class="mb-6 flex items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                  <div class="section-icon">
                    <ng-icon name="heroQueueList" size="20"></ng-icon>
                  </div>
                  <div>
                    <h2 class="text-xl font-bold text-slate-900">Variants</h2>
                    <p class="mt-1 text-sm text-slate-500">Add optional size, color, or configuration variants under the same master item.</p>
                  </div>
                </div>

                <button type="button" class="btn-studio-text group" (click)="addVariantRow()">
                  <ng-icon name="heroPlus" size="18" class="transition-transform duration-300 group-hover:rotate-90"></ng-icon>
                  <span>Add Variant</span>
                </button>
              </div>

              @if (variants.length === 0) {
                <div class="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 px-6 py-10 text-center">
                  <p class="text-sm font-bold text-slate-700">No variants added yet.</p>
                  <p class="mt-1 text-xs font-medium text-slate-500">Leave this empty for a single-SKU item, or add rows for color / size combinations.</p>
                </div>
              } @else {
                <div class="space-y-3">
                  @for (v of variants.controls; track $index) {
                    <div [formGroup]="asGroup(v)" class="variant-row grid grid-cols-1 gap-4 rounded-2xl p-4 md:grid-cols-[1.4fr_1fr_1fr_56px]">
                      <div>
                        <label class="studio-label">Variant Name</label>
                        <input formControlName="variantName" type="text" class="studio-input h-12" placeholder="e.g. Red / Large" />
                      </div>

                      <div>
                        <label class="studio-label">SKU Suffix</label>
                        <input formControlName="skuSuffix" type="text" class="studio-input h-12" placeholder="-RED" />
                      </div>

                      <div>
                        <label class="studio-label">Extra Price</label>
                        <div class="currency-field">
                          <span>&#8377;</span>
                          <input formControlName="additionalPrice" type="number" min="0" step="0.01" class="studio-input h-12 pl-8 text-right" />
                        </div>
                      </div>

                      <div class="flex items-end justify-center">
                        <button type="button" class="delete-chip" (click)="removeVariantRow($index)">
                          <ng-icon name="heroTrash" size="18"></ng-icon>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </section>
          </main>

          <aside class="space-y-5 xl:sticky xl:top-4 xl:self-start">
            <div class="glass-card-primary relative overflow-hidden p-6 text-white shadow-2xl">
              <div class="absolute -right-8 -top-8 opacity-[0.08]">
                <ng-icon name="heroSquares2x2" size="150"></ng-icon>
              </div>

              <h3 class="mb-6 text-[10px] font-black uppercase tracking-[0.24em] text-white/55">Item Snapshot</h3>

              <div class="space-y-5">
                <div>
                  <p class="text-[11px] font-black uppercase tracking-wider text-white/60">Display Name</p>
                  <p class="mt-2 text-2xl font-black tracking-tight">{{ previewName() }}</p>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="summary-chip">
                    <span>Type</span>
                    <strong>{{ previewItemType() }}</strong>
                  </div>
                  <div class="summary-chip">
                    <span>UOM</span>
                    <strong>{{ previewUom() }}</strong>
                  </div>
                </div>

                <div class="space-y-3 border-t border-white/12 pt-4">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-white/60">SKU</span>
                    <span class="font-mono font-bold text-white">{{ previewSku() }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-4 text-sm">
                    <span class="text-white/60">Group</span>
                    <span class="truncate text-right font-bold text-white">{{ previewCategoryName() }}</span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-white/60">Selling Price</span>
                    <span class="font-mono font-bold text-white">{{ formatCurrency(previewNumber('sellingPrice')) }}</span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-white/60">Purchase Price</span>
                    <span class="font-mono font-bold text-white">{{ formatCurrency(previewNumber('purchasePrice')) }}</span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-white/60">Margin Spread</span>
                    <span class="font-mono font-bold text-white">{{ formatCurrency(marginSpread()) }}</span>
                  </div>
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-white/60">GST Profile</span>
                    <span class="font-mono font-bold text-white">{{ previewNumber('gstRate') }}%</span>
                  </div>
                </div>

                <div class="border-t border-white/12 pt-4">
                  <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Variant Count</span>
                  <div class="mt-2 text-4xl font-black tracking-tighter">{{ variants.length }}</div>
                </div>
              </div>
            </div>

            <div class="glass-card p-6">
              <h3 class="mb-5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                <ng-icon name="heroCheckCircle" size="14" class="text-emerald-500"></ng-icon>
                <span>Readiness Checklist</span>
              </h3>

              <div class="space-y-3">
                <div class="check-row" [class.complete]="!!trimmedValue('name')">
                  <span class="check-dot"></span>
                  <div>
                    <p class="font-bold text-slate-800">Identity added</p>
                    <p class="text-xs text-slate-500">Name helps the item appear correctly across inventory and billing.</p>
                  </div>
                </div>

                <div class="check-row" [class.complete]="previewNumber('sellingPrice') > 0">
                  <span class="check-dot"></span>
                  <div>
                    <p class="font-bold text-slate-800">Sell price captured</p>
                    <p class="text-xs text-slate-500">Useful for quote, invoice, and stock valuation flows.</p>
                  </div>
                </div>

                <div class="check-row" [class.complete]="previewNumber('gstRate') >= 0">
                  <span class="check-dot"></span>
                  <div>
                    <p class="font-bold text-slate-800">Tax profile ready</p>
                    <p class="text-xs text-slate-500">GST rate and HSN/SAC keep downstream documents clean.</p>
                  </div>
                </div>

                <div class="check-row" [class.complete]="!f['trackInventory'].value || previewNumber('reorderPoint') >= 0">
                  <span class="check-dot"></span>
                  <div>
                    <p class="font-bold text-slate-800">Stock controls reviewed</p>
                    <p class="text-xs text-slate-500">Reorder fields are optional, but useful when inventory is tracked.</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </form>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      --studio-primary: #4f46e5;
      --studio-primary-rgb: 79, 70, 229;
      --studio-primary-light: #eef2ff;
      --studio-success: #10b981;
      --studio-success-rgb: 16, 185, 129;
      --studio-success-light: #ecfdf5;
      --studio-primary-glow: rgba(79, 70, 229, 0.18);
    }

    .inventory-studio-container {
      min-height: auto;
      margin: 0 auto;
      max-width: none;
      background: #ffffff;
    }

    .inventory-studio-container.embedded {
      min-height: auto;
      padding: 1.25rem !important;
      background: #ffffff;
    }

    .inventory-studio-container:not(.embedded) {
      min-height: 100vh;
      max-width: 1480px;
      padding: 1.5rem !important;
      background:
        radial-gradient(circle at top left, rgba(var(--studio-primary-rgb), 0.07), transparent 30%),
        linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
    }

    .studio-header {
      margin-bottom: 1.25rem !important;
      border: 1px solid #c7d2fe;
      border-radius: 1.5rem;
      padding: 1.25rem;
      background: linear-gradient(135deg, #ffffff 0%, #eef2ff 52%, #ffffff 100%);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }

    .studio-header h1 {
      font-size: 1.5rem !important;
      line-height: 2rem !important;
      letter-spacing: -0.035em;
    }

    .studio-layout {
      align-items: start;
    }

    .animate-fade-in {
      animation: fadeIn 0.5s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .studio-badge {
      @apply inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em];
      background: #ffffff;
      border-color: rgba(var(--studio-primary-rgb), 0.18);
      color: var(--studio-primary);
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .glass-card {
      @apply rounded-3xl border bg-white shadow-sm transition-all;
      border-color: #e2e8f0;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }

    .glass-card-primary {
      @apply rounded-3xl border transition-all;
      background:
        radial-gradient(circle at top right, rgba(var(--studio-success-rgb), 0.16), transparent 34%),
        linear-gradient(135deg, #ecfdf5 0%, #ffffff 58%, #f8fafc 100%);
      border-color: #bbf7d0;
      color: #0f172a;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }

    .glass-card-primary [class~="text-white"] {
      color: #0f172a !important;
    }

    .glass-card-primary [class*="text-white/"] {
      color: #059669 !important;
    }

    .glass-card-primary [class*="border-white/"] {
      border-color: #bbf7d0 !important;
    }

    .section-icon {
      @apply flex h-10 w-10 items-center justify-center rounded-2xl border;
      color: var(--studio-primary);
      background: var(--studio-primary-light);
      border-color: #c7d2fe;
      box-shadow: none;
    }

    .studio-label {
      @apply mb-2 block px-1 text-[11px] font-black uppercase tracking-widest text-slate-400;
    }

    .studio-input {
      @apply w-full rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-300 focus:outline-none;
      background: #f8fafc;
      border-color: #e2e8f0;
    }

    .studio-input:focus,
    .studio-select:focus {
      border-color: var(--studio-primary);
      box-shadow: 0 0 0 4px rgba(var(--studio-primary-rgb), 0.12);
    }

    .studio-select {
      @apply w-full appearance-none rounded-2xl border px-4 py-3 text-sm font-bold text-slate-900 transition-all focus:outline-none;
      background: #f8fafc;
      border-color: #e2e8f0;
    }

    .btn-studio-primary {
      @apply inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition-all disabled:opacity-60;
      background-color: #10b981;
      box-shadow: 0 10px 22px -14px rgba(16, 185, 129, 0.65);
    }

    .btn-studio-primary:hover {
      filter: brightness(1.04);
      transform: translateY(-1px);
    }

    .btn-studio-secondary {
      @apply inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold text-slate-600 transition-all;
      background: #f8fafc;
      border-color: #e2e8f0;
    }

    .btn-studio-secondary:hover {
      background: #e2e8f0;
    }

    .btn-studio-text {
      @apply inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] transition-opacity hover:opacity-70;
      color: var(--studio-primary);
    }

    .radio-tile {
      @apply cursor-pointer rounded-2xl border-2 p-4 transition-all;
      background: #ffffff;
      border-color: #edf2f7;
    }

    .radio-tile:hover {
      border-color: rgba(var(--studio-primary-rgb), 0.3);
    }

    .radio-tile.active {
      background: var(--studio-primary-light);
      border-color: var(--studio-primary);
    }

    .toggle-card {
      @apply flex cursor-pointer items-start justify-between gap-4 rounded-2xl border p-4 transition-all;
      background: #ffffff;
      border-color: #e2e8f0;
    }

    .toggle-card:hover {
      border-color: rgba(var(--studio-primary-rgb), 0.3);
      background: #f8fafc;
    }

    .toggle-card.active {
      border-color: rgba(var(--studio-primary-rgb), 0.45);
      background: linear-gradient(180deg, var(--studio-primary-light) 0%, #ffffff 100%);
    }

    .studio-checkbox {
      @apply mt-1 h-4 w-4 shrink-0;
      accent-color: var(--studio-primary);
    }

    .variant-row {
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      border: 1px solid #e2e8f0;
    }

    .currency-field {
      position: relative;
    }

    .currency-field span {
      @apply pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400;
    }

    .category-defaults {
      align-items: center;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 1rem;
      color: #4338ca;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 0.65rem;
    }

    .category-defaults span {
      background: #ffffff;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.35rem 0.6rem;
    }

    .btn-studio-mini {
      background: var(--studio-primary);
      border-radius: 999px;
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 900;
      margin-left: auto;
      padding: 0.4rem 0.7rem;
      transition: all 160ms ease;
    }

    .btn-studio-mini:hover {
      background: #4338ca;
    }

    .delete-chip {
      @apply flex h-12 w-12 items-center justify-center rounded-xl text-slate-400 transition-all;
      background: #f8fafc;
    }

    .delete-chip:hover {
      background: #fef2f2;
      color: #dc2626;
    }

    .summary-chip {
      @apply rounded-2xl px-4 py-3;
      background: #ffffff;
      border: 1px solid #bbf7d0;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .summary-chip span {
      @apply block text-[10px] font-black uppercase tracking-[0.18em];
      color: #059669;
    }

    .summary-chip strong {
      @apply mt-1 block text-sm font-bold;
      color: #0f172a;
    }

    .check-row {
      @apply flex items-start gap-3 rounded-2xl border p-4 transition-all;
      background: #f8fafc;
      border-color: #e2e8f0;
    }

    .check-row.complete {
      border-color: rgba(var(--studio-success-rgb), 0.3);
      background: linear-gradient(180deg, var(--studio-success-light) 0%, #ffffff 100%);
    }

    .check-dot {
      @apply mt-1 rounded-full bg-slate-300;
      width: 10px;
      height: 10px;
    }

    .check-row.complete .check-dot {
      background: var(--studio-success);
      box-shadow: 0 0 0 4px rgba(var(--studio-success-rgb), 0.14);
    }

    .loader-sm {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.18);
      border-top-color: white;
      border-radius: 999px;
      animation: spin 0.8s linear infinite;
    }

    .loader-lg {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(15, 23, 42, 0.08);
      border-top-color: var(--studio-primary);
      border-radius: 999px;
      animation: spin 0.8s linear infinite;
    }

    .err-msg {
      @apply mt-2 text-xs font-semibold text-rose-500;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(InventoryService);
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly gstRates = GST_RATES;
  readonly uoms = UOM_OPTIONS;

  readonly isEdit = signal(false);
  readonly saving = signal(false);
  readonly loadingItem = signal(false);
  readonly categoriesLoading = signal(false);
  readonly categories = signal<CategoryNode[]>([]);
  readonly selectedCategoryId = signal<string | null>(null);

  readonly categoryOptions = computed<CategoryOption[]>(() => this.flattenCategories(this.categories()));
  readonly selectedCategory = computed<CategoryOption | null>(() => {
    const categoryId = this.selectedCategoryId();
    return this.categoryOptions().find((category) => category.id === categoryId) ?? null;
  });

  @Input() inlineMode = false;
  @Input() inlineId: string | null = null;
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  private itemId: string | null = null;

  readonly form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    sku: [''],
    barcode: [''],
    categoryId: [null],
    hsnSacCode: [''],
    itemType: ['goods', Validators.required],
    unitOfMeasure: ['PCS', Validators.required],
    description: [''],
    purchasePrice: [0, [Validators.required, Validators.min(0)]],
    sellingPrice: [0, [Validators.required, Validators.min(0)]],
    mrp: [null],
    gstRate: [18, Validators.required],
    cessRate: [0],
    trackInventory: [true],
    allowNegativeStock: [false],
    reorderPoint: [null],
    reorderQty: [null],
    isActive: [true],
    variants: this.fb.array([]),
  });

  get f() {
    return this.form.controls;
  }

  get variants() {
    return this.form.get('variants') as FormArray;
  }

  asGroup(control: unknown): FormGroup {
    return control as FormGroup;
  }

  ngOnInit() {
    this.loadCategories();
    this.selectedCategoryId.set(this.form.get('categoryId')?.value ?? null);
    this.form.get('categoryId')?.valueChanges.subscribe((value) => this.selectedCategoryId.set(value || null));
    const id = this.inlineMode ? this.inlineId : this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.itemId = id;
      this.loadingItem.set(true);
      this.service.getItemById(id).subscribe({
        next: (res: any) => {
          this.patchForm(res.data);
          this.loadingItem.set(false);
        },
        error: () => this.loadingItem.set(false),
      });
    }
  }

  private patchForm(item: any) {
    this.variants.clear();
    this.form.patchValue({
      ...item,
      categoryId: item?.categoryId ?? item?.category_id ?? item?.category?.id ?? null,
    });
    (item?.variants ?? []).forEach((variant: any) => this.addVariantRow(variant));
  }

  private loadCategories() {
    this.categoriesLoading.set(true);
    this.categoryService.getTree().subscribe({
      next: (categories) => this.categories.set(categories ?? []),
      error: () => this.categories.set([]),
      complete: () => this.categoriesLoading.set(false),
    });
  }

  private flattenCategories(nodes: CategoryNode[], depth = 0): CategoryOption[] {
    return nodes.flatMap((node) => {
      const children = this.flattenCategories(node.children ?? [], depth + 1);
      const current = node.is_active !== false && node.allow_items !== false
        ? [{
            ...node,
            prefix: depth > 0 ? `${'- '.repeat(depth)}` : '',
            label: `${depth > 0 ? `${'- '.repeat(depth)}` : ''}${node.name}`,
          }]
        : [];
      return [...current, ...children];
    });
  }

  onCategoryChanged() {
    this.selectedCategoryId.set(this.form.get('categoryId')?.value || null);
    if (!this.isEdit()) this.applyCategoryDefaults(true);
  }

  applyCategoryDefaults(onlyEmpty = false) {
    const category = this.selectedCategory();
    if (!category) return;

    const patch: Record<string, unknown> = {};
    if (category.default_hsn && (!onlyEmpty || !this.trimmedValue('hsnSacCode'))) {
      patch['hsnSacCode'] = category.default_hsn;
    }
    if (category.default_gst_rate != null && (!onlyEmpty || this.previewNumber('gstRate') === 18)) {
      patch['gstRate'] = Number(category.default_gst_rate);
    }
    if (category.default_uom && (!onlyEmpty || this.previewUom() === 'PCS')) {
      patch['unitOfMeasure'] = category.default_uom;
    }

    if (Object.keys(patch).length > 0) this.form.patchValue(patch);
  }

  addVariantRow(data?: any) {
    this.variants.push(this.fb.group({
      variantName: [data?.variantName ?? '', Validators.required],
      skuSuffix: [data?.skuSuffix ?? ''],
      additionalPrice: [data?.additionalPrice ?? 0],
      isActive: [data?.isActive ?? true],
    }));
  }

  removeVariantRow(index: number) {
    this.variants.removeAt(index);
  }

  onCancel() {
    if (this.inlineMode) {
      this.cancelled.emit();
      return;
    }

    this.router.navigate(['/inventory/items']);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const value = {
      ...this.form.value,
      categoryId: this.form.value.categoryId || null,
    };
    const request = this.isEdit() && this.itemId
      ? this.service.updateItem(this.itemId, value)
      : this.service.createItem(value);

    request.subscribe({
      next: (res) => {
        if (this.inlineMode) {
          this.saving.set(false);
          this.saved.emit(res);
          return;
        }

        this.router.navigate(['/inventory/items']);
      },
      error: () => this.saving.set(false),
    });
  }

  previewName(): string {
    return this.trimmedValue('name') || 'Unnamed Item';
  }

  previewSku(): string {
    return this.trimmedValue('sku') || 'Auto-generated';
  }

  previewCategoryName(): string {
    return this.selectedCategory()?.name ?? 'Not assigned';
  }

  previewItemType(): string {
    return this.f['itemType'].value === 'service' ? 'Service' : 'Goods';
  }

  previewUom(): string {
    return this.trimmedValue('unitOfMeasure') || 'PCS';
  }

  previewNumber(controlName: string): number {
    const value = Number(this.form.get(controlName)?.value ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  marginSpread(): number {
    return this.previewNumber('sellingPrice') - this.previewNumber('purchasePrice');
  }

  trimmedValue(controlName: string): string {
    const value = this.form.get(controlName)?.value;
    return typeof value === 'string' ? value.trim() : '';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  }
}

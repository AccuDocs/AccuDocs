import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../../../core/services/toast.service';
import { CategoryService } from '../../../core/services/category.service';
import { CategoryTreeComponent, CategoryTreeNode } from '../../../shared/components/category-tree.component';
import { CategoryBreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/category-breadcrumb.component';

interface CategoryDetailsResponse {
  id: string;
  org_id: string;
  name: string;
  code: string | null;
  parent_id: string | null;
  level: number;
  path: string;
  sort_order: number;
  default_hsn: string | null;
  default_gst_rate: number | null;
  default_uom: string | null;
  allow_items: boolean;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-category-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    CategoryTreeComponent,
    CategoryBreadcrumbComponent,
  ],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Category Master</h2>
          <p class="mt-1 text-sm font-medium text-slate-500">
            Organize inventory groups, GST defaults, HSN rules, and item placement.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button type="button" class="sa-btn secondary" (click)="loadTree()" [disabled]="loading()">
            <mat-icon class="icon-sm">refresh</mat-icon>
            {{ loading() ? 'Refreshing...' : 'Refresh' }}
          </button>
          <button type="button" class="sa-btn primary" (click)="openCreateForm(null)">
            <mat-icon class="icon-sm">add</mat-icon>
            Add Group
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-[360px,minmax(0,1fr)]">
        <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Category Tree</h3>
              <p class="mt-0.5 text-xs font-medium text-slate-500">{{ tree().length }} top-level groups</p>
            </div>
            <span class="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
              {{ selectedNode()?.code || selectedNode()?.name || 'Browse' }}
            </span>
          </div>

          @if (loading()) {
            <div class="space-y-3 p-4">
              @for (i of [1,2,3,4,5]; track i) {
                <div class="h-10 rounded-lg bg-slate-100 animate-pulse"></div>
              }
            </div>
          } @else {
            <app-category-tree
              [nodes]="tree()"
              [selectedId]="selectedId"
              (nodeSelected)="onNodeSelected($event)"
              (addChildRequested)="openCreateForm($event)"
            ></app-category-tree>
          }
        </section>

        <section class="min-h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          @if (selectedNode() || isCreating()) {
            <div class="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  {{ isCreating() ? 'New Category' : 'Category Details' }}
                </p>
                <div class="mt-1 flex flex-wrap items-center gap-2">
                  <h3 class="text-lg font-bold text-slate-900">
                    {{ isCreating() ? (form.get('parent_id')?.value ? 'Create Sub-category' : 'Create Group') : selectedNode()?.name }}
                  </h3>
                  @if (selectedNode()) {
                    <span [class]="getLevelBadgeClass()">{{ getLevelLabel() }}</span>
                  }
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                @if (selectedNode()) {
                  <button type="button" class="sa-btn danger" (click)="deleteCategory()" [disabled]="deleting()">
                    <mat-icon class="icon-sm">delete</mat-icon>
                    {{ deleting() ? 'Deleting...' : 'Delete' }}
                  </button>
                }
                <button type="button" class="sa-btn secondary" (click)="cancelEdit()">Cancel</button>
                <button type="button" class="sa-btn primary" (click)="saveCategory()" [disabled]="saving()">
                  <mat-icon class="icon-sm">save</mat-icon>
                  {{ saving() ? 'Saving...' : 'Save' }}
                </button>
              </div>
            </div>

            <div class="space-y-5 p-5">
              <app-category-breadcrumb
                [items]="breadcrumb()"
                (itemNavigated)="onBreadcrumbNavigate($event)"
              ></app-category-breadcrumb>

              @if (selectedNode()) {
                <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-[11px] font-bold uppercase tracking-widest text-slate-400">Level</p>
                    <p class="mt-2 text-sm font-bold text-slate-900">{{ getLevelLabel() }}</p>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-[11px] font-bold uppercase tracking-widest text-slate-400">Items</p>
                    <p class="mt-2 text-sm font-bold text-slate-900">{{ itemCount() }} SKUs</p>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-[11px] font-bold uppercase tracking-widest text-slate-400">Stock Value</p>
                    <p class="mt-2 text-sm font-bold text-emerald-700">Rs. {{ stockValue() | number: '1.0-0' }}</p>
                  </div>
                  <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p class="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      {{ selectedNode()?.parent_id ? 'Parent' : 'Group' }}
                    </p>
                    <p class="mt-2 truncate text-sm font-bold text-slate-900">
                      {{ selectedNode()?.parent_id ? parentName() : selectedNode()?.name }}
                    </p>
                  </div>
                </div>
              }

              <form [formGroup]="form" (ngSubmit)="saveCategory()" class="space-y-5">
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div class="field lg:col-span-2">
                    <label>Name *</label>
                    <input type="text" formControlName="name" placeholder="Category name">
                  </div>

                  <div class="field">
                    <label>Code / slug</label>
                    <input type="text" formControlName="code" placeholder="Short code">
                  </div>

                  <div class="field">
                    <label>Sort order</label>
                    <input type="number" formControlName="sort_order" placeholder="0">
                  </div>
                </div>

                @if (selectedNode()?.level && selectedNode()!.level > 1) {
                  <div class="field">
                    <label>Move to different parent</label>
                    <select formControlName="parent_id">
                      <option [ngValue]="null" disabled>Select parent...</option>
                      <option *ngFor="let group of availableParents()" [ngValue]="group.id">{{ group.name }}</option>
                    </select>
                    <p class="note">Moving a node preserves item category IDs and updates the category path.</p>
                  </div>
                }

                <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 class="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Defaults for new items</h4>
                  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div class="field">
                      <label>Default HSN code</label>
                      <input type="text" formControlName="default_hsn" placeholder="HSN/SAC code">
                      <p class="note">Items inherit this HSN when their own HSN is blank.</p>
                    </div>

                    <div class="field">
                      <label>Default unit of measure</label>
                      <select formControlName="default_uom">
                        <option value="">Select UOM...</option>
                        <option value="PCS">PCS</option>
                        <option value="Pieces">Pieces</option>
                        <option value="Kg">Kg</option>
                        <option value="Metres">Metres</option>
                        <option value="Litre">Litre</option>
                        <option value="Box">Box</option>
                        <option value="Pack">Pack</option>
                      </select>
                    </div>
                  </div>

                  <div class="field mt-4">
                    <label>Default GST rate</label>
                    <div class="gst-row">
                      @for (rate of [0, 5, 12, 18, 28]; track rate) {
                        <button
                          type="button"
                          class="gst-chip"
                          [class.active]="form.get('default_gst_rate')?.value === rate"
                          (click)="form.patchValue({ default_gst_rate: rate })"
                        >
                          {{ rate }}%
                        </button>
                      }
                      <button
                        type="button"
                        class="gst-chip"
                        [class.active]="form.get('default_gst_rate')?.value === null"
                        (click)="form.patchValue({ default_gst_rate: null })"
                      >
                        None
                      </button>
                    </div>
                    <p class="note">Applied to newly-created items only. Existing item tax rates stay unchanged.</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div class="field lg:col-span-2">
                    <label>Description / notes</label>
                    <textarea formControlName="description" placeholder="Internal notes about this category"></textarea>
                  </div>

                  <div class="field">
                    <label>Status</label>
                    <select formControlName="is_active">
                      <option [ngValue]="true">Active</option>
                      <option [ngValue]="false">Inactive</option>
                    </select>
                  </div>

                  <div class="field">
                    <label>Allow items directly?</label>
                    <select formControlName="allow_items">
                      <option [ngValue]="true">Yes, items can be in this node</option>
                      <option [ngValue]="false">No, container only</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
          } @else {
            <div class="flex h-full min-h-[520px] items-center justify-center p-12 text-center">
              <div class="max-w-sm">
                <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <mat-icon class="!h-8 !w-8 !text-[32px]">account_tree</mat-icon>
                </div>
                <h3 class="text-lg font-bold text-slate-800">Select a category to edit</h3>
                <p class="mt-2 text-sm font-medium text-slate-500">
                  Choose a category from the tree, or create a new group to start organizing inventory.
                </p>
                <button type="button" class="sa-btn primary mt-5" (click)="openCreateForm(null)">
                  <mat-icon class="icon-sm">add</mat-icon>
                  Add Group
                </button>
              </div>
            </div>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .sa-btn {
      align-items: center;
      border: 1px solid transparent;
      border-radius: 0.5rem;
      display: inline-flex;
      font-size: 0.8125rem;
      font-weight: 700;
      gap: 0.4rem;
      justify-content: center;
      min-height: 2.25rem;
      padding: 0.5rem 0.9rem;
      transition: all 160ms ease;
    }

    .sa-btn.primary {
      background: #4f46e5;
      border-color: #4f46e5;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
      color: #fff;
    }

    .sa-btn.primary:hover:not(:disabled) {
      background: #4338ca;
      border-color: #4338ca;
    }

    .sa-btn.secondary {
      background: #fff;
      border-color: #cbd5e1;
      color: #475569;
    }

    .sa-btn.secondary:hover:not(:disabled) {
      background: #f8fafc;
      color: #0f172a;
    }

    .sa-btn.danger {
      background: #fff;
      border-color: #fecdd3;
      color: #be123c;
    }

    .sa-btn.danger:hover:not(:disabled) {
      background: #fff1f2;
    }

    .sa-btn:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .icon-sm {
      font-size: 1rem;
      height: 1rem;
      width: 1rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .field label {
      color: #475569;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .field input,
    .field select,
    .field textarea {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      color: #0f172a;
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.6rem 0.75rem;
      transition: all 160ms ease;
      width: 100%;
    }

    .field textarea {
      min-height: 5rem;
      resize: vertical;
    }

    .field input:focus,
    .field select:focus,
    .field textarea:focus {
      background: #fff;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
      outline: none;
    }

    .gst-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .gst-chip {
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 999px;
      color: #475569;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.4rem 0.75rem;
      transition: all 160ms ease;
    }

    .gst-chip:hover {
      border-color: #818cf8;
      color: #3730a3;
    }

    .gst-chip.active {
      background: #eef2ff;
      border-color: #818cf8;
      color: #4338ca;
    }

    .note {
      color: #64748b;
      font-size: 0.75rem;
      font-weight: 500;
      margin-top: 0.25rem;
    }
  `],
})
export class CategoryManagerComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  tree = signal<CategoryTreeNode[]>([]);
  selectedNode = signal<CategoryDetailsResponse | null>(null);
  selectedId = signal<string | null>(null);
  breadcrumb = signal<BreadcrumbItem[]>([]);
  itemCount = signal<number>(0);
  stockValue = signal<number>(0);
  saving = signal(false);
  deleting = signal(false);
  loading = signal(false);
  isCreating = signal(false);

  form: FormGroup;

  parentName = computed(() => {
    const node = this.selectedNode();
    if (!node?.parent_id) return '';
    return this.findNodeName(this.tree(), node.parent_id);
  });

  groupName = computed(() => {
    const breadcrumbs = this.breadcrumb();
    if (breadcrumbs.length === 0) return '';
    return breadcrumbs[0].name;
  });

  availableParents = computed(() => {
    const node = this.selectedNode();
    if (!node || node.level === 1) return [];

    const allParents: CategoryTreeNode[] = [];
    const collect = (nodes: CategoryTreeNode[]) => {
      for (const n of nodes) {
        if (n.id !== node.id && n.level < node.level) {
          allParents.push(n);
        }
        if (n.children) collect(n.children);
      }
    };
    collect(this.tree());
    return allParents;
  });

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      code: [''],
      sort_order: [0],
      parent_id: [null],
      default_hsn: [''],
      default_gst_rate: [null],
      default_uom: [''],
      description: [''],
      is_active: [true],
      allow_items: [true],
    });
  }

  ngOnInit(): void {
    this.loadTree();
  }

  loadTree(): void {
    this.loading.set(true);
    this.categoryService.getTree().subscribe({
      next: (data) => this.tree.set(data as CategoryTreeNode[]),
      error: (err) => {
        this.toast.error('Failed to load categories');
        console.error(err);
      },
      complete: () => this.loading.set(false),
    });
  }

  onNodeSelected(node: CategoryTreeNode): void {
    this.selectedId.set(node.id);
    this.isCreating.set(false);
    this.loadCategoryDetails(node.id);
  }

  loadCategoryDetails(categoryId: string): void {
    this.categoryService.getCategoryById(categoryId).subscribe({
      next: (data) => {
        this.selectedNode.set(data as CategoryDetailsResponse);
        this.form.patchValue({
          name: data.name,
          code: data.code,
          sort_order: data.sort_order,
          parent_id: data.parent_id,
          default_hsn: data.default_hsn,
          default_gst_rate: data.default_gst_rate == null ? null : Number(data.default_gst_rate),
          default_uom: data.default_uom,
          description: data.description,
          is_active: data.is_active,
          allow_items: data.allow_items,
        });
        this.loadBreadcrumb(categoryId);
        this.loadItemCount(categoryId);
        this.loadStockValue(categoryId);
      },
      error: (err) => {
        this.toast.error('Failed to load category details');
        console.error(err);
      },
    });
  }

  loadBreadcrumb(categoryId: string): void {
    this.categoryService.getBreadcrumb(categoryId).subscribe({
      next: (data) => this.breadcrumb.set(data as BreadcrumbItem[]),
      error: () => this.breadcrumb.set([]),
    });
  }

  loadItemCount(categoryId: string): void {
    this.categoryService.getItemCount(categoryId).subscribe({
      next: (data) => this.itemCount.set(data.count),
      error: () => this.itemCount.set(0),
    });
  }

  loadStockValue(categoryId: string): void {
    this.categoryService.getStockValue(categoryId).subscribe({
      next: (data) => this.stockValue.set(Number(data.stock_value ?? 0)),
      error: () => this.stockValue.set(0),
    });
  }

  openCreateForm(parentNode: CategoryTreeNode | null): void {
    this.selectedNode.set(null);
    this.selectedId.set(null);
    this.breadcrumb.set([]);
    this.itemCount.set(0);
    this.stockValue.set(0);
    this.isCreating.set(true);
    this.form.reset({
      name: '',
      code: '',
      sort_order: 0,
      parent_id: parentNode?.id || null,
      default_hsn: '',
      default_gst_rate: null,
      default_uom: 'PCS',
      description: '',
      is_active: true,
      allow_items: true,
    });
  }

  saveCategory(): void {
    if (!this.form.valid) {
      this.toast.error('Please fill in all required fields');
      return;
    }

    const node = this.selectedNode();
    this.saving.set(true);

    const request$ = node
      ? this.categoryService.updateCategory(node.id, this.form.value)
      : this.categoryService.createCategory(this.form.value);

    request$.subscribe({
      next: () => {
        this.toast.success(node ? 'Category updated' : 'Category created');
        this.loadTree();
        this.selectedNode.set(null);
        this.selectedId.set(null);
        this.isCreating.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to save category');
      },
      complete: () => this.saving.set(false),
    });
  }

  deleteCategory(): void {
    const node = this.selectedNode();
    if (!node) return;

    if (!confirm(`Delete "${node.name}"? This cannot be undone.`)) return;

    this.deleting.set(true);
    this.categoryService.deleteCategory(node.id).subscribe({
      next: () => {
        this.toast.success('Category deleted');
        this.loadTree();
        this.selectedNode.set(null);
        this.selectedId.set(null);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to delete category');
      },
      complete: () => this.deleting.set(false),
    });
  }

  cancelEdit(): void {
    this.selectedNode.set(null);
    this.selectedId.set(null);
    this.isCreating.set(false);
  }

  onBreadcrumbNavigate(item: BreadcrumbItem): void {
    this.selectedId.set(item.id);
    this.loadCategoryDetails(item.id);
  }

  getLevelLabel(): string {
    const level = this.selectedNode()?.level || 1;
    if (level === 1) return 'Group (Level 1)';
    if (level === 2) return 'Category (Level 2)';
    return `Sub-category (Level ${level})`;
  }

  getLevelBadgeClass(): string {
    const base = 'inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold';
    const level = this.selectedNode()?.level || 1;
    if (level === 1) return `${base} bg-indigo-50 text-indigo-700`;
    if (level === 2) return `${base} bg-emerald-50 text-emerald-700`;
    return `${base} bg-blue-50 text-blue-700`;
  }

  private findNodeName(nodes: CategoryTreeNode[], targetId: string): string {
    for (const node of nodes) {
      if (node.id === targetId) return node.name;
      if (node.children) {
        const found = this.findNodeName(node.children, targetId);
        if (found) return found;
      }
    }
    return '';
  }
}

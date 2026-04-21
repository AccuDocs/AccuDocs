import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';
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
    <div class="layout">
      <!-- LEFT PANEL: Tree -->
      <div class="panel left-panel">
        <div class="panel-head">
          <span class="panel-title">Category tree</span>
          <button class="btn primary" (click)="openCreateForm(null)">+ Add group</button>
        </div>
        <app-category-tree 
          [nodes]="tree()"
          [selectedId]="selectedId"
          (nodeSelected)="onNodeSelected($event)"
          (addChildRequested)="openCreateForm($event)"
        ></app-category-tree>
      </div>

      <!-- RIGHT PANEL: Edit Form / View -->
      <div class="panel right-panel">
        <div class="panel-head" *ngIf="selectedNode() || isCreating()">
          <span class="panel-title">
            {{ isCreating() ? (form.get('parent_id')?.value ? 'Create Sub-category' : 'Create Group') : 'Editing — ' + selectedNode()?.name }}
            <span class="badge" [class]="getLevelBadgeClass()" *ngIf="selectedNode()">{{ getLevelLabel() }}</span>
          </span>
          <div class="action-row">
            <button class="btn danger" (click)="deleteCategory()" [disabled]="deleting()" *ngIf="selectedNode()">
              {{ deleting() ? 'Deleting...' : 'Delete' }}
            </button>
            <button class="btn" (click)="cancelEdit()">Cancel</button>
            <button class="btn primary" (click)="saveCategory()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>

        <div *ngIf="selectedNode() || isCreating()" class="form-area">
          <!-- Breadcrumb -->
          <app-category-breadcrumb 
            [items]="breadcrumb()"
            (itemNavigated)="onBreadcrumbNavigate($event)"
          ></app-category-breadcrumb>

          <!-- Info Box -->
          <div class="info-box" *ngIf="selectedNode()">
            <div class="info-label">Node info</div>
            <div class="info-row">
              <span>Level</span>
              <span class="info-val">
                <span [class]="getLevelBadgeClass()">{{ getLevelLabel() }}</span>
              </span>
            </div>
            <div class="info-row">
              <span>Items in this node</span>
              <span class="info-val">{{ itemCount() }} SKUs</span>
            </div>
            <div class="info-row">
              <span>Stock value</span>
              <span class="info-val">₹{{ stockValue() | number: '1.0-0' }}</span>
            </div>
            <div class="info-row" *ngIf="selectedNode()?.parent_id">
              <span>Parent</span>
              <span class="info-val">
                <span class="badge badge-teal">{{ parentName() }}</span>
              </span>
            </div>
            <div class="info-row" *ngIf="(selectedNode()?.level ?? 0) > 1">
              <span>Group</span>
              <span class="info-val">
                <span class="badge badge-purple">{{ groupName() }}</span>
              </span>
            </div>
          </div>

          <!-- Form -->
          <form [formGroup]="form" (ngSubmit)="saveCategory()">
            <div class="field">
              <label>Name *</label>
              <input 
                type="text" 
                formControlName="name"
                placeholder="Category name"
              >
            </div>

            <div class="two">
              <div class="field">
                <label>Code / slug</label>
                <input 
                  type="text" 
                  formControlName="code"
                  placeholder="Short code"
                >
              </div>
              <div class="field">
                <label>Sort order</label>
                <input 
                  type="number" 
                  formControlName="sort_order"
                  placeholder="0"
                >
              </div>
            </div>

            <div class="field" *ngIf="selectedNode()?.level && selectedNode()!.level > 1">
              <label>Move to different parent</label>
              <select formControlName="parent_id">
                <option [value]="null" disabled>Select parent...</option>
                <option *ngFor="let group of availableParents()" [value]="group.id">
                  {{ group.name }}
                </option>
              </select>
              <div class="note">Moving a node also moves all its items — their category_id stays the same, the full path updates automatically.</div>
            </div>

            <div class="divider"></div>

            <div class="field">
              <label>Default HSN code for items in this category</label>
              <input 
                type="text" 
                formControlName="default_hsn"
                placeholder="HSN/SAC code"
              >
              <div class="note">Items inherit this HSN if left blank on their own form. Can be overridden per item.</div>
            </div>

            <div class="field">
              <label>Default GST rate for items in this category</label>
              <div class="gst-row">
                <button 
                  type="button"
                  class="gst-chip"
                  [class.active]="form.get('default_gst_rate')?.value === 0"
                  (click)="form.patchValue({ default_gst_rate: 0 })"
                >
                  0%
                </button>
                <button 
                  type="button"
                  class="gst-chip"
                  [class.active]="form.get('default_gst_rate')?.value === 5"
                  (click)="form.patchValue({ default_gst_rate: 5 })"
                >
                  5%
                </button>
                <button 
                  type="button"
                  class="gst-chip"
                  [class.active]="form.get('default_gst_rate')?.value === 12"
                  (click)="form.patchValue({ default_gst_rate: 12 })"
                >
                  12%
                </button>
                <button 
                  type="button"
                  class="gst-chip"
                  [class.active]="form.get('default_gst_rate')?.value === 18"
                  (click)="form.patchValue({ default_gst_rate: 18 })"
                >
                  18%
                </button>
                <button 
                  type="button"
                  class="gst-chip"
                  [class.active]="form.get('default_gst_rate')?.value === 28"
                  (click)="form.patchValue({ default_gst_rate: 28 })"
                >
                  28%
                </button>
                <button 
                  type="button"
                  class="gst-chip"
                  [class.active]="form.get('default_gst_rate')?.value === null"
                  (click)="form.patchValue({ default_gst_rate: null })"
                >
                  None
                </button>
              </div>
              <div class="note">Applied to all new items created under this category. Existing items are not changed.</div>
            </div>

            <div class="field">
              <label>Default unit of measure</label>
              <select formControlName="default_uom">
                <option value="">Select UOM...</option>
                <option value="Pieces">Pieces</option>
                <option value="Kg">Kg</option>
                <option value="Metres">Metres</option>
                <option value="Litre">Litre</option>
                <option value="Box">Box</option>
                <option value="Pack">Pack</option>
              </select>
            </div>

            <div class="divider"></div>

            <div class="field">
              <label>Description / notes</label>
              <textarea formControlName="description"></textarea>
            </div>

            <div class="two">
              <div class="field">
                <label>Status</label>
                <select formControlName="is_active">
                  <option [value]="true">Active</option>
                  <option [value]="false">Inactive</option>
                </select>
              </div>
              <div class="field">
                <label>Allow items directly?</label>
                <select formControlName="allow_items">
                  <option [value]="true">Yes — items can be in this node</option>
                  <option [value]="false">No — container only</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div class="empty-state" *ngIf="!selectedNode() && !isCreating()">
          <p class="text-sm text-slate-500">Select a category to edit</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 12px;
      padding: 16px;
      height: calc(100vh - 100px);
    }

    .panel {
      border: 0.5px solid var(--color-border-tertiary);
      border-radius: var(--border-radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .left-panel {
      background: var(--color-background-primary);
    }

    .right-panel {
      background: var(--color-background-primary);
    }

    .panel-head {
      background: var(--color-background-secondary);
      padding: 12px;
      border-bottom: 0.5px solid var(--color-border-tertiary);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }

    .panel-title {
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-area {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--color-text-tertiary);
    }

    .btn {
      padding: 6px 12px;
      border-radius: var(--border-radius-md);
      font-size: 12px;
      border: 0.5px solid var(--color-border-secondary);
      background: var(--color-background-primary);
      cursor: pointer;
      color: var(--color-text-primary);
      transition: all 0.2s ease;
    }

    .btn:hover:not(:disabled) {
      background: var(--color-background-secondary);
    }

    .btn.primary {
      background: #1D9E75;
      color: white;
      border-color: #1D9E75;
    }

    .btn.primary:hover:not(:disabled) {
      background: #0F6E56;
    }

    .btn.danger {
      color: #A32D2D;
      border-color: #F7C1C1;
    }

    .btn.danger:hover:not(:disabled) {
      background: #FEF0F0;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-row {
      display: flex;
      gap: 8px;
    }

    .badge {
      display: inline-flex;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      margin-left: 8px;
    }

    .badge-purple {
      background: #EEEDFE;
      color: #534AB7;
    }

    .badge-teal {
      background: #E1F5EE;
      color: #0F6E56;
    }

    .badge-blue {
      background: #E6F1FB;
      color: #185FA5;
    }

    .info-box {
      background: var(--color-background-secondary);
      border-radius: var(--border-radius-md);
      padding: 12px;
      margin-bottom: 16px;
    }

    .info-label {
      font-size: 11px;
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .info-val {
      font-weight: 500;
    }

    .field {
      margin-bottom: 12px;
    }

    .field label {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-secondary);
      display: block;
      margin-bottom: 4px;
    }

    .field input,
    .field select,
    .field textarea {
      width: 100%;
      padding: 8px 10px;
      font-size: 12px;
      border: 0.5px solid var(--color-border-secondary);
      border-radius: var(--border-radius-md);
      background: var(--color-background-primary);
      color: var(--color-text-primary);
      font-family: inherit;
    }

    .field textarea {
      resize: none;
      height: 60px;
    }

    .field input:focus,
    .field select:focus,
    .field textarea:focus {
      outline: none;
      border-color: #1D9E75;
      box-shadow: 0 0 0 2px rgba(29, 158, 117, 0.1);
    }

    .two {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .divider {
      height: 0.5px;
      background: var(--color-border-tertiary);
      margin: 16px 0;
    }

    .gst-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .gst-chip {
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 12px;
      border: 0.5px solid var(--color-border-secondary);
      background: var(--color-background-primary);
      cursor: pointer;
      color: var(--color-text-secondary);
      transition: all 0.2s ease;
    }

    .gst-chip:hover {
      border-color: #1D9E75;
      background: var(--color-background-secondary);
    }

    .gst-chip.active {
      background: #E1F5EE;
      color: #0F6E56;
      border-color: #9FE1CB;
    }

    .note {
      font-size: 11px;
      color: var(--color-text-secondary);
      padding: 6px 10px;
      background: var(--color-background-secondary);
      border-radius: var(--border-radius-md);
      margin-top: 4px;
    }
  `]
})
export class CategoryManagerComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private apiUrl = `${environment.apiUrl}/inventory/categories`;

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
    // Get parent name from tree traversal
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
    
    // Return all groups + categories, excluding current node and its descendants
    const allParents: any[] = [];
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
    this.http.get<CategoryTreeNode[]>(`${this.apiUrl}/tree`).subscribe({
      next: (data) => this.tree.set(data),
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
    this.http.get<CategoryDetailsResponse>(`${this.apiUrl}/${categoryId}`).subscribe({
      next: (data) => {
        this.selectedNode.set(data);
        this.form.patchValue({
          name: data.name,
          code: data.code,
          sort_order: data.sort_order,
          parent_id: data.parent_id,
          default_hsn: data.default_hsn,
          default_gst_rate: data.default_gst_rate,
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
    this.http.get<BreadcrumbItem[]>(`${this.apiUrl}/${categoryId}/breadcrumb`).subscribe({
      next: (data) => this.breadcrumb.set(data),
      error: () => this.breadcrumb.set([]),
    });
  }

  loadItemCount(categoryId: string): void {
    this.http.get<{ count: number }>(`${this.apiUrl}/${categoryId}/item-count`).subscribe({
      next: (data) => this.itemCount.set(data.count),
      error: () => this.itemCount.set(0),
    });
  }

  loadStockValue(categoryId: string): void {
    this.http.get<{ stock_value: number }>(`${this.apiUrl}/${categoryId}/stock-value`).subscribe({
      next: (data) => this.stockValue.set(data.stock_value),
      error: () => this.stockValue.set(0),
    });
  }

  openCreateForm(parentNode: CategoryTreeNode | null): void {
    this.selectedNode.set(null);
    this.selectedId.set(null);
    this.isCreating.set(true);
    this.form.reset({ 
      name: '',
      parent_id: parentNode?.id || null,
      description: '',
      is_active: true
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
      ? this.http.patch(`${this.apiUrl}/${node.id}`, this.form.value)
      : this.http.post(`${this.apiUrl}`, this.form.value);

    request$.subscribe({
      next: () => {
        this.toast.success(node ? 'Category updated' : 'Category created');
        this.loadTree();
        this.selectedNode.set(null);
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
    this.http.delete(`${this.apiUrl}/${node.id}`).subscribe({
      next: () => {
        this.toast.success('Category deleted');
        this.loadTree();
        this.selectedNode.set(null);
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
    this.loadCategoryDetails(item.id);
  }

  getLevelLabel(): string {
    const level = this.selectedNode()?.level || 1;
    if (level === 1) return 'Group (level 1)';
    if (level === 2) return 'Category (level 2)';
    return `Sub-category (level ${level})`;
  }

  getLevelBadgeClass(): string {
    const level = this.selectedNode()?.level || 1;
    if (level === 1) return 'badge badge-purple';
    if (level === 2) return 'badge badge-teal';
    return 'badge badge-blue';
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

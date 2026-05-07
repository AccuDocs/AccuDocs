import { Component, Input, Output, EventEmitter, signal, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

export interface CategoryTreeNode {
  id: string;
  name: string;
  code: string | null;
  level: number;
  parent_id: string | null;
  default_hsn: string | null;
  default_gst_rate: number | null;
  default_uom: string | null;
  allow_items: boolean;
  children?: CategoryTreeNode[];
  item_count?: number;
  stock_value?: number;
}

@Component({
  selector: 'app-category-tree-node',
  standalone: true,
  imports: [CommonModule, MatIconModule, forwardRef(() => CategoryTreeNodeComponent)],
  template: `
    <div class="node-container">
      <button
        type="button"
        class="node-row group"
        [class.selected]="selectedId === node.id"
        (click)="selectNode()"
      >
        <span
          class="toggle-btn"
          (click)="toggleExpand($event)"
          *ngIf="(node.children?.length || 0) > 0"
        >
          <mat-icon class="toggle-icon">{{ isExpanded ? 'expand_more' : 'chevron_right' }}</mat-icon>
        </span>
        <span class="toggle-btn placeholder" *ngIf="!(node.children && node.children.length > 0)"></span>

        <span [class]="'dot ' + getDotClass()"></span>

        <span class="node-copy">
          <span class="node-line">
            <span class="node-label">{{ node.name }}</span>
            <span class="node-code" *ngIf="node.code">{{ node.code }}</span>
          </span>
          <span class="node-meta">
            Level {{ node.level }}
            <span *ngIf="node.default_hsn">HSN {{ node.default_hsn }}</span>
            <span *ngIf="node.default_gst_rate">{{ node.default_gst_rate }}% GST</span>
          </span>
        </span>

        <span class="item-count" *ngIf="(node.item_count || 0) > 0">
          {{ node.item_count }}
        </span>

        <span
          class="add-child"
          title="Add child"
          (click)="onAddChild($event)"
        >
          <mat-icon>add</mat-icon>
        </span>
      </button>

      <div class="children" *ngIf="isExpanded && (node.children?.length || 0) > 0">
        <app-category-tree-node
          *ngFor="let child of node.children"
          [node]="child"
          [selectedId]="selectedId"
          (nodeSelect)="nodeSelect.emit($event)"
          (nodeExpand)="nodeExpand.emit($event)"
          (addChild)="addChild.emit($event)"
        ></app-category-tree-node>
      </div>
    </div>
  `,
  styles: [`
    .node-container {
      margin-bottom: 0.35rem;
    }

    .node-row {
      align-items: center;
      background: #fff;
      border: 1px solid transparent;
      border-radius: 0.75rem;
      color: #334155;
      cursor: pointer;
      display: flex;
      gap: 0.55rem;
      padding: 0.65rem 0.75rem;
      text-align: left;
      transition: all 160ms ease;
      width: 100%;
    }

    .node-row:hover {
      background: #f8fafc;
      border-color: #e2e8f0;
      transform: translateY(-1px);
    }

    .node-row.selected {
      background: #eef2ff;
      border-color: #a5b4fc;
      box-shadow: 0 8px 24px rgba(79, 70, 229, 0.08);
    }

    .toggle-btn {
      align-items: center;
      border-radius: 999px;
      color: #94a3b8;
      display: inline-flex;
      flex: 0 0 auto;
      height: 1.25rem;
      justify-content: center;
      width: 1.25rem;
    }

    .toggle-btn:not(.placeholder):hover {
      background: #e2e8f0;
      color: #475569;
    }

    .toggle-icon {
      font-size: 1rem;
      height: 1rem;
      width: 1rem;
    }

    .dot {
      border-radius: 999px;
      flex: 0 0 auto;
      height: 0.55rem;
      width: 0.55rem;
    }

    .dot.group {
      background: #6366f1;
      box-shadow: 0 0 0 4px #eef2ff;
    }

    .dot.category {
      background: #10b981;
      box-shadow: 0 0 0 4px #ecfdf5;
    }

    .dot.subcategory {
      background: #0ea5e9;
      box-shadow: 0 0 0 4px #e0f2fe;
    }

    .node-copy {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }

    .node-line {
      align-items: center;
      display: flex;
      gap: 0.4rem;
      min-width: 0;
    }

    .node-label {
      color: #0f172a;
      font-size: 0.875rem;
      font-weight: 800;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .node-code {
      background: #f1f5f9;
      border-radius: 999px;
      color: #64748b;
      flex: 0 0 auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.12rem 0.4rem;
    }

    .node-meta {
      align-items: center;
      color: #94a3b8;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      font-size: 0.6875rem;
      font-weight: 700;
    }

    .item-count {
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      color: #475569;
      display: inline-flex;
      flex: 0 0 auto;
      font-size: 0.6875rem;
      font-weight: 900;
      height: 1.45rem;
      justify-content: center;
      min-width: 1.45rem;
      padding: 0 0.35rem;
    }

    .add-child {
      align-items: center;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      color: #64748b;
      display: inline-flex;
      flex: 0 0 auto;
      height: 1.7rem;
      justify-content: center;
      opacity: 0;
      transition: all 160ms ease;
      width: 1.7rem;
    }

    .node-row:hover .add-child,
    .node-row.selected .add-child {
      opacity: 1;
    }

    .add-child:hover {
      background: #4f46e5;
      border-color: #4f46e5;
      color: #fff;
    }

    .add-child mat-icon {
      font-size: 1rem;
      height: 1rem;
      width: 1rem;
    }

    .children {
      border-left: 1px dashed #cbd5e1;
      margin-left: 1.35rem;
      margin-top: 0.35rem;
      padding-left: 0.75rem;
    }
  `],
})
export class CategoryTreeNodeComponent {
  @Input() node!: CategoryTreeNode;
  @Input() selectedId: string | null = null;
  @Output() nodeSelect = new EventEmitter<CategoryTreeNode>();
  @Output() nodeExpand = new EventEmitter<string>();
  @Output() addChild = new EventEmitter<CategoryTreeNode>();

  isExpanded = false;

  selectNode(): void {
    this.nodeSelect.emit(this.node);
  }

  toggleExpand(event: MouseEvent): void {
    event.stopPropagation();
    this.isExpanded = !this.isExpanded;
    this.nodeExpand.emit(this.node.id);
  }

  onAddChild(event: MouseEvent): void {
    event.stopPropagation();
    this.addChild.emit(this.node);
  }

  getDotClass(): string {
    if (this.node.level === 1) return 'group';
    if (this.node.level === 2) return 'category';
    return 'subcategory';
  }
}

@Component({
  selector: 'app-category-tree',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, CategoryTreeNodeComponent],
  template: `
    <div class="tree-container">
      <div class="tree-search">
        <div class="search-wrap">
          <mat-icon class="search-icon">search</mat-icon>
          <input
            type="text"
            placeholder="Search categories..."
            [(ngModel)]="searchQuery"
            class="search-input"
          >
        </div>
      </div>

      <div class="tree" *ngIf="filteredTree().length > 0">
        <app-category-tree-node
          *ngFor="let node of filteredTree(); trackBy: trackNode"
          [node]="node"
          [selectedId]="selectedId()"
          (nodeSelect)="onNodeSelect($event)"
          (nodeExpand)="onNodeExpand($event)"
          (addChild)="onAddChild($event)"
        ></app-category-tree-node>
      </div>

      <div class="empty-state" *ngIf="filteredTree().length === 0">
        <div class="empty-icon">
          <mat-icon>inventory_2</mat-icon>
        </div>
        <p class="empty-title">No categories found</p>
        <p class="empty-copy">Try a different search term or add a new category group.</p>
      </div>
    </div>
  `,
  styles: [`
    .tree-container {
      display: flex;
      flex-direction: column;
      min-height: 31rem;
    }

    .tree-search {
      border-bottom: 1px solid #e2e8f0;
      padding: 1rem;
    }

    .search-wrap {
      position: relative;
    }

    .search-icon {
      color: #94a3b8;
      font-size: 1rem;
      height: 1rem;
      left: 0.75rem;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 1rem;
    }

    .search-input {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.75rem;
      color: #0f172a;
      font-size: 0.875rem;
      font-weight: 600;
      outline: none;
      padding: 0.65rem 0.85rem 0.65rem 2.25rem;
      transition: all 160ms ease;
      width: 100%;
    }

    .search-input::placeholder {
      color: #94a3b8;
      font-weight: 500;
    }

    .search-input:focus {
      background: #fff;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    }

    .tree {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    .empty-state {
      align-items: center;
      color: #64748b;
      display: flex;
      flex: 1;
      flex-direction: column;
      justify-content: center;
      padding: 2.5rem 1.5rem;
      text-align: center;
    }

    .empty-icon {
      align-items: center;
      background: #f1f5f9;
      border-radius: 999px;
      color: #94a3b8;
      display: inline-flex;
      height: 3.5rem;
      justify-content: center;
      margin-bottom: 1rem;
      width: 3.5rem;
    }

    .empty-icon mat-icon {
      font-size: 1.75rem;
      height: 1.75rem;
      width: 1.75rem;
    }

    .empty-title {
      color: #334155;
      font-size: 0.95rem;
      font-weight: 800;
      margin: 0;
    }

    .empty-copy {
      font-size: 0.8125rem;
      font-weight: 500;
      margin: 0.35rem 0 0;
      max-width: 16rem;
    }
  `],
})
export class CategoryTreeComponent {
  @Input() nodes: CategoryTreeNode[] = [];
  @Input() selectedId = signal<string | null>(null);
  @Output() nodeSelected = new EventEmitter<CategoryTreeNode>();
  @Output() addChildRequested = new EventEmitter<CategoryTreeNode>();

  searchQuery = '';
  expandedNodes = new Set<string>();

  filteredTree(): CategoryTreeNode[] {
    if (!this.searchQuery.trim()) {
      return this.nodes;
    }

    const query = this.searchQuery.toLowerCase();
    return this.filterNodes(this.nodes, query);
  }

  trackNode(_: number, node: CategoryTreeNode): string {
    return node.id;
  }

  onNodeSelect(node: CategoryTreeNode | any): void {
    if (typeof node === 'string') return;
    this.selectedId.set(node.id);
    this.nodeSelected.emit(node);
  }

  onNodeExpand(nodeId: string | any): void {
    if (typeof nodeId !== 'string') return;
    if (this.expandedNodes.has(nodeId)) {
      this.expandedNodes.delete(nodeId);
    } else {
      this.expandedNodes.add(nodeId);
    }
  }

  onAddChild(node: CategoryTreeNode | any): void {
    if (typeof node === 'string' || !node.id) return;
    this.addChildRequested.emit(node);
  }

  private filterNodes(nodes: CategoryTreeNode[], query: string): CategoryTreeNode[] {
    return nodes
      .map(node => ({
        ...node,
        children: node.children ? this.filterNodes(node.children, query) : [],
      }))
      .filter(node => {
        const matchesSelf = node.name.toLowerCase().includes(query) || !!node.code?.toLowerCase().includes(query);
        return matchesSelf || (node.children?.length ?? 0) > 0;
      });
  }
}

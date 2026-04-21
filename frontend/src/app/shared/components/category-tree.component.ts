import { Component, Input, Output, EventEmitter, signal, computed, forwardRef } from '@angular/core';
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

/**
 * Recursive node component (declared first so the parent can reference it)
 */
@Component({
  selector: 'app-category-tree-node',
  standalone: true,
  imports: [CommonModule, MatIconModule, forwardRef(() => CategoryTreeNodeComponent)],
  template: `
    <div class="node-container">
      <div 
        class="node-row"
        [class.selected]="selectedId === node.id"
        (click)="selectNode()"
        (mouseenter)="showActions = true"
        (mouseleave)="showActions = false"
      >
        <!-- Toggle expand/collapse -->
        <button 
          class="toggle-btn"
          (click)="toggleExpand($event)"
          *ngIf="(node.children?.length || 0) > 0"
        >
          <mat-icon class="toggle-icon">{{ isExpanded ? 'expand_more' : 'chevron_right' }}</mat-icon>
        </button>
        <div class="toggle-btn" *ngIf="!(node.children && node.children.length > 0)"></div>

        <!-- Level dot (color-coded) -->
        <div [class]="'dot ' + getDotClass()"></div>

        <!-- Node label -->
        <span class="node-label">{{ node.name }}</span>
        <span class="node-code" *ngIf="node.code">({{ node.code }})</span>

        <!-- Item count -->
        <span class="item-count" *ngIf="(node.item_count || 0) > 0">
          {{ node.item_count }} items
        </span>

        <!-- Action buttons (on hover) -->
        <div class="actions" *ngIf="showActions">
          <button 
            class="action-btn edit"
            title="Edit"
            (click)="onEdit($event)"
          >
            <mat-icon>edit</mat-icon>
          </button>
          <button 
            class="action-btn add"
            title="Add child"
            (click)="onAddChild($event)"
          >
            <mat-icon>add</mat-icon>
          </button>
          <button 
            class="action-btn delete"
            title="Delete"
            (click)="onDelete($event)"
          >
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      </div>

      <!-- Children (recursive) -->
      <div class="children" *ngIf="isExpanded && (node.children?.length || 0) > 0">
        <div *ngFor="let child of node.children">
          <app-category-tree-node 
            [node]="child"
            [selectedId]="selectedId"
            (nodeSelect)="nodeSelect.emit($event)"
            (nodeExpand)="nodeExpand.emit($event)"
            (addChild)="addChild.emit($event)"
          ></app-category-tree-node>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .node-container {
      margin-bottom: 2px;
    }

    .node-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      border-radius: var(--border-radius-md);
      cursor: pointer;
      border: 0.5px solid transparent;
      transition: all 0.2s ease;
    }

    .node-row:hover {
      background: var(--color-background-secondary);
    }

    .node-row.selected {
      background: #E1F5EE;
      border-color: #9FE1CB;
    }

    .toggle-btn {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      color: var(--color-text-tertiary);
    }

    .toggle-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .dot.group {
      background: #7F77DD;
    }

    .dot.category {
      background: #1D9E75;
    }

    .dot.subcategory {
      background: #378ADD;
    }

    .node-label {
      font-size: 12px;
      flex: 1;
      font-weight: 500;
    }

    .node-code {
      font-size: 11px;
      color: var(--color-text-tertiary);
      margin-left: 4px;
    }

    .item-count {
      font-size: 10px;
      color: var(--color-text-tertiary);
      background: var(--color-background-secondary);
      padding: 1px 6px;
      border-radius: 8px;
    }

    .actions {
      display: flex;
      gap: 2px;
    }

    .action-btn {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--color-text-tertiary);
      transition: all 0.2s ease;
      padding: 0;
    }

    .action-btn mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .action-btn:hover {
      color: white;
      border-radius: 4px;
    }

    .action-btn.edit:hover {
      background: #378ADD;
    }

    .action-btn.add:hover {
      background: #1D9E75;
    }

    .action-btn.delete:hover {
      background: #E74C3C;
    }

    .children {
      padding-left: 18px;
    }
  `]
})
export class CategoryTreeNodeComponent {
  @Input() node!: CategoryTreeNode;
  @Input() selectedId: string | null = null;
  @Output() nodeSelect = new EventEmitter<CategoryTreeNode>();
  @Output() nodeExpand = new EventEmitter<string>();
  @Output() addChild = new EventEmitter<CategoryTreeNode>();

  isExpanded = false;
  showActions = false;

  selectNode(): void {
    this.nodeSelect.emit(this.node);
  }

  toggleExpand(event: MouseEvent): void {
    event.stopPropagation();
    this.isExpanded = !this.isExpanded;
    this.nodeExpand.emit(this.node.id);
  }

  onEdit(event: MouseEvent): void {
    event.stopPropagation();
    // Parent component will handle edit
  }

  onAddChild(event: MouseEvent): void {
    event.stopPropagation();
    this.addChild.emit(this.node);
  }

  onDelete(event: MouseEvent): void {
    event.stopPropagation();
    // Parent component will handle delete
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
        <input 
          type="text" 
          placeholder="🔍 Search categories..."
          [(ngModel)]="searchQuery"
          class="search-input"
        >
      </div>
      
      <div class="tree" *ngIf="filteredTree().length > 0">
        <div *ngFor="let node of filteredTree()">
          <app-category-tree-node 
            [node]="node"
            [selectedId]="selectedId()"
            (nodeSelect)="onNodeSelect($event)"
            (nodeExpand)="onNodeExpand($event)"
            (addChild)="onAddChild($event)"
          ></app-category-tree-node>
        </div>
      </div>

      <div class="empty-state" *ngIf="filteredTree().length === 0">
        <p class="text-sm text-slate-500">No categories found</p>
      </div>
    </div>
  `,
  styles: [`
    .tree-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .tree-search {
      padding: 8px;
      border-bottom: 0.5px solid var(--color-border-tertiary);
    }

    .search-input {
      width: 100%;
      padding: 6px 9px;
      font-size: 12px;
      border: 0.5px solid var(--color-border-secondary);
      border-radius: var(--border-radius-md);
      background: var(--color-background-primary);
      color: var(--color-text-primary);
    }

    .search-input:focus {
      outline: none;
      border-color: #1D9E75;
      box-shadow: 0 0 0 2px rgba(29, 158, 117, 0.1);
    }

    .tree {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      text-align: center;
    }
  `]
})
export class CategoryTreeComponent {
  @Input() nodes: CategoryTreeNode[] = [];
  @Input() selectedId = signal<string | null>(null);
  @Output() nodeSelected = new EventEmitter<CategoryTreeNode>();
  @Output() addChildRequested = new EventEmitter<CategoryTreeNode>();

  searchQuery = '';
  expandedNodes = new Set<string>();

  filteredTree = computed(() => {
    if (!this.searchQuery.trim()) {
      return this.nodes;
    }

    const query = this.searchQuery.toLowerCase();
    return this.filterNodes(this.nodes, query);
  });

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
      .filter(node => node.name.toLowerCase().includes(query) || (node.code?.toLowerCase().includes(query)))
      .map(node => ({
        ...node,
        children: node.children ? this.filterNodes(node.children, query) : [],
      }))
      .filter(node => node.name.toLowerCase().includes(query) || node.children!.length > 0);
  }
}

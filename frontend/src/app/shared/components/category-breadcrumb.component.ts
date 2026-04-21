import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface BreadcrumbItem {
  id: string;
  name: string;
  level: number;
}

@Component({
  selector: 'app-category-breadcrumb',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="breadcrumb" *ngIf="items.length > 0">
      <div *ngFor="let item of items; let last = last" class="breadcrumb-item">
        <button 
          class="breadcrumb-link"
          [class.active]="last"
          (click)="onNavigate(item)"
          type="button"
        >
          {{ item.name }}
        </button>
        <mat-icon class="breadcrumb-separator" *ngIf="!last">chevron_right</mat-icon>
      </div>
    </div>
  `,
  styles: [`
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0;
      font-size: 12px;
      padding: 8px 0;
      border-bottom: 0.5px solid var(--color-border-tertiary);
      margin-bottom: 12px;
    }

    .breadcrumb-item {
      display: flex;
      align-items: center;
      gap: 0;
    }

    .breadcrumb-link {
      background: transparent;
      border: none;
      cursor: pointer;
      color: #378ADD;
      font-size: 12px;
      font-weight: 500;
      padding: 4px 6px;
      border-radius: 4px;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .breadcrumb-link:hover {
      background: rgba(55, 138, 221, 0.1);
      color: #185FA5;
    }

    .breadcrumb-link.active {
      color: var(--color-text-primary);
      cursor: default;
      font-weight: 600;
    }

    .breadcrumb-link.active:hover {
      background: transparent;
      color: var(--color-text-primary);
    }

    .breadcrumb-separator {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--color-text-tertiary);
      margin: 0 2px;
    }
  `]
})
export class CategoryBreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
  @Output() itemNavigated = new EventEmitter<BreadcrumbItem>();

  onNavigate(item: BreadcrumbItem): void {
    this.itemNavigated.emit(item);
  }
}

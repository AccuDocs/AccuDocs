import { Component, Input, Output, EventEmitter, signal, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FolderNode } from '@core/services/workspace.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroChartBarSolid,
  heroShoppingCartSolid,
  heroBanknotesSolid,
  heroArrowUpTraySolid,
  heroFunnelSolid,
  heroArrowPathSolid
} from '@ng-icons/heroicons/solid';
import { SalesComponent } from './sales/sales.component';
import { PurchasesComponent } from './purchases/purchases.component';
import { ExpensesComponent } from './expenses/expenses.component';
import { UploadComponent } from './upload/upload.component';
import { GstSummaryComponent } from '../gst-summary/gst-summary.component';
import { heroDocumentCheckSolid, heroClipboardDocumentCheckSolid } from '@ng-icons/heroicons/solid';
import { WorkspaceTab } from '../../client-workspace/client-workspace.component';

@Component({
  selector: 'app-data-module',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NgIconComponent,
    SalesComponent, PurchasesComponent, ExpensesComponent, UploadComponent
  ],
  providers: [
    provideIcons({
      heroChartBarSolid, heroShoppingCartSolid, heroBanknotesSolid,
      heroArrowUpTraySolid, heroFunnelSolid, heroArrowPathSolid,
      heroDocumentCheckSolid, heroClipboardDocumentCheckSolid
    })
  ],
  template: `
    <div class="data-module-shell animate-in fade-in duration-500">
      <section class="data-workspace-header">
        <div class="title-stack">
          <div class="title-eyebrow">
            <ng-icon name="heroClipboardDocumentCheckSolid" size="16"></ng-icon>
            GST data workspace
          </div>
          <h1>Client Data</h1>
          <p>Sales, purchases, expenses, and upload workflows for the selected return period.</p>
        </div>

        <div class="period-panel">
          <div class="period-field">
            <span>Financial year</span>
            <select
              [(ngModel)]="selectedFY"
              (ngModelChange)="onFilterChange()"
            >
              @for (fy of financialYears; track fy) {
                <option [value]="fy">FY {{ fy }}</option>
              }
            </select>
          </div>
          <div class="period-field">
            <span>Month</span>
            <select
              [(ngModel)]="selectedMonth"
              (ngModelChange)="onFilterChange()"
            >
              <option [value]="0">All Months</option>
              @for (m of months; track m.value) {
                <option [value]="m.value">{{ m.label }}</option>
              }
            </select>
          </div>
        </div>
      </section>

      <nav class="data-tabs no-scrollbar" aria-label="Client data sections">
        @for (tab of tabs; track tab.key) {
          <button
            type="button"
            (click)="activeSubTab.set(tab.key)"
            class="data-tab"
            [class.active]="activeSubTab() === tab.key"
          >
            <ng-icon [name]="tab.icon"></ng-icon>
            <span>{{ tab.label }}</span>
          </button>
        }
      </nav>

      <section class="data-content">
        @switch (activeSubTab()) {
          @case ('sales') {
            <app-sales
              [clientId]="clientId"
              [month]="selectedMonth"
              [financialYear]="selectedFY"
            ></app-sales>
          }
          @case ('purchases') {
            <app-purchases
              [clientId]="clientId"
              [month]="selectedMonth"
              [financialYear]="selectedFY"
            ></app-purchases>
          }
          @case ('expenses') {
            <app-expenses
              [clientId]="clientId"
              [month]="selectedMonth"
              [financialYear]="selectedFY"
            ></app-expenses>
          }
          @case ('upload') {
            <app-upload [clientId]="clientId"></app-upload>
          }
        }
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .data-module-shell {
      display: flex;
      flex-direction: column;
      gap: 18px;
      min-width: 0;
    }

    .data-workspace-header {
      align-items: center;
      background:
        linear-gradient(135deg, rgba(29, 78, 216, .08), rgba(16, 185, 129, .05)),
        var(--ad-card-bg, #ffffff);
      border: 1px solid var(--ad-card-border, #cbd8e6);
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, .05);
      display: flex;
      gap: 24px;
      justify-content: space-between;
      padding: 22px;
    }

    .title-stack {
      min-width: 0;
    }

    .title-eyebrow {
      align-items: center;
      color: var(--accent, #1d4ed8);
      display: inline-flex;
      font-size: 11px;
      font-weight: 900;
      gap: 8px;
      letter-spacing: .14em;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .title-stack h1 {
      color: var(--ad-text-primary, #0f1e35);
      font-size: 28px;
      font-weight: 900;
      letter-spacing: 0;
      line-height: 1.05;
      margin: 0;
    }

    .title-stack p {
      color: var(--ad-text-secondary, #2d4a6a);
      font-size: 14px;
      font-weight: 600;
      line-height: 1.45;
      margin: 6px 0 0;
      max-width: 620px;
    }

    .period-panel {
      align-items: center;
      background: rgba(255, 255, 255, .78);
      border: 1px solid var(--ad-card-border, #cbd8e6);
      border-radius: 10px;
      display: flex;
      gap: 10px;
      padding: 8px;
    }

    .period-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 142px;
    }

    .period-field span {
      color: var(--ad-text-muted, #7a90b0);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .12em;
      padding-left: 8px;
      text-transform: uppercase;
    }

    .period-field select {
      appearance: none;
      background: var(--ad-card-bg, #ffffff);
      border: 1px solid var(--ad-card-border, #cbd8e6);
      border-radius: 8px;
      color: var(--ad-text-primary, #0f1e35);
      cursor: pointer;
      font-size: 13px;
      font-weight: 800;
      height: 38px;
      outline: none;
      padding: 0 34px 0 10px;
      transition: border-color .18s ease, box-shadow .18s ease;
    }

    .period-field select:focus {
      border-color: var(--accent, #1d4ed8);
      box-shadow: 0 0 0 4px rgba(29, 78, 216, .12);
    }

    .data-tabs {
      align-items: center;
      background: var(--ad-card-bg, #ffffff);
      border: 1px solid var(--ad-card-border, #cbd8e6);
      border-radius: 12px;
      box-shadow: 0 8px 22px rgba(15, 23, 42, .04);
      display: flex;
      gap: 4px;
      max-width: 100%;
      overflow-x: auto;
      padding: 5px;
      width: fit-content;
    }

    .data-tabs::-webkit-scrollbar {
      display: none;
    }

    .data-tab {
      align-items: center;
      border: 1px solid transparent;
      border-radius: 8px;
      color: var(--ad-text-muted, #7a90b0);
      display: inline-flex;
      font-size: 12px;
      font-weight: 900;
      gap: 8px;
      min-height: 38px;
      padding: 0 14px;
      transition: background .18s ease, border-color .18s ease, color .18s ease;
      white-space: nowrap;
    }

    .data-tab:hover {
      background: var(--color-surface-hover, #eef4fb);
      color: var(--ad-text-primary, #0f1e35);
    }

    .data-tab.active {
      background: var(--brand-accent-soft, #e2ecfa);
      border-color: rgba(29, 78, 216, .16);
      color: var(--accent, #1d4ed8);
    }

    .data-content {
      min-width: 0;
    }

    :host-context(.dark) .data-workspace-header {
      background:
        linear-gradient(135deg, rgba(96, 165, 250, .12), rgba(16, 185, 129, .08)),
        var(--ad-card-bg, #10213a);
      box-shadow: none;
    }

    :host-context(.dark) .period-panel {
      background: rgba(15, 29, 49, .72);
    }

    @media (max-width: 900px) {
      .data-workspace-header {
        align-items: stretch;
        flex-direction: column;
      }

      .period-panel {
        align-items: stretch;
        flex-direction: column;
      }

      .period-field {
        min-width: 0;
      }
    }
  `]
})
export class DataModuleComponent implements OnInit {
  @Input() clientId: string = '';
  @Input() rootFolder: FolderNode | null = null;
  @Output() tabChangeRequested = new EventEmitter<WorkspaceTab>();
  @Output() folderNavigationRequested = new EventEmitter<string>();

  activeSubTab = signal<'sales' | 'purchases' | 'expenses' | 'upload'>('sales');

  selectedFY = '';
  selectedMonth = 0;

  tabs = [
    { key: 'sales' as const, label: 'Sales', icon: 'heroChartBarSolid' },
    { key: 'purchases' as const, label: 'Purchases', icon: 'heroShoppingCartSolid' },
    { key: 'expenses' as const, label: 'Expenses', icon: 'heroBanknotesSolid' },
    { key: 'upload' as const, label: 'Upload', icon: 'heroArrowUpTraySolid' },
  ];

  months = [
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  ];

  financialYears: string[] = [];

  ngOnInit() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const currentFY = month >= 4 ? `${year}-${(year + 1).toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`;
    this.selectedFY = currentFY;

    // Generate last 5 FYs
    for (let i = 0; i < 5; i++) {
      const y = year - i;
      this.financialYears.push(`${y}-${(y + 1).toString().slice(2)}`);
    }
    if (!this.financialYears.includes(currentFY)) {
      this.financialYears.unshift(currentFY);
    }
  }

  onFilterChange() {
    // Triggers re-render of child components via @Input changes
  }
}

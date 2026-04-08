import { Component, Input, signal, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
      heroArrowUpTraySolid, heroFunnelSolid, heroArrowPathSolid
    })
  ],
  template: `
    <div class="space-y-6 animate-in fade-in duration-500">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-[28px] font-bold text-slate-900 tracking-tight">Client Data</h1>
          <p class="text-sm text-slate-500 font-medium">Manage sales, purchases, and expenses for GST computation.</p>
          <div class="w-10 h-[3px] bg-indigo-600 rounded-full mt-2"></div>
        </div>

        <!-- Filters -->
        <div class="flex items-center gap-3">
          <select
            [(ngModel)]="selectedFY"
            (ngModelChange)="onFilterChange()"
            class="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            @for (fy of financialYears; track fy) {
              <option [value]="fy">FY {{ fy }}</option>
            }
          </select>
          <select
            [(ngModel)]="selectedMonth"
            (ngModelChange)="onFilterChange()"
            class="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option [value]="0">All Months</option>
            @for (m of months; track m.value) {
              <option [value]="m.value">{{ m.label }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Sub-tab Navigation -->
      <div class="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex gap-1">
        @for (tab of tabs; track tab.key) {
          <button
            (click)="activeSubTab.set(tab.key)"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all"
            [class]="activeSubTab() === tab.key
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'"
          >
            <ng-icon [name]="tab.icon" size="18"></ng-icon>
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Tab Content -->
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
    </div>
  `,
  styles: [`
    :host { display: block; }
    .sa-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      transition: all 0.2s ease;
    }
    .sa-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      transform: translateY(-1px);
    }
  `]
})
export class DataModuleComponent implements OnInit {
  @Input() clientId: string = '';

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

import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import type { InventoryDashboardTone, QuickAction } from '../../../models/inventory-dashboard.models';

@Component({
  selector: 'app-quick-actions-widget',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <article class="dashboard-panel">
      <header class="panel-header">
        <div>
          <p class="eyebrow">Actions</p>
          <h2 class="panel-title">Quick Actions</h2>
        </div>
      </header>

      <div class="quick-action-grid">
        @for (action of actions(); track action.label) {
          <a [routerLink]="action.route" class="action-card">
            <div class="grid h-11 w-11 shrink-0 place-items-center rounded-full" [ngClass]="toneClass(action.tone)">
              <mat-icon class="!h-5 !w-5 !text-xl">{{ action.icon }}</mat-icon>
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-black text-slate-950">{{ action.label }}</p>
              <p class="mt-1 line-clamp-2 text-[11px] font-semibold leading-5 text-slate-500">{{ action.description }}</p>
            </div>
          </a>
        }
      </div>
    </article>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .dashboard-panel { min-width: 0; overflow: hidden; border-radius: 20px; border: 1px solid #dbe3ef; background: white; box-shadow: 0 1px 3px rgba(15, 23, 42, .06); }
    .panel-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid #dbe3ef; padding: 16px 18px; }
    .eyebrow { font-size: 10px; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; color: #94a3b8; }
    .panel-title { margin-top: 2px; font-size: 16px; font-weight: 950; color: #0f172a; }
    .quick-action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; padding: 16px; }
    .action-card { display: flex; min-height: 72px; min-width: 0; align-items: center; gap: 14px; border-radius: 16px; border: 1px solid #e2e8f0; padding: 14px; transition: all .16s ease; }
    .action-card:hover { border-color: #c7d2fe; background: #f8faff; transform: translateY(-1px); }
  `],
})
export class QuickActionsWidgetComponent {
  readonly actions = input<QuickAction[]>([]);

  toneClass(tone: InventoryDashboardTone): string {
    const classes: Record<InventoryDashboardTone, string> = {
      blue: 'bg-primary-50 text-primary-600',
      green: 'bg-emerald-50 text-emerald-700',
      amber: 'bg-amber-50 text-amber-700',
      red: 'bg-rose-50 text-rose-700',
      slate: 'bg-slate-100 text-slate-700',
    };
    return classes[tone];
  }
}

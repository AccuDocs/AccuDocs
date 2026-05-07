import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import type { InventoryDashboardTone, InventoryKpi } from '../../../models/inventory-dashboard.models';

@Component({
  selector: 'app-inventory-kpi-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <article class="group min-w-0 rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" [ngClass]="toneCardClass(kpi().tone)">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="truncate text-xs font-black uppercase tracking-[0.18em]" [ngClass]="toneLabelClass(kpi().tone)">{{ kpi().label }}</p>
          @if (loading()) {
            <div class="mt-4 h-8 w-24 rounded-xl bg-white/70 animate-pulse"></div>
          } @else {
            <p class="mt-4 truncate text-3xl font-black tracking-tight" [ngClass]="toneValueClass(kpi().tone)">{{ kpi().value }}</p>
          }
          @if (kpi().sub) {
            <p class="mt-1 truncate text-xs font-semibold" [ngClass]="toneSubClass(kpi().tone)">{{ kpi().sub }}</p>
          }
        </div>
        <div class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm" [ngClass]="toneIconClass(kpi().tone)">
          <mat-icon class="!h-5 !w-5 !text-xl">{{ kpi().icon }}</mat-icon>
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
  `],
})
export class InventoryKpiCardComponent {
  readonly kpi = input.required<InventoryKpi>();
  readonly loading = input(false);

  toneCardClass(tone: InventoryDashboardTone): string {
    const classes: Record<InventoryDashboardTone, string> = {
      blue: 'border-primary-100 bg-primary-50/40',
      green: 'border-emerald-100 bg-emerald-50/60',
      amber: 'border-amber-100 bg-amber-50/60',
      red: 'border-rose-100 bg-rose-50/60',
      slate: 'border-slate-200 bg-white',
    };
    return classes[tone];
  }

  toneIconClass(tone: InventoryDashboardTone): string {
    const classes: Record<InventoryDashboardTone, string> = {
      blue: 'text-primary-600',
      green: 'bg-emerald-50 text-emerald-700',
      amber: 'bg-amber-50 text-amber-700',
      red: 'bg-rose-50 text-rose-700',
      slate: 'bg-slate-100 text-slate-700',
    };
    return classes[tone];
  }

  toneLabelClass(tone: InventoryDashboardTone): string {
    const classes: Record<InventoryDashboardTone, string> = {
      blue: 'text-primary-600',
      green: 'text-emerald-600',
      amber: 'text-amber-600',
      red: 'text-rose-600',
      slate: 'text-slate-400',
    };
    return classes[tone];
  }

  toneValueClass(tone: InventoryDashboardTone): string {
    const classes: Record<InventoryDashboardTone, string> = {
      blue: 'text-slate-950',
      green: 'text-emerald-700',
      amber: 'text-amber-700',
      red: 'text-rose-700',
      slate: 'text-slate-950',
    };
    return classes[tone];
  }

  toneSubClass(tone: InventoryDashboardTone): string {
    const classes: Record<InventoryDashboardTone, string> = {
      blue: 'text-primary-700/70',
      green: 'text-emerald-700/70',
      amber: 'text-amber-700/70',
      red: 'text-rose-700/70',
      slate: 'text-slate-500',
    };
    return classes[tone];
  }
}

import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import type { SystemWarning } from '../../../models/inventory-dashboard.models';

@Component({
  selector: 'app-system-warning-widget',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <article class="dashboard-panel">
      <header class="panel-header">
        <div>
          <p class="eyebrow">Monitoring</p>
          <h2 class="panel-title">System Warnings</h2>
        </div>
      </header>

      @if (loading()) {
        <div class="space-y-3 p-5">
          @for (row of [1,2,3]; track row) {
            <div class="h-16 rounded-2xl bg-slate-100 animate-pulse"></div>
          }
        </div>
      } @else if (warnings().length === 0) {
        <div class="healthy-state">
          <mat-icon>shield</mat-icon>
          <p>Inventory checks look stable</p>
          <span>No immediate system warnings were detected.</span>
        </div>
      } @else {
        <div class="space-y-3 p-4">
          @for (warning of warnings(); track warning.title) {
            <div class="warning-row" [ngClass]="warningClass(warning.severity)">
              <mat-icon class="!h-5 !w-5 !text-xl">{{ warning.icon }}</mat-icon>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-black">{{ warning.title }}</p>
                <p class="mt-1 text-xs font-semibold opacity-80">{{ warning.message }}</p>
                @if (warning.actionRoute && warning.actionLabel) {
                  <a [routerLink]="warning.actionRoute" class="mt-3 inline-flex text-xs font-black underline">{{ warning.actionLabel }}</a>
                }
              </div>
            </div>
          }
        </div>
      }
    </article>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .dashboard-panel { height: 100%; min-width: 0; overflow: hidden; border-radius: 20px; border: 1px solid #dbe3ef; background: white; box-shadow: 0 1px 3px rgba(15, 23, 42, .06); }
    .panel-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid #dbe3ef; padding: 16px 18px; }
    .eyebrow { font-size: 10px; font-weight: 900; letter-spacing: .22em; text-transform: uppercase; color: #94a3b8; }
    .panel-title { margin-top: 2px; font-size: 16px; font-weight: 950; color: #0f172a; }
    .warning-row { display: flex; gap: 12px; border-radius: 16px; border: 1px solid; padding: 14px; }
    .healthy-state { display: grid; min-height: 360px; place-items: center; align-content: center; gap: 8px; padding: 36px 20px; text-align: center; color: #64748b; }
    .healthy-state mat-icon { color: #059669; }
    .healthy-state p { font-weight: 950; color: #0f172a; }
  `],
})
export class SystemWarningWidgetComponent {
  readonly warnings = input<SystemWarning[]>([]);
  readonly loading = input(false);

  warningClass(severity: SystemWarning['severity']): string {
    const classes: Record<SystemWarning['severity'], string> = {
      critical: 'border-rose-200 bg-rose-50 text-rose-900',
      warning: 'border-amber-700 bg-amber-50 text-amber-950',
      info: 'border-primary-200 bg-primary-50 text-primary-900',
      success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    };
    return classes[severity];
  }
}

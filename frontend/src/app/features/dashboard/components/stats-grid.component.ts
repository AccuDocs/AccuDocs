import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface StatItem {
  label: string;
  value: string;
  accentClass: string;
  valueClass: string;
  helper: string;
  link?: string;
}

@Component({
  selector: 'app-stats-grid',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
      @for (stat of getStats(); track stat.label) {
        <div
          class="dash-card relative"
          [ngClass]="stat.accentClass"
        >
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">{{ stat.label }}</p>
          <h3 class="mt-1 font-mono text-xl font-bold" [ngClass]="stat.valueClass">
            {{ stat.value }}
          </h3>
          <p class="mt-1 text-[10px] font-bold text-slate-500">{{ stat.helper }}</p>

          @if (stat.link) {
            <a [routerLink]="stat.link" class="absolute inset-0 z-10"></a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dash-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-left-width: 4px;
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      transition: background-color .18s ease, border-color .18s ease;
    }
    .dash-card:hover {
      background: #f8fafc;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsGridComponent {
  isAdmin = input<boolean>(false);
  clientCount = input<number>(0);
  documentCount = input<number>(0);
  totalSize = input<number>(0);
  totalLogs = input<number>(0);

  getStats(): StatItem[] {
    const stats: StatItem[] = [];

    if (this.isAdmin()) {
      stats.push({
        label: 'Total Clients',
        value: String(this.clientCount() || 0),
        accentClass: 'border-l-sky-500',
        valueClass: 'text-slate-900',
        helper: 'Active workspaces',
        link: '/clients',
      });
    }

    stats.push(
      {
        label: 'Documents',
        value: String(this.documentCount() || 0),
        accentClass: 'border-l-emerald-500',
        valueClass: 'text-slate-900',
        helper: 'Stored files',
        link: '/documents',
      },
      {
        label: 'Storage Used',
        value: this.formatSize(this.totalSize() || 0),
        accentClass: 'border-l-amber-500',
        valueClass: 'text-amber-700',
        helper: 'Vault usage',
      },
      {
        label: 'Activity Logs',
        value: String(this.totalLogs() || 0),
        accentClass: 'border-l-indigo-500',
        valueClass: 'text-indigo-700',
        helper: 'Last 30 days',
        link: '/logs',
      }
    );

    return stats;
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

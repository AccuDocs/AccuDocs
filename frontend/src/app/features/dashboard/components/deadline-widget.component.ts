import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCalendarDaysSolid, heroArrowRightSolid } from '@ng-icons/heroicons/solid';
import { ComplianceService, ClientDeadlineAssignment, ComplianceStats } from '@core/services/compliance.service';

@Component({
  selector: 'app-deadline-widget',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent],
  providers: [provideIcons({ heroCalendarDaysSolid, heroArrowRightSolid })],
  template: `
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
      <header class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#0074c9] dark:bg-blue-950/40 dark:text-blue-300">
            <ng-icon name="heroCalendarDaysSolid" size="17"></ng-icon>
          </div>
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Compliance</p>
            <h3 class="text-sm font-black text-slate-950 dark:text-white">Deadlines This Week</h3>
          </div>
        </div>
        <a
          routerLink="/compliance"
          class="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-[#0074c9] transition-colors hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
        >
          View All
          <ng-icon name="heroArrowRightSolid" size="12"></ng-icon>
        </a>
      </header>

      <div class="grid grid-cols-3 border-b border-slate-100 dark:border-slate-800">
        <div class="border-r border-slate-100 px-4 py-3 text-center dark:border-slate-800">
          <p class="text-lg font-black text-amber-500">{{ stats()?.upcoming || 0 }}</p>
          <p class="text-[10px] font-bold text-slate-500">Upcoming</p>
        </div>
        <div class="border-r border-slate-100 px-4 py-3 text-center dark:border-slate-800">
          <p class="text-lg font-black text-red-500">{{ stats()?.overdue || 0 }}</p>
          <p class="text-[10px] font-bold text-slate-500">Overdue</p>
        </div>
        <div class="px-4 py-3 text-center">
          <p class="text-lg font-black text-emerald-500">{{ stats()?.filed || 0 }}</p>
          <p class="text-[10px] font-bold text-slate-500">Filed</p>
        </div>
      </div>

      <div class="space-y-2 p-4">
        @for (cd of upcomingDeadlines(); track cd.id; let i = $index) {
          @if (i < 5) {
            <article class="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 transition-colors hover:bg-blue-50/60 dark:bg-slate-800/70 dark:hover:bg-slate-800">
              <div class="flex min-w-0 items-center gap-3">
                <span class="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                  {{ getTypeLabel(cd.deadline?.type) }}
                </span>
                <div class="min-w-0">
                  <p class="truncate text-xs font-black text-slate-900 dark:text-white">
                    {{ cd.deadline?.title || 'Deadline' }}
                  </p>
                  <p class="text-[11px] font-semibold text-slate-500">
                    {{ cd.client?.user?.name || 'Client' }}
                  </p>
                </div>
              </div>
              <span
                class="shrink-0 rounded-lg px-2 py-1 text-[10px] font-black"
                [style.background]="getCountdownBg(cd.deadline?.dueDate)"
                [style.color]="getCountdownColor(cd.deadline?.dueDate)"
              >
                {{ getCountdownText(cd.deadline?.dueDate) }}
              </span>
            </article>
          }
        } @empty {
          <div class="py-7 text-center">
            <div class="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
              <ng-icon name="heroCalendarDaysSolid" size="18"></ng-icon>
            </div>
            <p class="text-xs font-bold text-slate-500">No upcoming deadlines this week.</p>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`:host { display: block; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeadlineWidgetComponent implements OnInit {
  private complianceService = inject(ComplianceService);

  upcomingDeadlines = signal<ClientDeadlineAssignment[]>([]);
  stats = signal<ComplianceStats | null>(null);

  ngOnInit() {
    this.complianceService.getUpcomingThisWeek().subscribe({
      next: (res) => this.upcomingDeadlines.set(res.data),
    });
    this.complianceService.getStats().subscribe({
      next: (res) => this.stats.set(res.data),
    });
  }

  getTypeLabel(type?: string): string {
    if (!type) return 'GEN';
    const labels: Record<string, string> = { GST: 'GST', ITR: 'ITR', TDS: 'TDS', ROC: 'ROC', ADVANCE_TAX: 'TAX', OTHER: 'GEN' };
    return labels[type] || type.slice(0, 3).toUpperCase();
  }

  getCountdownText(dateStr?: string): string {
    if (!dateStr) return '';
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const due = new Date(dateStr); due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff}d left`;
  }

  getCountdownColor(dateStr?: string): string {
    if (!dateStr) return '#64748b';
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const due = new Date(dateStr); due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return '#ef4444';
    if (diff <= 3) return '#f59e0b';
    return '#22c55e';
  }

  getCountdownBg(dateStr?: string): string {
    return this.getCountdownColor(dateStr) + '12';
  }
}

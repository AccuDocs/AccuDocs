import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowUpRightSolid,
  heroTrashSolid,
  heroPencilSquareSolid,
  heroPlusCircleSolid,
  heroArrowRightOnRectangleSolid,
  heroCheckCircleSolid,
  heroClockSolid
} from '@ng-icons/heroicons/solid';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const DOT_COLORS = ['#0074c9', '#16a34a', '#d97706', '#db2777'];

@Component({
  selector: 'app-recent-activity',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent],
  template: `
    <div class="flex h-full min-h-[360px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
      <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h2 class="text-base font-bold tracking-tight text-slate-950 dark:text-white">Recent Activity</h2>
        <a
          routerLink="/logs"
          class="flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-2 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-100 dark:bg-blue-950/40 dark:text-blue-300"
        >
          View All
          <ng-icon name="heroArrowUpRightSolid" size="14"></ng-icon>
        </a>
      </div>

      <!-- Content -->
      @if (isLoading()) {
        <!-- Skeleton loading -->
        <div class="flex-1 divide-y divide-slate-100 dark:divide-slate-700/30">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="flex items-center gap-4 px-5 py-4">
              <div class="w-2 h-2 rounded-full skeleton shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="skeleton h-4 w-3/4 rounded"></div>
                <div class="skeleton h-3 w-1/2 rounded"></div>
              </div>
              <div class="skeleton h-3 w-16 rounded"></div>
            </div>
          }
        </div>
      } @else if (activities().length) {
        <div class="flex-1 divide-y divide-slate-50 overflow-auto dark:divide-slate-700/30">
          @for (log of activities().slice(0, 6); track log.id; let i = $index) {
            <div
              class="flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <!-- Colored dot -->
              <div
                class="w-2 h-2 rounded-full shrink-0 mt-1.5"
                [style.background]="getDotColor(i)"
              ></div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {{ log.description }}
                </p>
                <p class="text-[13px] font-normal text-slate-500 dark:text-slate-400 mt-1">
                  {{ log.user?.name || 'System' }}
                </p>
              </div>

              <!-- Timestamp -->
              <span
                class="text-xs font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0"
                style="font-family: var(--font-mono);"
              >
                {{ formatDate(log.createdAt) }}
              </span>
            </div>
          }
        </div>
      } @else {
        <!-- Empty state -->
        <div class="flex flex-1 flex-col items-center justify-center px-8 py-12 text-center">
          <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
            <ng-icon name="heroClockSolid" size="30" class="text-slate-300 dark:text-slate-600"></ng-icon>
          </div>
          <h3 class="text-base font-bold text-slate-950 dark:text-white">No recent activity</h3>
          <p class="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
            Activity will appear here as you and your team work.
          </p>
          <div class="mt-5 flex flex-wrap justify-center gap-3">
            <a routerLink="/documents" class="rounded-lg bg-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary-700">
              Upload document
            </a>
            <a routerLink="/logs" class="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:border-primary-200 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              Open audit logs
            </a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`:host { display: block; width: 100%; height: 100%; min-height: 0; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      heroArrowUpRightSolid,
      heroTrashSolid,
      heroPencilSquareSolid,
      heroPlusCircleSolid,
      heroArrowRightOnRectangleSolid,
      heroCheckCircleSolid,
      heroClockSolid
    })
  ]
})
export class RecentActivityComponent {
  activities = input<any[]>([]);
  isLoading = input<boolean>(false);

  formatDate(date: string): string {
    return dayjs(date).fromNow();
  }

  getDotColor(index: number): string {
    return DOT_COLORS[index % DOT_COLORS.length];
  }

  getActionIcon(action: string): string {
    if (action.includes('DELETE')) return 'heroTrashSolid';
    if (action.includes('UPDATE')) return 'heroPencilSquareSolid';
    if (action.includes('CREATE')) return 'heroPlusCircleSolid';
    if (action.includes('LOGIN')) return 'heroArrowRightOnRectangleSolid';
    return 'heroCheckCircleSolid';
  }
}

import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCloudArrowUpSolid, heroDocumentArrowDownSolid } from '@ng-icons/heroicons/solid';

@Component({
  selector: 'app-welcome-header',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIconComponent],
  template: `
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">
          Good {{ getGreeting() }}, <span class="text-primary-600 dark:text-primary-300">{{ userName() || 'Admin' }}</span>
        </h1>
        <p class="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          Here's what's happening across your workspace today.
        </p>
        <div class="mt-2 h-[3px] w-10 rounded-full bg-primary-600 dark:bg-primary-300"></div>
      </div>

      <div class="flex flex-wrap gap-3">
        <a
          class="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          routerLink="/logs"
        >
          <ng-icon name="heroDocumentArrowDownSolid" size="17"></ng-icon>
          Export Report
        </a>
        <a
          class="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
          routerLink="/documents"
          [queryParams]="{action: 'upload'}"
        >
          <ng-icon name="heroCloudArrowUpSolid" size="17"></ng-icon>
          New Document
        </a>
      </div>
    </header>
  `,
  styles: [`:host { display: block; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({ heroCloudArrowUpSolid, heroDocumentArrowDownSolid })
  ]
})
export class WelcomeHeaderComponent {
  userName = input<string | undefined>('');

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TaskService } from '@core/services/task.service';
import { NotificationService } from '@core/services/notification.service';
import { Task, TaskStats } from '@app/models/task.model';

@Component({
  selector: 'app-tasks-widget',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/50 dark:bg-slate-900">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Team execution</p>
          <h2 class="mt-1 text-lg font-black text-slate-950 dark:text-white">Tasks</h2>
        </div>
        <a routerLink="/tasks" class="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300">
          <mat-icon class="text-lg">arrow_forward</mat-icon>
        </a>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-10">
          <mat-spinner diameter="30"></mat-spinner>
        </div>
      } @else if (stats()) {
        <div class="mb-4 space-y-3">
          <div class="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/30 dark:bg-blue-950/30">
            <div class="flex items-center gap-2">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 dark:bg-slate-900 dark:text-blue-400">
                <mat-icon class="text-blue-600 dark:text-blue-400">calendar_today</mat-icon>
              </div>
              <div>
                <p class="text-xs font-bold text-slate-500">Due Today</p>
                <p class="text-xl font-black text-blue-600 dark:text-blue-400">{{ stats()?.dueTodayCount || 0 }}</p>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 p-3 dark:border-red-900/30 dark:bg-red-950/30">
            <div class="flex items-center gap-2">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-red-600 dark:bg-slate-900 dark:text-red-400">
                <mat-icon class="text-red-600 dark:text-red-400">warning</mat-icon>
              </div>
              <div>
                <p class="text-xs font-bold text-slate-500">Overdue</p>
                <p class="text-xl font-black text-red-600 dark:text-red-400">{{ stats()?.overdueCount || 0 }}</p>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
            <div class="flex items-center gap-2">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <mat-icon class="text-slate-600 dark:text-slate-300">check_circle_outline</mat-icon>
              </div>
              <div>
                <p class="text-xs font-bold text-slate-500">Total Tasks</p>
                <p class="text-xl font-black text-slate-950 dark:text-white">{{ stats()?.totalTasks || 0 }}</p>
              </div>
            </div>
          </div>
        </div>

        @if ((stats()?.totalTasks || 0) > 0) {
          <div class="space-y-2">
            <p class="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Status breakdown</p>
            <div class="flex items-center gap-2">
              <div class="flex-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs text-text-secondary">To Do</span>
                  <span class="text-xs font-semibold text-text-primary">{{ getStatusCount('todo') }}</span>
                </div>
                <div class="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    class="h-full bg-slate-400 dark:bg-slate-500"
                    [style.width.%]="getStatusPercentage('todo')"
                  ></div>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <div class="flex-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs text-text-secondary">In Progress</span>
                  <span class="text-xs font-semibold text-text-primary">{{ getStatusCount('in-progress') }}</span>
                </div>
                <div class="w-full h-2 rounded-full bg-blue-200 dark:bg-blue-900/30 overflow-hidden">
                  <div
                    class="h-full bg-blue-500"
                    [style.width.%]="getStatusPercentage('in-progress')"
                  ></div>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <div class="flex-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs text-text-secondary">In Review</span>
                  <span class="text-xs font-semibold text-text-primary">{{ getStatusCount('review') }}</span>
                </div>
                <div class="w-full h-2 rounded-full bg-yellow-200 dark:bg-yellow-900/30 overflow-hidden">
                  <div
                    class="h-full bg-yellow-500"
                    [style.width.%]="getStatusPercentage('review')"
                  ></div>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <div class="flex-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs text-text-secondary">Done</span>
                  <span class="text-xs font-semibold text-text-primary">{{ getStatusCount('done') }}</span>
                </div>
                <div class="w-full h-2 rounded-full bg-green-200 dark:bg-green-900/30 overflow-hidden">
                  <div
                    class="h-full bg-green-500"
                    [style.width.%]="getStatusPercentage('done')"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        } @else {
          <div class="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/60">
            <p class="text-sm font-black text-slate-900 dark:text-white">No active task load</p>
            <p class="mt-1 text-xs font-semibold text-slate-500">Create tasks to start tracking execution.</p>
          </div>
        }

        <!-- View All Button -->
        <button class="mt-5 w-full rounded-lg border border-slate-200 bg-white py-3 text-sm font-black text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <a routerLink="/tasks" class="flex w-full items-center justify-center gap-2">
            View All Tasks
            <mat-icon class="text-sm">arrow_forward</mat-icon>
          </a>
        </button>
      }
    </div>
  `,
})
export class TasksWidgetComponent implements OnInit {
  private taskService = inject(TaskService);
  private notificationService = inject(NotificationService);

  isLoading = signal(false);
  stats = signal<TaskStats | null>(null);

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.isLoading.set(true);
    this.taskService.getTaskStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load task stats', error);
        this.isLoading.set(false);
      },
    });
  }

  getStatusPercentage(status: string): number {
    const stat = this.stats();
    if (!stat || !stat.byStatus || stat.totalTasks === 0) return 0;

    const count = stat.byStatus[status as keyof typeof stat.byStatus] || 0;
    return (count / stat.totalTasks) * 100;
  }

  getStatusCount(status: string): number {
    const stat = this.stats();
    if (!stat || !stat.byStatus) return 0;
    return stat.byStatus[status as keyof typeof stat.byStatus] || 0;
  }
}

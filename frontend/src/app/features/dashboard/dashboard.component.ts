import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { ClientService } from '@core/services/client.service';
import { DocumentService } from '@core/services/document.service';
import { LogService } from '@core/services/log.service';
import { of, map } from 'rxjs';

import { WelcomeHeaderComponent } from './components/welcome-header.component';
import { StatsGridComponent } from './components/stats-grid.component';
import { RecentActivityComponent } from './components/recent-activity.component';
import { DeadlineWidgetComponent } from './components/deadline-widget.component';
import { TasksWidgetComponent } from './widgets/tasks-widget.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    WelcomeHeaderComponent,
    StatsGridComponent,
    RecentActivityComponent,
    DeadlineWidgetComponent,
    TasksWidgetComponent
  ],
  template: `
    <div class="dashboard-page flex h-full min-h-0 w-full max-w-none flex-col gap-6 p-6 animate-in fade-in duration-500">

      <app-welcome-header class="block" [userName]="authService.currentUser()?.name"></app-welcome-header>

      <app-stats-grid
        class="block"
        [isAdmin]="authService.isAdmin()"
        [clientCount]="clientCountResource.value() || 0"
        [documentCount]="storageStatsResource.value()?.documentCount || 0"
        [totalSize]="storageStatsResource.value()?.totalSize || 0"
        [totalLogs]="logStatsResource.value()?.totalLogs || 0"
      ></app-stats-grid>

      <div class="grid min-h-0 w-full flex-1 grid-cols-1 items-stretch gap-6 xl:grid-cols-12">
         <main class="flex min-h-0 min-w-0 flex-col xl:col-span-8">
            <app-recent-activity
              class="block min-h-0 flex-1"
              [activities]="logStatsResource.value()?.recentActivity || []"
              [isLoading]="logStatsResource.isLoading()"
            ></app-recent-activity>
         </main>

         <aside class="flex min-h-0 min-w-0 flex-col gap-6 xl:col-span-4">
            @if (authService.isAdmin()) {
              <app-deadline-widget class="block"></app-deadline-widget>
            }
            <app-tasks-widget class="block"></app-tasks-widget>
         </aside>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  authService = inject(AuthService);
  private clientService = inject(ClientService);
  private documentService = inject(DocumentService);
  private logService = inject(LogService);

  storageStatsResource = rxResource({
    loader: () => this.documentService.getStorageStats().pipe(map((res) => res.data)),
  });

  clientCountResource = rxResource({
    request: () => this.authService.isAdmin(),
    loader: ({ request: isAdmin }: { request: boolean }) =>
      isAdmin
        ? this.clientService.getClients(1, 1).pipe(map((res) => res.meta.total))
        : of(0),
  });

  logStatsResource = rxResource({
    request: () => this.authService.isAdmin(),
    loader: ({ request: isAdmin }: { request: boolean }) =>
      isAdmin
        ? this.logService.getStats(30).pipe(map((res) => res.data))
        : of(null),
  });
}

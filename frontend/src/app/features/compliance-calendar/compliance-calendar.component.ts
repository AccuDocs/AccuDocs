import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroArrowPathSolid,
  heroCalendarDaysSolid,
  heroCheckCircleSolid,
  heroChevronLeftSolid,
  heroChevronRightSolid,
  heroClockSolid,
  heroExclamationTriangleSolid,
  heroFunnelSolid,
  heroListBulletSolid,
  heroPlusSolid,
  heroQueueListSolid,
} from '@ng-icons/heroicons/solid';

import {
  ClientDeadlineAssignment,
  ComplianceDeadline,
  ComplianceService,
  ComplianceStats,
} from '@core/services/compliance.service';
import { ToastService } from '@core/services/toast.service';
import { AddDeadlineModalComponent } from './components/add-deadline-modal.component';
import { AssignClientModalComponent } from './components/assign-client-modal.component';
import { CalendarViewComponent } from './components/calendar-view.component';
import { DeadlineDetailModalComponent } from './components/deadline-detail-modal.component';
import { DeadlineListComponent } from './components/deadline-list.component';

interface ComplianceStatCard {
  label: string;
  value: number;
  helper: string;
  icon: string;
  cardClass: string;
  labelClass: string;
  valueClass: string;
  iconClass: string;
  helperClass: string;
}

@Component({
  selector: 'app-compliance-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIconComponent,
    CalendarViewComponent,
    DeadlineListComponent,
    AddDeadlineModalComponent,
    AssignClientModalComponent,
    DeadlineDetailModalComponent,
  ],
  providers: [
    provideIcons({
      heroArrowPathSolid,
      heroCalendarDaysSolid,
      heroCheckCircleSolid,
      heroChevronLeftSolid,
      heroChevronRightSolid,
      heroClockSolid,
      heroExclamationTriangleSolid,
      heroFunnelSolid,
      heroListBulletSolid,
      heroPlusSolid,
      heroQueueListSolid,
    }),
  ],
  template: `
    <div class="compliance-shell p-6">
      <section class="command-toolbar">
        <div class="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div class="min-w-0">
            <div class="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
              <span class="grid h-7 w-7 place-items-center rounded-lg bg-sky-100 text-sky-700">
                <ng-icon name="heroCalendarDaysSolid" size="15"></ng-icon>
              </span>
              Compliance Control Center
            </div>
            <h1 class="mt-3 text-[32px] font-black leading-tight tracking-normal text-slate-950">Compliance Calendar</h1>
            <p class="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">
              Track every statutory due date for ITR, GST, TDS, ROC, and advance tax from one calendar.
            </p>
            <p class="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              {{ filteredDeadlines().length }} deadline template(s) loaded - {{ stats().pending }} pending assignment(s)
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="toolbar-button" (click)="refreshData()">
              <ng-icon name="heroArrowPathSolid" size="16"></ng-icon>
              Refresh Data
            </button>
            <button type="button" class="toolbar-button toolbar-button--primary" (click)="showAddDeadlineModal.set(true)">
              <ng-icon name="heroPlusSolid" size="16"></ng-icon>
              Add Deadline
            </button>
          </div>
        </div>
      </section>

      <section class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (stat of statsCards(); track stat.label) {
          <article class="metric-card" [ngClass]="stat.cardClass">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-[11px] font-black uppercase tracking-[0.2em]" [ngClass]="stat.labelClass">{{ stat.label }}</p>
                <p class="mt-5 text-[30px] font-black leading-none tracking-normal" [ngClass]="stat.valueClass">{{ stat.value }}</p>
                <p class="mt-3 text-xs font-bold" [ngClass]="stat.helperClass">{{ stat.helper }}</p>
              </div>
              <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white shadow-sm ring-1 ring-slate-100" [ngClass]="stat.iconClass">
                <ng-icon [name]="stat.icon" size="18"></ng-icon>
              </div>
            </div>
          </article>
        }
      </section>

      <section class="dashboard-panel mt-5">
        <div class="controls-bar">
          <div class="view-toggle">
            <button
              type="button"
              (click)="activeView.set('calendar')"
              [class.is-active]="activeView() === 'calendar'"
            >
              <ng-icon name="heroCalendarDaysSolid" size="16"></ng-icon>
              Calendar
            </button>
            <button
              type="button"
              (click)="activeView.set('cards')"
              [class.is-active]="activeView() === 'cards'"
            >
              <ng-icon name="heroQueueListSolid" size="16"></ng-icon>
              Cards
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <label class="filter-field">
              <ng-icon name="heroFunnelSolid" size="15"></ng-icon>
              <select [ngModel]="selectedType()" (ngModelChange)="onTypeChange($event)">
                <option value="">All Types</option>
                <option value="ITR">ITR</option>
                <option value="GST">GST</option>
                <option value="TDS">TDS</option>
                <option value="ROC">ROC</option>
                <option value="ADVANCE_TAX">Advance Tax</option>
                <option value="OTHER">Other</option>
              </select>
            </label>

            @if (activeView() === 'calendar') {
              <div class="month-nav">
                <button type="button" (click)="prevMonth()">
                  <ng-icon name="heroChevronLeftSolid" size="16"></ng-icon>
                </button>
                <span>{{ monthNames[currentMonth()] }} {{ currentYear() }}</span>
                <button type="button" (click)="nextMonth()">
                  <ng-icon name="heroChevronRightSolid" size="16"></ng-icon>
                </button>
              </div>
            }
          </div>
        </div>
      </section>

      <section class="mt-5">
        @if (activeView() === 'calendar') {
          <app-calendar-view
            [deadlines]="filteredDeadlines()"
            [month]="currentMonth()"
            [year]="currentYear()"
            [clientDeadlines]="clientDeadlines()"
            (deadlineClick)="onDeadlineClick($event)"
          ></app-calendar-view>
        }

        @if (activeView() === 'cards') {
          <app-deadline-list
            [deadlines]="filteredDeadlines()"
            [clientDeadlines]="clientDeadlines()"
            (deadlineClick)="onDeadlineClick($event)"
            (assignClick)="onAssignClick($event)"
            (statusChange)="onStatusChange($event)"
          ></app-deadline-list>
        }
      </section>
    </div>

    @if (showAddDeadlineModal()) {
      <app-add-deadline-modal
        (close)="showAddDeadlineModal.set(false)"
        (saved)="onDeadlineCreated()"
      ></app-add-deadline-modal>
    }

    @if (showAssignModal()) {
      <app-assign-client-modal
        [deadlineId]="selectedDeadlineId()!"
        [deadlineTitle]="selectedDeadlineTitle()"
        (close)="showAssignModal.set(false)"
        (assigned)="onClientAssigned()"
      ></app-assign-client-modal>
    }

    @if (showDetailModal()) {
      <app-deadline-detail-modal
        [deadline]="selectedDeadline()!"
        [clientDeadlines]="selectedDeadlineClientDeadlines()"
        (close)="showDetailModal.set(false)"
        (assign)="onAssignFromDetail($event)"
        (statusChange)="onStatusChange($event)"
      ></app-deadline-detail-modal>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
    .compliance-shell {
      min-height: 100%;
      background:
        radial-gradient(circle at top left, rgba(14, 165, 233, 0.10), transparent 26%),
        radial-gradient(circle at top right, rgba(16, 185, 129, 0.08), transparent 24%),
        linear-gradient(180deg, #f8fafc 0%, #eef4f8 100%);
    }
    .command-toolbar {
      border-radius: 24px;
      border: 1px solid rgba(219, 231, 240, 0.95);
      background: rgba(255, 255, 255, 0.82);
      padding: 20px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
      backdrop-filter: blur(14px);
    }
    .toolbar-button {
      display: inline-flex;
      height: 40px;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: white;
      padding: 0 16px;
      font-size: 14px;
      font-weight: 700;
      color: #334155;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
      transition: background-color .16s ease;
    }
    .toolbar-button:hover {
      background: #f8fafc;
    }
    .toolbar-button--primary {
      border-color: #0369a1;
      background: #0369a1;
      color: white;
    }
    .toolbar-button--primary:hover {
      background: #075985;
    }
    .metric-card {
      min-width: 0;
      min-height: 132px;
      border-radius: 20px;
      border: 1px solid #dbe7f0;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }
    .dashboard-panel {
      min-width: 0;
      overflow: hidden;
      border-radius: 20px;
      border: 1px solid #dbe3ef;
      background: white;
      box-shadow: 0 1px 3px rgba(15, 23, 42, .06);
    }
    .controls-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 18px;
    }
    .view-toggle {
      display: inline-flex;
      gap: 4px;
      border-radius: 14px;
      border: 1px solid #dbe3ef;
      background: #f8fafc;
      padding: 4px;
    }
    .view-toggle button {
      display: inline-flex;
      min-width: 112px;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 800;
      color: #64748b;
      transition: all .16s ease;
    }
    .view-toggle button.is-active {
      background: #0369a1;
      color: white;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.10);
    }
    .filter-field {
      display: inline-flex;
      height: 42px;
      align-items: center;
      gap: 10px;
      border-radius: 12px;
      border: 1px solid #dbe3ef;
      background: white;
      padding: 0 12px;
      color: #64748b;
    }
    .filter-field select {
      min-width: 140px;
      background: transparent;
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      outline: none;
    }
    .month-nav {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .month-nav button {
      display: grid;
      height: 40px;
      width: 40px;
      place-items: center;
      border-radius: 10px;
      border: 1px solid #dbe3ef;
      background: white;
      color: #64748b;
      transition: background-color .16s ease;
    }
    .month-nav button:hover {
      background: #f8fafc;
    }
    .month-nav span {
      min-width: 160px;
      text-align: center;
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
    }
    @media (max-width: 640px) {
      .toolbar-button {
        flex: 1 1 160px;
      }
      .view-toggle {
        width: 100%;
      }
      .view-toggle button {
        flex: 1 1 0;
        min-width: 0;
      }
      .month-nav {
        width: 100%;
        justify-content: space-between;
      }
      .month-nav span {
        min-width: 0;
        flex: 1 1 auto;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplianceCalendarComponent implements OnInit {
  private complianceService = inject(ComplianceService);
  private toastService = inject(ToastService);

  activeView = signal<'calendar' | 'cards'>('calendar');
  currentMonth = signal(new Date().getMonth());
  currentYear = signal(new Date().getFullYear());
  selectedType = signal<string>('');
  deadlines = signal<ComplianceDeadline[]>([]);
  clientDeadlines = signal<ClientDeadlineAssignment[]>([]);
  stats = signal<ComplianceStats>({ totalDeadlines: 0, upcoming: 0, overdue: 0, filed: 0, pending: 0 });
  loading = signal(false);

  showAddDeadlineModal = signal(false);
  showAssignModal = signal(false);
  showDetailModal = signal(false);
  selectedDeadlineId = signal<string | null>(null);
  selectedDeadlineTitle = signal('');
  selectedDeadline = signal<ComplianceDeadline | null>(null);
  selectedDeadlineClientDeadlines = signal<ClientDeadlineAssignment[]>([]);

  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  filteredDeadlines = computed(() => {
    let items = this.deadlines();
    const type = this.selectedType();
    if (type) {
      items = items.filter((deadline) => deadline.type === type);
    }
    return items;
  });

  statsCards = computed<ComplianceStatCard[]>(() => {
    const stats = this.stats();
    return [
      {
        label: 'Total Deadlines',
        value: stats.totalDeadlines,
        helper: 'Deadline templates loaded',
        icon: 'heroCalendarDaysSolid',
        cardClass: 'bg-sky-50/45',
        labelClass: 'text-sky-700',
        valueClass: 'text-slate-950',
        iconClass: 'text-sky-700',
        helperClass: 'text-slate-500',
      },
      {
        label: 'Upcoming',
        value: stats.upcoming,
        helper: 'Next 7 days',
        icon: 'heroClockSolid',
        cardClass: 'bg-amber-50/65',
        labelClass: 'text-amber-700',
        valueClass: 'text-amber-800',
        iconClass: 'text-amber-700',
        helperClass: 'text-amber-700',
      },
      {
        label: 'Overdue',
        value: stats.overdue,
        helper: 'Needs immediate follow-up',
        icon: 'heroExclamationTriangleSolid',
        cardClass: 'bg-rose-50/65',
        labelClass: 'text-rose-700',
        valueClass: 'text-rose-800',
        iconClass: 'text-rose-700',
        helperClass: 'text-rose-700',
      },
      {
        label: 'Filed',
        value: stats.filed,
        helper: 'Completed and marked filed',
        icon: 'heroCheckCircleSolid',
        cardClass: 'bg-emerald-50/65',
        labelClass: 'text-emerald-700',
        valueClass: 'text-emerald-800',
        iconClass: 'text-emerald-700',
        helperClass: 'text-emerald-700',
      },
    ];
  });

  ngOnInit(): void {
    this.loadData();
  }

  refreshData(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.complianceService.getDeadlines({ year: this.currentYear() }).subscribe({
      next: (response) => {
        this.deadlines.set(response.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.complianceService.getClientDeadlines().subscribe({
      next: (response) => this.clientDeadlines.set(response.data),
    });

    this.complianceService.getStats(this.currentYear()).subscribe({
      next: (response) => this.stats.set(response.data),
    });
  }

  prevMonth(): void {
    const month = this.currentMonth();
    const year = this.currentYear();

    if (month === 0) {
      this.currentMonth.set(11);
      this.currentYear.set(year - 1);
    } else {
      this.currentMonth.set(month - 1);
    }

    this.loadData();
  }

  nextMonth(): void {
    const month = this.currentMonth();
    const year = this.currentYear();

    if (month === 11) {
      this.currentMonth.set(0);
      this.currentYear.set(year + 1);
    } else {
      this.currentMonth.set(month + 1);
    }

    this.loadData();
  }

  onTypeChange(type: string): void {
    this.selectedType.set(type);
  }

  onDeadlineClick(deadline: ComplianceDeadline): void {
    this.selectedDeadline.set(deadline);
    this.complianceService.getClientDeadlines({ deadlineId: deadline.id }).subscribe({
      next: (response) => {
        this.selectedDeadlineClientDeadlines.set(response.data);
        this.showDetailModal.set(true);
      },
    });
  }

  onAssignClick(deadline: ComplianceDeadline): void {
    this.selectedDeadlineId.set(deadline.id);
    this.selectedDeadlineTitle.set(deadline.title);
    this.showAssignModal.set(true);
  }

  onAssignFromDetail(deadlineId: string): void {
    this.showDetailModal.set(false);
    const deadline = this.deadlines().find((item) => item.id === deadlineId);
    if (!deadline) return;

    this.selectedDeadlineId.set(deadline.id);
    this.selectedDeadlineTitle.set(deadline.title);
    this.showAssignModal.set(true);
  }

  onStatusChange(event: { clientDeadlineId: string; status: string }): void {
    this.complianceService.updateClientDeadline(event.clientDeadlineId, { status: event.status as any }).subscribe({
      next: () => {
        this.toastService.success('Status updated successfully');
        this.loadData();
      },
      error: () => this.toastService.error('Failed to update status'),
    });
  }

  onDeadlineCreated(): void {
    this.showAddDeadlineModal.set(false);
    this.toastService.success('Deadline created successfully');
    this.loadData();
  }

  onClientAssigned(): void {
    this.showAssignModal.set(false);
    this.toastService.success('Client assigned successfully');
    this.loadData();
  }
}
